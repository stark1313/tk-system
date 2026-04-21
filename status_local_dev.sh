#!/bin/bash

set -euo pipefail

FRONTEND_PORT="${FRONTEND_PORT:-3000}"
API_PORT="${API_PORT:-5050}"
LSOF_BIN="/usr/sbin/lsof"

if [[ ! -x "$LSOF_BIN" ]]; then
	LSOF_BIN="$(command -v lsof || true)"
fi

if [[ -z "$LSOF_BIN" ]]; then
	echo "lsof 명령을 찾지 못했습니다."
	exit 1
fi

show_status() {
	local port="$1"
	local label="$2"
	local pid

	pid="$("$LSOF_BIN" -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null | head -n 1 || true)"
	if [[ -n "$pid" ]]; then
		echo "$label: 실행 중 (port $port, pid $pid)"
	else
		echo "$label: 실행 안 됨 (port $port)"
	fi
}

show_status "$FRONTEND_PORT" "정적 서버"
show_status "$API_PORT" "API 서버"