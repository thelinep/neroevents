#!/usr/bin/env sh
set -eu
url="${1:-http://localhost:3000/ready}"
tries="${TRIES:-30}"
i=1
while [ "$i" -le "$tries" ]; do
  if curl -fsS "$url" >/dev/null 2>&1; then
    echo "ready: $url"
    exit 0
  fi
  i=$((i + 1))
  sleep 2
done
echo "not ready: $url" >&2
exit 1
