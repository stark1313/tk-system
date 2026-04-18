#!/bin/bash
# 견적서 서버 시작 스크립트

cd "$(dirname "$0")"

echo "======================================"
echo "견적서 생성 서버 시작"
echo "======================================"
echo ""
echo "✓ localhost:5050에서 실행 중..."
echo "✓ 주문상세내역의 '견적서' 버튼을 클릭하면 자동 생성됩니다."
echo "✓ 서버를 종료하려면 Ctrl+C를 누르세요."
echo ""

python3 estimate_server.py
