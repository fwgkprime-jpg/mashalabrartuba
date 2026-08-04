#!/usr/bin/env sh
set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$script_dir"

if [ ! -d node_modules ]; then
  echo "Dependencies are missing. Run npm install first." >&2
  exit 1
fi

exec npm run dev -- --host 0.0.0.0
