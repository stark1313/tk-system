#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
견적서 생성 간단 HTTP 서버
localhost:5050에서 실행
"""

import json
import sys
import os
import sqlite3
import base64
import re
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import parse_qs
from openpyxl import load_workbook
from copy import copy
from datetime import datetime
import subprocess
import platform
import threading
from io import BytesIO

# 템플릿 파일 경로
TEMPLATE_PATH = "/Users/stark1313/시스템개발/01. 사무실 주문관리 시스템/서식업로드/양식_견적서.xlsx"
OUTPUT_DIR = os.path.expanduser("~/Desktop")
DATA_ROOT = os.path.expanduser("~/.tk_system")
DB_PATH = os.path.join(DATA_ROOT, "tk_system.db")
TEMPLATES_DIR = os.path.join(DATA_ROOT, "templates")
ALLOWED_TEMPLATE_TYPES = {
    "estimate": "견적서",
    "delivery": "납품서",
    "invoice": "청구서",
    "statement": "거래명세서",
    "taxInvoice": "세금계산서",
}


def sanitize_filename(filename):
    """파일명 정리"""
    base = os.path.basename(filename or "template.xlsx")
    return re.sub(r"[^A-Za-z0-9._-]", "_", base)


def ensure_templates_dir():
    os.makedirs(DATA_ROOT, exist_ok=True)
    os.makedirs(TEMPLATES_DIR, exist_ok=True)


def get_uploaded_template_path(template_type):
    """업로드된 템플릿 파일 경로 조회"""
    ensure_templates_dir()
    prefix = f"{template_type}__"
    candidates = []
    for name in os.listdir(TEMPLATES_DIR):
        if name.startswith(prefix):
            full_path = os.path.join(TEMPLATES_DIR, name)
            if os.path.isfile(full_path):
                candidates.append(full_path)

    if not candidates:
        return None

    candidates.sort(key=lambda p: os.path.getmtime(p), reverse=True)
    return candidates[0]


def resolve_template_path(template_type):
    """템플릿 경로 결정: 업로드본 우선, 견적서는 기존 경로 fallback"""
    uploaded = get_uploaded_template_path(template_type)
    if uploaded and os.path.exists(uploaded):
        return uploaded

    if template_type == "estimate" and os.path.exists(TEMPLATE_PATH):
        return TEMPLATE_PATH

    return None


def list_templates():
    """서식 목록 반환"""
    ensure_templates_dir()
    result = {}
    for template_type, label in ALLOWED_TEMPLATE_TYPES.items():
        path = get_uploaded_template_path(template_type)
        if path and os.path.exists(path):
            stat = os.stat(path)
            result[template_type] = {
                "label": label,
                "uploaded": True,
                "fileName": os.path.basename(path).split("__", 1)[-1],
                "savedAt": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                "size": stat.st_size,
            }
        else:
            result[template_type] = {
                "label": label,
                "uploaded": False,
                "fileName": None,
                "savedAt": None,
                "size": 0,
            }
    return result


def save_template_file(template_type, file_name, content_base64):
    """서식 파일 저장"""
    if template_type not in ALLOWED_TEMPLATE_TYPES:
        raise ValueError("invalid template type")

    ensure_templates_dir()
    safe_name = sanitize_filename(file_name)
    content = base64.b64decode(content_base64.encode("utf-8"), validate=True)

    existing = get_uploaded_template_path(template_type)
    if existing and os.path.exists(existing):
        os.remove(existing)

    target_name = f"{template_type}__{safe_name}"
    target_path = os.path.join(TEMPLATES_DIR, target_name)
    with open(target_path, "wb") as f:
        f.write(content)

    return target_path


def delete_template_file(template_type):
    """서식 파일 삭제"""
    path = get_uploaded_template_path(template_type)
    if path and os.path.exists(path):
        os.remove(path)
        return True
    return False


def init_db():
    """로컬 SQLite DB 초기화"""
    os.makedirs(DATA_ROOT, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    try:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS app_snapshots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                saved_at TEXT NOT NULL,
                data_json TEXT NOT NULL
            )
            """
        )
        conn.commit()
    finally:
        conn.close()


def save_app_data(data):
    """앱 전체 데이터를 스냅샷으로 저장"""
    payload = json.dumps(data, ensure_ascii=False)
    conn = sqlite3.connect(DB_PATH)
    try:
        conn.execute(
            "INSERT INTO app_snapshots (saved_at, data_json) VALUES (?, ?)",
            (datetime.now().isoformat(), payload),
        )
        conn.commit()
    finally:
        conn.close()


