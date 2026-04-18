#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
견적서 생성 간단 HTTP 서버
localhost:5000에서 실행
"""

import json
import sys
import os
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
    try:
        wb = load_workbook(TEMPLATE_PATH)
        ws = wb.active
        
        replace_variables(ws, data)
        
        # 합계 계산
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
        filename = f"{customer_name}_견적서_{timestamp}.xlsx"
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
    def do_POST(self):
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
                    self.end_headers()
                    self.wfile.write(file_data)
                else:
                    self.send_response(500)
                    self.send_header('Content-Type', 'application/json; charset=utf-8')
                    self.end_headers()
                    self.wfile.write(json.dumps({'error': '파일 생성 실패'}).encode('utf-8'))
                    
            except Exception as e:
                print(f"Error: {e}")
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()
    
    def log_message(self, format, *args):
        """로그 출력 억제"""
        pass

def run_server(port=5000):
    """HTTP 서버 실행"""
    server = HTTPServer(('localhost', port), EstimateHandler)
    print(f"견적서 서버 시작: http://localhost:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("서버 종료")
        server.shutdown()

if __name__ == '__main__':
    run_server()
