#!/bin/zsh
set -euo pipefail

cd /Users/m4/OpenClog

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

host_ip="${OPENCLOG_WEB_HOST:-}"
if [[ -z "${host_ip}" ]]; then
  host_ip="$(ifconfig | awk '/inet 10\./ {print $2; exit}')"
fi

if [[ -z "${host_ip}" ]]; then
  echo "OpenClog web launcher could not find an active 10.* address" >&2
  exit 1
fi

port="${OPENCLOG_WEB_PORT:-4173}"

exec /opt/homebrew/bin/npm run preview -w @openclog/web -- --host "${host_ip}" --port "${port}" --strictPort
