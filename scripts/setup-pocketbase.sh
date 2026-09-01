#!/usr/bin/env bash
set -Eeuo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
pb_dir="$repo_root/pocketbase"
version="$(tr -d '[:space:]' < "$pb_dir/VERSION")"

case "$(uname -s)" in
  Linux) os="linux" ;;
  Darwin) os="darwin" ;;
  *) printf 'Unsupported operating system: %s\n' "$(uname -s)" >&2; exit 1 ;;
esac
case "$(uname -m)" in
  x86_64|amd64) arch="amd64" ;;
  arm64|aarch64) arch="arm64" ;;
  *) printf 'Unsupported architecture: %s\n' "$(uname -m)" >&2; exit 1 ;;
esac

for command_name in curl unzip install awk; do
  command -v "$command_name" >/dev/null || { printf 'Missing required command: %s\n' "$command_name" >&2; exit 1; }
done

tmp_dir="$(mktemp -d "${TMPDIR:-/tmp}/bvhub-pocketbase.XXXXXX")"
trap 'rm -rf "$tmp_dir"' EXIT

archive="$tmp_dir/pocketbase.zip"
checksums="$tmp_dir/checksums.txt"
extract_dir="$tmp_dir/extracted"
url="https://github.com/pocketbase/pocketbase/releases/download/v${version}/pocketbase_${version}_${os}_${arch}.zip"
checksums_url="https://github.com/pocketbase/pocketbase/releases/download/v${version}/checksums.txt"
mkdir -p "$extract_dir"
printf 'Downloading PocketBase v%s (%s/%s)\n' "$version" "$os" "$arch"
curl --fail --silent --show-error --location "$url" --output "$archive"
curl --fail --silent --show-error --location "$checksums_url" --output "$checksums"
archive_name="pocketbase_${version}_${os}_${arch}.zip"
expected_sha256="$(awk -v name="$archive_name" '{ candidate=$2; gsub(/^\*/, "", candidate); if (candidate == name) { print $1; exit } }' "$checksums")"
if [[ ! "$expected_sha256" =~ ^[[:xdigit:]]{64}$ ]]; then
  printf 'Checksum entry missing for %s\n' "$archive_name" >&2
  exit 1
fi
if command -v sha256sum >/dev/null; then
  actual_sha256="$(sha256sum "$archive" | awk '{print $1}')"
elif command -v shasum >/dev/null; then
  actual_sha256="$(shasum -a 256 "$archive" | awk '{print $1}')"
else
  printf 'Missing SHA-256 utility (sha256sum or shasum)\n' >&2
  exit 1
fi
if [[ "$actual_sha256" != "$expected_sha256" ]]; then
  printf 'Checksum mismatch for %s\n' "$archive_name" >&2
  exit 1
fi
unzip -q "$archive" -d "$extract_dir"
install -m 0755 "$extract_dir/pocketbase" "$pb_dir/pocketbase"
printf 'Installed %s\n' "$pb_dir/pocketbase"
