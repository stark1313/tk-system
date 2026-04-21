# TK System - 태경산업 주문관리 시스템

HTML/CSS/JavaScript 기반의 주문관리 시스템입니다. 프런트엔드는 정적 페이지로 동작하고, 백엔드는 Python 서버가 Supabase Database와 Storage를 사용해 데이터와 서식을 공용 저장소로 관리합니다.

## 현재 구조
- 주문, 거래처, 품목, 정산 데이터: Supabase Database
- 서식 파일 5종: Supabase Storage
- 엑셀 문서 생성: Python 백엔드 + openpyxl
- 프런트엔드 임시 작업 상태: 브라우저 localStorage
- 브라우저와 서버 데이터 동기화: js/db_sync.js

## 기능
- 주문내역 조회
- 거래처 관리
- 품목 관리
- 정산 관리
- 서식 업로드
- 견적서/납품서/청구서/거래명세서/세금계산서 생성
- 다중 기기 공용 데이터 사용

## 실행 방법
1. Supabase 프로젝트를 생성합니다.
2. SQL Editor에서 supabase_schema.sql 내용을 실행합니다.
3. Storage에서 tk-templates 버킷을 만들거나, 서버가 처음 실행될 때 자동 생성되도록 둡니다.
4. 환경변수를 설정합니다.
   - SUPABASE_URL
   - SUPABASE_SERVICE_ROLE_KEY
   - 선택값: SUPABASE_STATE_TABLE, SUPABASE_STATE_ROW_ID, SUPABASE_TEMPLATE_BUCKET
5. 백엔드 서버를 실행합니다.
   - ./start_estimate_server.sh
6. index.html을 Live Server 등으로 열어 사용합니다.

## 맥북 다시 켠 뒤 빠른 재기동
1. 터미널을 열고 프로젝트 폴더로 이동합니다.
2. 한 번에 실행하려면 아래 명령만 입력합니다.

```bash
./start_local_dev.sh
```

3. 브라우저에서 아래 주소로 접속합니다.
   - http://127.0.0.1:3000/index.html
   - http://127.0.0.1:3000/pages/transaction_detail.html?id=2026-0022
4. 실행 상태 확인이 필요하면 아래를 사용합니다.

```bash
./status_local_dev.sh
```

5. 서버를 모두 끌 때는 아래를 사용합니다.

```bash
./stop_local_dev.sh
```

### 이 프로젝트에서 올라가는 서버
- 정적 프런트엔드 서버: 3000번 포트
- Python API 서버: 5050번 포트

## 맥 로그인 시 자동 시작 설정
한 번만 설정하면, 로그인할 때마다 정적 서버(3000)와 API 서버(5050)가 자동으로 시작됩니다.

1. 프로젝트 폴더에서 설치 스크립트를 실행합니다.

```bash
chmod +x install_auto_start.sh disable_auto_start.sh auto_start_status.sh
./install_auto_start.sh
```

2. 상태를 확인합니다.

```bash
./auto_start_status.sh
```

3. 자동 시작을 해제하려면 아래를 실행합니다.

```bash
./disable_auto_start.sh
```

참고:
- LaunchAgent 파일 위치: ~/Library/LaunchAgents/com.tk_system.localdev.plist
- 로그인 후 서버 로그:
   - /tmp/tk_system/launchd_stdout.log
   - /tmp/tk_system/launchd_stderr.log

### ERR_CONNECTION_REFUSED가 뜰 때 확인할 것
- 3000번 포트가 안 떠 있으면 페이지 자체가 열리지 않습니다.
- 5050번 포트가 안 떠 있으면 페이지는 열려도 데이터 저장, 문서 생성, 동기화가 실패합니다.
- js/app_config.js는 로컬에서 API 주소를 자동으로 http://localhost:5050 으로 맞추므로, 보통은 3000과 5050만 다시 띄우면 됩니다.

## 로컬 개발용 환경변수 예시

```bash
export SUPABASE_URL="https://your-project-ref.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
export SUPABASE_STATE_TABLE="tk_app_state"
export SUPABASE_STATE_ROW_ID="primary"
export SUPABASE_TEMPLATE_BUCKET="tk-templates"
./start_estimate_server.sh
```

## Supabase 준비
- 데이터 테이블 생성: supabase_schema.sql 실행
- Storage 버킷 이름 기본값: tk-templates
- 서버는 service role key를 사용하므로 이 키를 브라우저에 노출하면 안 됩니다.

## 배포 메모
- Render 배포 시 render.yaml을 사용할 수 있습니다.
- 이제 SQLite 영구 디스크가 필요하지 않으므로 free tier에서도 배포 구성이 단순합니다.
- Render 환경변수에는 반드시 SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY를 넣어야 합니다.

## 참고
- API 서버 기본 포트: http://localhost:5050
- 프런트엔드 API 기본 주소 설정: js/app_config.js
- Supabase 미설정 상태에서도 기존 로컬 SQLite/템플릿 폴백으로 실행은 가능하지만, 다중 기기 공유 목적이라면 Supabase 설정이 필요합니다.
