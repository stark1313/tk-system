#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
AGENT_DIR="$HOME/Library/LaunchAgents"
LOG_DIR="/tmp/tk_system"

FRONT_LABEL="com.tk_system.frontend"
API_LABEL="com.tk_system.api"
LEGACY_LABEL="com.tk_system.localdev"

FRONT_PLIST="$AGENT_DIR/$FRONT_LABEL.plist"
API_PLIST="$AGENT_DIR/$API_LABEL.plist"
LEGACY_PLIST="$AGENT_DIR/$LEGACY_LABEL.plist"

find_python() {
  local candidate
  local -a candidates=()

  if [[ -n "${VIRTUAL_ENV:-}" && -x "$VIRTUAL_ENV/bin/python3" ]]; then
    candidates+=("$VIRTUAL_ENV/bin/python3")
  fi

  if [[ -x "$ROOT_DIR/.venv/bin/python3" ]]; then
    candidates+=("$ROOT_DIR/.venv/bin/python3")
  fi

  for candidate in "$ROOT_DIR"/.venv-*/bin/python3; do
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

mkdir -p "$AGENT_DIR"
mkdir -p "$LOG_DIR"

PYTHON_BIN="$(find_python || true)"

if [[ -z "$PYTHON_BIN" ]]; then
  echo "openpyxl이 설치된 Python 환경을 찾지 못했습니다."
  echo "가상환경을 활성화하거나 requirements 설치 후 다시 실행하세요."
  exit 1
fi

cat >"$FRONT_PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$FRONT_LABEL</string>

  <key>WorkingDirectory</key>
  <string>$ROOT_DIR</string>

  <key>ProgramArguments</key>
  <array>
    <string>$PYTHON_BIN</string>
    <string>-m</string>
    <string>http.server</string>
    <string>3000</string>
    <string>--bind</string>
    <string>127.0.0.1</string>
  </array>

  <key>KeepAlive</key>
  <true/>

  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
  </dict>

  <key>RunAtLoad</key>
  <true/>

  <key>StandardOutPath</key>
  <string>$LOG_DIR/frontend-launchd.log</string>

  <key>StandardErrorPath</key>
  <string>$LOG_DIR/frontend-launchd.err.log</string>
</dict>
</plist>
EOF

cat >"$API_PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$API_LABEL</string>

  <key>WorkingDirectory</key>
  <string>$ROOT_DIR</string>

  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>$ROOT_DIR/start_estimate_server.sh</string>
  </array>

  <key>KeepAlive</key>
  <true/>

  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    <key>PYTHON_BIN</key>
    <string>$PYTHON_BIN</string>
  </dict>

  <key>RunAtLoad</key>
  <true/>

  <key>StandardOutPath</key>
  <string>$LOG_DIR/api-launchd.log</string>

  <key>StandardErrorPath</key>
  <string>$LOG_DIR/api-launchd.err.log</string>
</dict>
</plist>
EOF

launchctl bootout "gui/$UID/$LEGACY_LABEL" >/dev/null 2>&1 || true
launchctl bootout "gui/$UID/$FRONT_LABEL" >/dev/null 2>&1 || true
launchctl bootout "gui/$UID/$API_LABEL" >/dev/null 2>&1 || true

rm -f "$LEGACY_PLIST"

launchctl bootstrap "gui/$UID" "$FRONT_PLIST"
launchctl bootstrap "gui/$UID" "$API_PLIST"

launchctl kickstart -k "gui/$UID/$FRONT_LABEL" >/dev/null 2>&1 || true
launchctl kickstart -k "gui/$UID/$API_LABEL" >/dev/null 2>&1 || true

echo "자동 시작 설정 완료"
echo "- Python: $PYTHON_BIN"
echo "- Frontend Agent: $FRONT_PLIST"
echo "- API Agent: $API_PLIST"
echo "- 상태 확인: ./auto_start_status.sh"
echo "- 해제: ./disable_auto_start.sh"