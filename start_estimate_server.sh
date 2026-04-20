#!/bin/bash
# 견적서 서버 시작 스크립트

cd "$(dirname "$0")"

if [ -f .env ]; then
	# Export variables from .env for the current shell process.
	set -a
	. ./.env
	set +a
fi

# UTF-8 인코딩 강제 설정
export PYTHONIOENCODING=utf-8

echo "======================================"
echo "견적서 생성 서버 시작"
echo "======================================"
echo ""
echo "✓ localhost:5050에서 실행 중..."
echo "✓ 주문상세내역의 '견적서' 버튼을 클릭하면 자동 생성됩니다."
echo "✓ 서버를 종료하려면 Ctrl+C를 누르세요."
if [ -n "$SUPABASE_URL" ] && [ -n "$SUPABASE_SERVICE_ROLE_KEY" ]; then
	echo "✓ 저장소 모드: Supabase"
else
	echo "✓ 저장소 모드: Local (SUPABASE 설정 없음)"
fi
echo ""

python3 estimate_server.py
