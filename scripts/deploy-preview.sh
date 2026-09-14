#!/usr/bin/env bash
set -Eeuo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
frontend_dir="$repo_root/frontend"

cd "$frontend_dir"
pnpm install --frozen-lockfile
pnpm typecheck
pnpm build

deploy_host="${BVHUB_DEPLOY_HOST:-}"
if [[ -z "$deploy_host" ]]; then
  printf 'BVHUB_DEPLOY_HOST is not set; local build completed, deployment skipped.\n'
  exit 0
fi

tmp_dir="$(mktemp -d "${TMPDIR:-/tmp}/bvhub-deploy.XXXXXX")"
trap 'rm -rf "$tmp_dir"' EXIT

archive="$tmp_dir/frontend-dist.tar.gz"
tar -C "$frontend_dir/dist" -czf "$archive" .

deploy_pocketbase="${BVHUB_DEPLOY_POCKETBASE:-0}"
if [[ "$deploy_pocketbase" != "0" && "$deploy_pocketbase" != "1" ]]; then
  printf 'BVHUB_DEPLOY_POCKETBASE must be 0 or 1\n' >&2
  exit 1
fi
if [[ "$deploy_pocketbase" == "1" ]]; then
  [[ -n "${BVHUB_POCKETBASE_RESTART_COMMAND:-}" ]] || {
    printf 'BVHUB_POCKETBASE_RESTART_COMMAND is required when BVHUB_DEPLOY_POCKETBASE=1\n' >&2
    exit 1
  }
  pocketbase_root="${BVHUB_POCKETBASE_ROOT:-/opt/bvhub-v3/app/pocketbase}"
  backend_archive="$tmp_dir/pocketbase-backend.tar.gz"
  tar -C "$repo_root/pocketbase" -czf "$backend_archive" pb_hooks pb_migrations
fi

timestamp="$(date -u +%Y%m%d%H%M%S)"
commit="$(git -C "$repo_root" rev-parse --short HEAD)"
release_name="${timestamp}-${commit}"
remote_root="${BVHUB_REMOTE_ROOT:-/var/www/bvhub-v3}"
remote_root="${remote_root%/}"
release_dir="$remote_root/releases/$release_name"
remote_archive="$remote_root/.bvhub-$release_name.tar.gz"
current_link="$remote_root/current"
staging_link="$remote_root/.current-$release_name"

printf 'Preparing remote release %s on %s\n' "$release_name" "$deploy_host"
remote_root_q="$(printf '%q' "$remote_root")"
ssh "$deploy_host" "mkdir -p -- $remote_root_q/releases"

printf 'Uploading frontend/dist archive\n'
scp "$archive" "$deploy_host:$remote_archive"

if [[ "$deploy_pocketbase" == "1" ]]; then
  remote_backend_archive="$pocketbase_root/.bvhub-backend-$release_name.tar.gz"
  printf 'Uploading PocketBase hooks and migrations\n'
  scp "$backend_archive" "$deploy_host:$remote_backend_archive"
fi

release_dir_q="$(printf '%q' "$release_dir")"
remote_archive_q="$(printf '%q' "$remote_archive")"
current_link_q="$(printf '%q' "$current_link")"
staging_link_q="$(printf '%q' "$staging_link")"
ssh "$deploy_host" "set -eu; mkdir -p -- $release_dir_q; tar -xzf $remote_archive_q -C $release_dir_q; ln -s -- $release_dir_q $staging_link_q; mv -Tf -- $staging_link_q $current_link_q; rm -f -- $remote_archive_q"

if [[ "$deploy_pocketbase" == "1" ]]; then
  pocketbase_root_q="$(printf '%q' "$pocketbase_root")"
  remote_backend_archive_q="$(printf '%q' "$remote_backend_archive")"
  restart_command_q="$(printf '%q' "$BVHUB_POCKETBASE_RESTART_COMMAND")"
  ssh "$deploy_host" "set -eu; mkdir -p -- $pocketbase_root_q; tar -xzf $remote_backend_archive_q -C $pocketbase_root_q; sh -c $restart_command_q; rm -f -- $remote_backend_archive_q"
fi

curl_args=(--fail --silent --show-error --location --max-time "${BVHUB_CURL_TIMEOUT:-15}")
for url in "http://127.0.0.1:23010" "https://v2.bv-erlangen2025.de"; do
  printf 'Checking %s\n' "$url"
  curl "${curl_args[@]}" "$url" >/dev/null
done

printf 'Deployment complete: %s\n' "$release_name"
