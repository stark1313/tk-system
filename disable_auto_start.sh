#!/bin/bash

set -euo pipefail

AGENT_DIR="$HOME/Library/LaunchAgents"
FRONT_LABEL="com.tk_system.frontend"
API_LABEL="com.tk_system.api"
LEGACY_LABEL="com.tk_system.localdev"

FRONT_PLIST="$AGENT_DIR/$FRONT_LABEL.plist"
API_PLIST="$AGENT_DIR/$API_LABEL.plist"
LEGACY_PLIST="$AGENT_DIR/$LEGACY_LABEL.plist"

launchctl bootout "gui/$UID/$FRONT_LABEL" >/dev/null 2>&1 || true
launchctl bootout "gui/$UID/$API_LABEL" >/dev/null 2>&1 || true
launchctl bootout "gui/$UID/$LEGACY_LABEL" >/dev/null 2>&1 || true

rm -f "$FRONT_PLIST" "$API_PLIST" "$LEGACY_PLIST"

echo "자동 시작 해제 완료"
echo "- 삭제: $FRONT_PLIST"
echo "- 삭제: $API_PLIST"
echo "- 삭제: $LEGACY_PLIST"