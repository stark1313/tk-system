# TK System - 태경산업 주문관리 시스템

HTML/CSS/JavaScript 기반의 주문관리 시스템이며, SQLite 백엔드 동기화를 지원합니다.

## 기능
- 주문내역 조회
- 거래처 관리
- 품목 관리
- 정산 관리
- 서식 업로드 (견적서/납품서/청구서/거래명세서/세금계산서)
- 브라우저 localStorage <-> SQLite 자동 동기화

## 실행 방법 (권장)
1. 터미널에서 백엔드 서버를 실행합니다.
	- `./start_estimate_server.sh`
2. VS Code에서 Live Server 확장을 설치합니다.
3. `index.html`을 열고 Live Server를 시작합니다.
4. 브라우저에서 사용하면 데이터가 자동으로 SQLite에 백업됩니다.

## 참고
- API 서버 포트: `http://localhost:5050`
