#!/usr/bin/env bash
set -Eeuo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
pb_dir="$repo_root/pocketbase"
binary="$pb_dir/pocketbase"
port="${PB_TEST_PORT:-18101}"
[[ "$port" =~ ^[0-9]+$ ]] || { printf 'PB_TEST_PORT must be numeric\n' >&2; exit 1; }
[[ "$port" != "8090" ]] || { printf 'The legacy PocketBase port is not valid for integration tests\n' >&2; exit 1; }
command -v curl >/dev/null || { printf 'Missing required command: curl\n' >&2; exit 1; }
[[ -x "$binary" ]] || "$repo_root/scripts/setup-pocketbase.sh"

data_dir="$(mktemp -d "${TMPDIR:-/tmp}/bvhub-pocketbase-test.XXXXXX")"
server_pid=""
cleanup() {
  if [[ -n "$server_pid" ]] && kill -0 "$server_pid" 2>/dev/null; then kill "$server_pid" 2>/dev/null || true; wait "$server_pid" 2>/dev/null || true; fi
  rm -rf "$data_dir"
}
trap cleanup EXIT INT TERM

test_email="integration-superuser-$(date +%s)@example.test"
test_password='Integration-Test-Password-12!'
(cd "$pb_dir" && "$binary" migrate up --dir="$data_dir" --migrationsDir="$pb_dir/pb_migrations" --hooksDir="$pb_dir/pb_hooks") >/dev/null
(cd "$pb_dir" && "$binary" superuser create "$test_email" "$test_password" --dir="$data_dir") >/dev/null
(cd "$pb_dir" && "$binary" serve --http="127.0.0.1:$port" --dir="$data_dir" --migrationsDir="$pb_dir/pb_migrations" --hooksDir="$pb_dir/pb_hooks") >"$data_dir/server.log" 2>&1 &
server_pid=$!
health_url="http://127.0.0.1:$port/api/health"
for _ in $(seq 1 60); do curl --fail --silent "$health_url" >/dev/null 2>&1 && break; sleep 0.25; done
curl --fail --silent "$health_url" >/dev/null

response="$data_dir/response.json"
status="$(curl --silent --request POST --header 'Content-Type: application/json' --data "{\"identity\":\"$test_email\",\"password\":\"$test_password\"}" --output "$response" --write-out '%{http_code}' "http://127.0.0.1:$port/api/collections/_superusers/auth-with-password")"
[[ "$status" == "200" ]] || { cat "$response" >&2; exit 1; }
token="$(node -e 'const fs=require("fs"); process.stdout.write(JSON.parse(fs.readFileSync(process.argv[1])).token)' "$response")"
auth_header="Authorization: $token"

for length in 8 11; do
  password="$(printf 'x%.0s' $(seq 1 "$length"))"
  status="$(curl --silent --request POST --header "$auth_header" --header 'Content-Type: application/json' --data "{\"email\":\"short-$length@example.test\",\"password\":\"$password\",\"passwordConfirm\":\"$password\",\"displayName\":\"Short\",\"firstName\":\"Short\",\"lastName\":\"Password\",\"role\":\"MEMBER\",\"active\":true,\"verified\":true}" --output "$response" --write-out '%{http_code}' "http://127.0.0.1:$port/api/collections/users/records")"
  [[ "$status" == "400" ]] || { printf 'Password length %s was unexpectedly accepted\n' "$length" >&2; exit 1; }
done

status="$(curl --silent --request POST --header "$auth_header" --header 'Content-Type: application/json' --data '{"email":"member@example.test","password":"Member-password-12!","passwordConfirm":"Member-password-12!","displayName":"Member","firstName":"Test","lastName":"Member","role":"MEMBER","active":true,"verified":true}' --output "$response" --write-out '%{http_code}' "http://127.0.0.1:$port/api/collections/users/records")"
[[ "$status" == "200" ]] || { cat "$response" >&2; exit 1; }
member_id="$(node -e 'const fs=require("fs"); process.stdout.write(JSON.parse(fs.readFileSync(process.argv[1])).id)' "$response")"
status="$(curl --silent --request PATCH --header "$auth_header" --header 'Content-Type: application/json' --data '{"active":false}' --output "$response" --write-out '%{http_code}' "http://127.0.0.1:$port/api/collections/users/records/$member_id")"
[[ "$status" == "200" ]] || { cat "$response" >&2; exit 1; }
grep -q '"active":false' "$response"

status="$(curl --silent --request POST --header "$auth_header" --header 'Content-Type: application/json' --data '{"name":"Integration Group","description":"Temporary","active":true}' --output "$response" --write-out '%{http_code}' "http://127.0.0.1:$port/api/collections/groups/records")"
[[ "$status" == "200" ]] || { cat "$response" >&2; exit 1; }
group_id="$(node -e 'const fs=require("fs"); process.stdout.write(JSON.parse(fs.readFileSync(process.argv[1])).id)' "$response")"
status="$(curl --silent --request PATCH --header "$auth_header" --header 'Content-Type: application/json' --data '{"active":false}' --output "$response" --write-out '%{http_code}' "http://127.0.0.1:$port/api/collections/groups/records/$group_id")"
[[ "$status" == "200" ]] || { cat "$response" >&2; exit 1; }
grep -q '"active":false' "$response"

printf 'PocketBase integration tests passed on 127.0.0.1:%s\n' "$port"