def load_latest_app_data():
    """가장 최근 앱 데이터 스냅샷 로드"""
    conn = sqlite3.connect(DB_PATH)
    try:
        row = conn.execute(
            "SELECT data_json, saved_at FROM app_snapshots ORDER BY id DESC LIMIT 1"
        ).fetchone()
    finally:
        conn.close()

    if not row:
        return {
            "data": {
                "customers": [],
                "items": [],
                "transactions": {},
                "payments": {},
            },
            "savedAt": None,
        }

    try:
        data = json.loads(row[0]) if row[0] else {}
    except Exception:
        data = {}

    return {
        "data": data,
        "savedAt": row[1],
    }

def copy_cell_style(source_cell, target_cell):
    """셀 스타일 복사"""
    try:
        if source_cell.font:
            target_cell.font = copy(source_cell.font)
        if source_cell.border:
            target_cell.border = copy(source_cell.border)
        if source_cell.fill:
            target_cell.fill = copy(source_cell.fill)
        if source_cell.number_format:
            target_cell.number_format = copy(source_cell.number_format)
        if source_cell.protection:
            target_cell.protection = copy(source_cell.protection)
        if source_cell.alignment:
            target_cell.alignment = copy(source_cell.alignment)
    except:
        pass

def replace_variables(ws, data):
    """워크시트의 변수 치환"""
    replacements = {
        '{납품월}': data.get('deliveryMonth', ''),
        '{거래처명}': data.get('customer', ''),
        '{공사명}': data.get('projectName', ''),
    }
    
    # 셀 값 중에 변수가 있으면 치환
    for row in ws.iter_rows():
        for cell in row:
            if cell.value and isinstance(cell.value, str):
                for placeholder, value in replacements.items():
                    if placeholder in cell.value:
                        cell.value = cell.value.replace(placeholder, str(value))
    
    # 품목 데이터 입력 (행 9부터 시작)
    items = data.get('items', [])
    start_row = 9
    template_row = 9
    
    for idx, item in enumerate(items[:20]):
        row_num = start_row + idx
        
        # 템플릿 행에서 스타일 복사
        for col_letter in ['A', 'B', 'C', 'D', 'E', 'F', 'G']:
            source_cell = ws[f'{col_letter}{template_row}']
            target_cell = ws[f'{col_letter}{row_num}']
            copy_cell_style(source_cell, target_cell)
        
        # 데이터 입력
        ws[f'A{row_num}'].value = item.get('product', '')
        ws[f'B{row_num}'].value = item.get('spec', '')
        ws[f'C{row_num}'].value = float(item.get('quantity', 0) or 0)
        ws[f'D{row_num}'].value = item.get('unit', '')
        ws[f'E{row_num}'].value = float(item.get('unitPrice', 0) or 0)
        
        quantity = float(item.get('quantity', 0) or 0)
        unit_price = float(item.get('unitPrice', 0) or 0)
        amount = quantity * unit_price
        ws[f'F{row_num}'].value = amount
        ws[f'G{row_num}'].value = item.get('remark', '')

def generate_estimate(data):
    """견적서 Excel 생성"""
    return generate_document(data, "estimate")


