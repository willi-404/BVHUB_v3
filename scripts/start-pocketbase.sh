#!/usr/bin/env bash
set -Eeuo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
pb_dir="$repo_root/pocketbase"
binary="$pb_dir/pocketbase"

if [[ ! -x "$binary" ]]; then
  printf 'PocketBase binary missing. Run scripts/setup-pocketbase.sh first.\n' >&2
  exit 1
fi

cd "$pb_dir"
exec "$binary" serve --http="${PB_HTTP:-127.0.0.1:8090}"
