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

for command_name in curl unzip install; do
  command -v "$command_name" >/dev/null || { printf 'Missing required command: %s\n' "$command_name" >&2; exit 1; }
done

tmp_dir="$(mktemp -d "${TMPDIR:-/tmp}/bvhub-pocketbase.XXXXXX")"
trap 'rm -rf "$tmp_dir"' EXIT

archive="$tmp_dir/pocketbase.zip"
extract_dir="$tmp_dir/extracted"
url="https://github.com/pocketbase/pocketbase/releases/download/v${version}/pocketbase_${version}_${os}_${arch}.zip"
mkdir -p "$extract_dir"
printf 'Downloading PocketBase v%s (%s/%s)\n' "$version" "$os" "$arch"
curl --fail --silent --show-error --location "$url" --output "$archive"
unzip -q "$archive" -d "$extract_dir"
install -m 0755 "$extract_dir/pocketbase" "$pb_dir/pocketbase"
printf 'Installed %s\n' "$pb_dir/pocketbase"