def generate_document(data, doc_type):
    """문서 타입별 Excel 생성"""
    try:
        if doc_type not in ALLOWED_TEMPLATE_TYPES:
            raise ValueError("지원하지 않는 문서 타입입니다.")

        template_path = resolve_template_path(doc_type)
        if not template_path:
            raise FileNotFoundError(f"{ALLOWED_TEMPLATE_TYPES[doc_type]} 템플릿이 없습니다. 서식업로드에서 먼저 업로드해주세요.")

        wb = load_workbook(template_path)
        ws = wb.active
        
        replace_variables(ws, data)
        
        # 견적서 템플릿의 합계 셀을 유지하기 위해 기존 규칙 적용
        if doc_type == "estimate":
            total = sum(float(ws[f'F{row}'].value or 0) for row in range(9, 29))
            ws['F11'].value = total
        
        # 메모리에 저장
        output = BytesIO()
        wb.save(output)
        output.seek(0)
        
        # 디스크에도 저장 (자동 열기용)
        os.makedirs(OUTPUT_DIR, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        customer_name = data.get('customer', 'estimate').replace('/', '_')
        doc_label = ALLOWED_TEMPLATE_TYPES.get(doc_type, doc_type)
        filename = f"{customer_name}_{doc_label}_{timestamp}.xlsx"
        filepath = os.path.join(OUTPUT_DIR, filename)
        
        with open(filepath, 'wb') as f:
            f.write(output.getvalue())
        
        return output.getvalue(), filename, filepath
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return None, None, None

def open_file(filepath):
    """파일 자동 실행"""
    try:
        if platform.system() == 'Darwin':
            subprocess.Popen(['open', filepath])
        elif platform.system() == 'Windows':
            os.startfile(filepath)
        elif platform.system() == 'Linux':
            subprocess.Popen(['xdg-open', filepath])
    except Exception as e:
        print(f"Warning: {e}")

class EstimateHandler(BaseHTTPRequestHandler):
    def _send_json(self, status_code, body):
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(json.dumps(body, ensure_ascii=False).encode('utf-8'))

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        if self.path == '/api/templates':
            self._send_json(200, {"templates": list_templates()})
            return

        if self.path.startswith('/api/templates/') and self.path.endswith('/download'):
            parts = self.path.split('/')
            if len(parts) >= 5:
                template_type = parts[3]
                if template_type not in ALLOWED_TEMPLATE_TYPES:
                    self._send_json(404, {"error": "template type not found"})
                    return

                template_path = get_uploaded_template_path(template_type)
                if not template_path:
                    self._send_json(404, {"error": "template file not found"})
                    return

                filename = os.path.basename(template_path).split("__", 1)[-1]
                with open(template_path, 'rb') as f:
                    file_bytes = f.read()

                self.send_response(200)
                self.send_header('Content-Type', 'application/octet-stream')
                self.send_header('Content-Disposition', f'attachment; filename="{filename}"')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(file_bytes)
                return

        if self.path == '/api/data':
            snapshot = load_latest_app_data()
            self._send_json(200, snapshot)
            return

        if self.path == '/api/health':
            self._send_json(200, {'ok': True})
            return

        self.send_response(404)
        self.end_headers()

    def do_POST(self):
        if self.path == '/api/templates':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            try:
                payload = json.loads(body.decode('utf-8'))
                template_type = payload.get('templateType')
                file_name = payload.get('fileName')
                content_base64 = payload.get('contentBase64')

                if not template_type or not file_name or not content_base64:
                    raise ValueError('templateType, fileName, contentBase64 are required')

                save_template_file(template_type, file_name, content_base64)
                self._send_json(200, {'ok': True, 'templates': list_templates()})
            except Exception as e:
                self._send_json(400, {'ok': False, 'error': str(e)})
            return

        if self.path == '/api/data':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)

            try:
                data = json.loads(body.decode('utf-8'))
                if not isinstance(data, dict):
                    raise ValueError('data must be an object')

                save_app_data(data)
                self._send_json(200, {'ok': True, 'savedAt': datetime.now().isoformat()})
            except Exception as e:
                self._send_json(400, {'ok': False, 'error': str(e)})
            return

        if self.path == '/estimate':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            
            try:
                data = json.loads(body.decode('utf-8'))
                file_data, filename, filepath = generate_estimate(data)
                
                if file_data:
                    # 자동으로 파일 열기
                    threading.Thread(target=open_file, args=(filepath,), daemon=True).start()
                    
                    # 파일 바이너리 반환
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
                    self.send_header('Content-Disposition', f'attachment; filename="{filename}"')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(file_data)
                else:
                    self._send_json(500, {'error': '파일 생성 실패'})
                    
            except Exception as e:
                print(f"Error: {e}")
                self._send_json(500, {'error': str(e)})
            return

        if self.path == '/document':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)

            try:
                payload = json.loads(body.decode('utf-8'))
                doc_type = payload.get('docType')
                data = payload.get('data')

                if not doc_type or not isinstance(data, dict):
                    raise ValueError('docType, data are required')

                file_data, filename, filepath = generate_document(data, doc_type)

                if file_data:
                    threading.Thread(target=open_file, args=(filepath,), daemon=True).start()

                    self.send_response(200)
                    self.send_header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
                    self.send_header('Content-Disposition', f'attachment; filename="{filename}"')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(file_data)
                else:
                    self._send_json(500, {'error': '파일 생성 실패'})
            except Exception as e:
                print(f"Error: {e}")
                self._send_json(500, {'error': str(e)})
            return
        else:
            self.send_response(404)
            self.end_headers()

    def do_DELETE(self):
        if self.path.startswith('/api/templates/'):
            parts = self.path.split('/')
            if len(parts) >= 4:
                template_type = parts[3]
                if template_type not in ALLOWED_TEMPLATE_TYPES:
                    self._send_json(404, {'ok': False, 'error': 'template type not found'})
                    return
                deleted = delete_template_file(template_type)
                self._send_json(200, {'ok': True, 'deleted': deleted, 'templates': list_templates()})
                return

        self.send_response(404)
        self.end_headers()
    
    def log_message(self, format, *args):
        """로그 출력 억제"""
        pass

def run_server(port=5050):
    """HTTP 서버 실행"""
    init_db()
    ensure_templates_dir()
    server = HTTPServer(('localhost', port), EstimateHandler)
    print(f"견적서 서버 시작: http://localhost:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("서버 종료")
        server.shutdown()

if __name__ == '__main__':
    port = 5050
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print("포트는 숫자여야 합니다. 기본값 5050을 사용합니다.")
            port = 5050
    run_server(port)
