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

stop_port() {
	local port="$1"
	local label="$2"
	local pids

	pids="$("$LSOF_BIN" -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
	if [[ -z "$pids" ]]; then
		echo "$label 는 이미 중지되어 있습니다."
		return 0
	fi

	echo "$label 종료: $pids"
	kill $pids
}

stop_port "$FRONTEND_PORT" "정적 서버"
stop_port "$API_PORT" "API 서버"