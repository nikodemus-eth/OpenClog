#!/bin/zsh
set -euo pipefail

cd /Users/m4/OpenClog

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
export PORT="${OPENCLOG_API_PORT:-8787}"
export OPENCLOG_DB_PATH="${OPENCLOG_DB_PATH:-/Users/m4/OpenClog/openclog.db}"

exec /usr/bin/env node /Users/m4/OpenClog/apps/api/dist/server.js
