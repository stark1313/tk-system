#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
API_PORT="${API_PORT:-5050}"
LOG_DIR="${TK_SYSTEM_LOG_DIR:-/tmp/tk_system}"
FRONTEND_LOG="$LOG_DIR/frontend-${FRONTEND_PORT}.log"
API_LOG="$LOG_DIR/api-${API_PORT}.log"
LSOF_BIN="/usr/sbin/lsof"
CURL_BIN="/usr/bin/curl"

if [[ ! -x "$LSOF_BIN" ]]; then
	LSOF_BIN="$(command -v lsof || true)"
fi

if [[ -z "$LSOF_BIN" ]]; then
	echo "lsof 명령을 찾지 못했습니다."
	exit 1
fi

if [[ ! -x "$CURL_BIN" ]]; then
	CURL_BIN="$(command -v curl || true)"
fi

if [[ -z "$CURL_BIN" ]]; then
	echo "curl 명령을 찾지 못했습니다."
	exit 1
fi

mkdir -p "$LOG_DIR"
cd "$ROOT_DIR"

if [[ -f .env ]]; then
	set -a
	. ./.env
	set +a
fi

find_python() {
	local candidate
	local -a candidates=()

	if [[ -n "${VIRTUAL_ENV:-}" && -x "$VIRTUAL_ENV/bin/python3" ]]; then
		candidates+=("$VIRTUAL_ENV/bin/python3")
	fi

	if [[ -x ".venv/bin/python3" ]]; then
		candidates+=(".venv/bin/python3")
	fi

	for candidate in .venv-*/bin/python3; do
		if [[ -x "$candidate" ]]; then
			candidates+=("$candidate")
		fi
	done

	candidates+=("python3")

	for candidate in "${candidates[@]}"; do
		if "$candidate" -c "import openpyxl" >/dev/null 2>&1; then
			echo "$candidate"
			return 0
		fi
	done

	return 1
}

port_pid() {
	"$LSOF_BIN" -tiTCP:"$1" -sTCP:LISTEN 2>/dev/null | head -n 1
}

wait_for_port() {
	local port="$1"
	local label="$2"
	local timeout_seconds="${3:-10}"
	local elapsed=0

	while [[ "$elapsed" -lt "$timeout_seconds" ]]; do
		if [[ -n "$(port_pid "$port")" ]]; then
			return 0
		fi
		sleep 1
		elapsed=$((elapsed + 1))
	done

	echo "$label 포트($port)가 열리지 않았습니다. 로그를 확인하세요."
	return 1
}

print_running() {
	local name="$1"
	local port="$2"
	local pid
	pid="$(port_pid "$port")"
	if [[ -n "$pid" ]]; then
		echo "- $name: 실행 중 (port $port, pid $pid)"
	else
		echo "- $name: 실행 안 됨 (port $port)"
	fi
}

api_health_json() {
	"$CURL_BIN" -fsS "http://127.0.0.1:$API_PORT/api/health" 2>/dev/null || true
}

is_supabase_expected() {
	[[ -n "${SUPABASE_URL:-}" && -n "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]
}

api_reports_supabase() {
	local health_json
	health_json="$(api_health_json)"
	[[ "$health_json" == *'"supabaseConfigured": true'* ]]
}

restart_api_server() {
	local existing_pid
	existing_pid="$(port_pid "$API_PORT")"
	if [[ -n "$existing_pid" ]]; then
		echo "API 서버 재시작: 기존 pid $existing_pid 종료"
		kill "$existing_pid" || true
		# 기존 프로세스가 포트를 비울 시간을 잠깐 준다.
		sleep 1
	fi

	nohup env PYTHON_BIN="$PYTHON_BIN" bash "$ROOT_DIR/start_estimate_server.sh" >"$API_LOG" 2>&1 &
	echo "API 서버 시작: http://127.0.0.1:$API_PORT"
	wait_for_port "$API_PORT" "API 서버"
}

PYTHON_BIN="$(find_python || true)"

if [[ -z "$PYTHON_BIN" ]]; then
	echo "openpyxl이 설치된 Python 환경을 찾지 못했습니다."
	echo "먼저 가상환경을 활성화하거나 pip install -r requirements.txt 를 실행하세요."
	exit 1
fi

echo "사용 Python: $PYTHON_BIN"

if [[ -z "$(port_pid "$FRONTEND_PORT")" ]]; then
	nohup "$PYTHON_BIN" -m http.server "$FRONTEND_PORT" --bind 127.0.0.1 >"$FRONTEND_LOG" 2>&1 &
	echo "정적 서버 시작: http://127.0.0.1:$FRONTEND_PORT"
	wait_for_port "$FRONTEND_PORT" "정적 서버"
	else
	echo "정적 서버는 이미 실행 중입니다: http://127.0.0.1:$FRONTEND_PORT"
fi

if [[ -z "$(port_pid "$API_PORT")" ]]; then
	restart_api_server
else
	echo "API 서버는 이미 실행 중입니다: http://127.0.0.1:$API_PORT"
	if is_supabase_expected; then
		if ! api_reports_supabase; then
			echo "기존 API 서버가 Local 모드로 실행 중이라 Supabase 모드로 재시작합니다."
			restart_api_server
		fi
	fi
fi

echo ""
print_running "정적 서버" "$FRONTEND_PORT"
print_running "API 서버" "$API_PORT"
echo ""
echo "접속 주소: http://127.0.0.1:$FRONTEND_PORT/index.html"
echo "상세 페이지 예시: http://127.0.0.1:$FRONTEND_PORT/pages/transaction_detail.html?id=2026-0022"
echo "로그 파일: $FRONTEND_LOG"
echo "로그 파일: $API_LOG"