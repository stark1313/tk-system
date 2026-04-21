#!/bin/bash

set -euo pipefail

AGENT_DIR="$HOME/Library/LaunchAgents"
FRONT_LABEL="com.tk_system.frontend"
API_LABEL="com.tk_system.api"
LEGACY_LABEL="com.tk_system.localdev"

FRONT_PLIST="$AGENT_DIR/$FRONT_LABEL.plist"
API_PLIST="$AGENT_DIR/$API_LABEL.plist"
LEGACY_PLIST="$AGENT_DIR/$LEGACY_LABEL.plist"

show_agent() {
  local label="$1"
  local plist_path="$2"

  if [[ -f "$plist_path" ]]; then
    echo "LaunchAgent 파일: 있음"
    echo "- 라벨: $label"
    echo "- 경로: $plist_path"
  else
    echo "LaunchAgent 파일: 없음"
    echo "- 라벨: $label"
    echo "- 경로: $plist_path"
  fi

  if launchctl print "gui/$UID/$label" >/dev/null 2>&1; then
    local state
    state="$(launchctl print "gui/$UID/$label" 2>/dev/null | awk -F'= ' '/state =/{print $2; exit}')"
    if [[ -n "$state" ]]; then
      echo "launchctl 등록 상태: 활성 ($state)"
    else
      echo "launchctl 등록 상태: 활성"
    fi
  else
    echo "launchctl 등록 상태: 비활성"
  fi
}

show_agent "$FRONT_LABEL" "$FRONT_PLIST"
echo ""
show_agent "$API_LABEL" "$API_PLIST"

if [[ -f "$LEGACY_PLIST" ]] || launchctl print "gui/$UID/$LEGACY_LABEL" >/dev/null 2>&1; then
  echo ""
  echo "레거시 Agent 감지: $LEGACY_LABEL"
  echo "- 필요 시 ./disable_auto_start.sh 후 ./install_auto_start.sh 를 다시 실행하세요."
fi

if [[ -x "./status_local_dev.sh" ]]; then
  echo ""
  ./status_local_dev.sh
fi