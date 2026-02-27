#!/usr/bin/env python3
"""
GRICH Enhanced Law Firm Data Pumper
改进版律所网站抓取脚本，支持 GBC、EPS、Keith、HSPRD 等律所
"""

import os
import sys
import io

# 设置标准输出编码为UTF-8，避免Windows控制台Unicode错误
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

import re
import json
import time
import random
import requests
from datetime import datetime
from dotenv import load_dotenv
from bs4 import BeautifulSoup
from urllib.parse import urljoin
import pdfplumber
import io as aio


# ==========================================
# 1. 环境配置与验证
# ==========================================

# 加载环境变量
load_dotenv()

SUPABASE_URL = os.getenv("PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("PUBLIC_SUPABASE_ANON_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# 环境验证
print("=" * 60)
print("[搜索] GRICH Enhanced Law Firm Pumper v2.0")
print("=" * 60)

if not SUPABASE_URL:
    print("❌ [FATAL] 缺少 PUBLIC_SUPABASE_URL 环境变量")
    print("   请在 .env 文件中设置: PUBLIC_SUPABASE_URL=https://xxx.supabase.co")
    sys.exit(1)

if not SUPABASE_KEY:
    print("❌ [FATAL] 缺少 Supabase 密钥")
    print("   请在 .env 文件中设置: PUBLIC_SUPABASE_ANON_KEY=xxx")
    sys.exit(1)

print(f"✅ Supabase URL: {SUPABASE_URL[:30]}...")
print()

# ==========================================
# 2. API 配置
# ==========================================

# Supabase REST API 配置
SUPABASE_REST_URL = f"{SUPABASE_URL}/rest/v1/lawsuits"
SUPABASE_HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

# 律所目标配置
LAW_FIRMS = [
    {
        "name": "GBC",
        "url": "https://gbc.law/cases/",
        "pattern": r"(\d{2}-cv-\d{3,5})",
        "law_firm": "Greer, Burns & Crain, LTD."
    },
    {
        "name": "EPS",
        "url": "https://www.ipcounselorslawsuit.com/",
        "pattern": r"(\d{2}-cv-\d{3,5})",
        "law_firm": "IP Counselors"
    },
    {
        "name": "Keith",
        "url": "https://www.keith.law/cases/",
        "pattern": r"(\d{2}-cv-\d{3,5})",
        "law_firm": "Keith Law"
    },
    {
        "name": "HSPRD",
        "url": "https://hsplegal.com/notices/",
        "pattern": r"(\d{2}-cv-\d{3,5})",
        "law_firm": "Hughes Socol Piers Resnick & Dym"
    }
]

# 请求配置
MIN_DELAY = 45  # 最小45秒
MAX_DELAY = 120  # 最大120秒
REQUEST_TIMEOUT = 20  # 请求超时时间

# ==========================================
# 3. 数据库操作函数
# ==========================================

def check_database_connection():
    """测试数据库连接"""
    try:
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/lawsuits?select=count&limit=1",
            headers=SUPABASE_HEADERS,
            timeout=10
        )
        if response.status_code == 200:
            print("✅ 数据库连接正常")
            return True
        else:
            print(f"❌ 数据库连接失败: HTTP {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ 数据库连接异常: {e}")
        return False

def check_duplicate(case_number):
    """
    检查案件是否已存在
    返回: (is_duplicate, existing_record)
    """
    try:
        query_url = f"{SUPABASE_REST_URL}?case_number=eq.{case_number}&select=id,case_number,plaintiff"
        response = requests.get(query_url, headers=SUPABASE_HEADERS, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data and len(data) > 0:
                return True, data[0]
        return False, None
    except Exception as e:
        print(f"  ⚠️  查重检查异常: {e}")
        return False, None

def check_defendant_duplicate(case_number, defendant_name):
    """
    检查特定被告是否已在案件中存在
    """
    try:
        query_url = f"{SUPABASE_URL}/rest/v1/defendants?case_number=eq.{case_number}&defendant_name=eq.{defendant_name}&select=id"
        response = requests.get(query_url, headers=SUPABASE_HEADERS, timeout=10)
        if response.status_code == 200 and response.json():
            return True
        return False
    except Exception as e:
        print(f"  ⚠️  被告查重异常: {e}")
        return False # On error, assume not a duplicate to allow insertion attempt

def insert_lawsuit(lawsuit_data):
    """
    插入案件到数据库
    返回: (success, response_data)
    """
    try:
        response = requests.post(
            SUPABASE_REST_URL,
            headers=SUPABASE_HEADERS,
            json=lawsuit_data,
            timeout=15
        )
        
        if response.status_code in [200, 201]:
            return True, response.json()
        elif response.status_code == 409: # Conflict, record already exists
            return True, None # Treat as success for the flow
        else:
            print(f"  ❌ 插入案件失败: HTTP {response.status_code}")
            print(f"     响应: {response.text[:200]}")
            return False, None
    except Exception as e:
        print(f"  ❌ 插入案件异常: {e}")
        return False, None

def insert_defendant(defendant_data):
    """
    插入单条被告数据到数据库
    """
    try:
        defendant_url = f"{SUPABASE_URL}/rest/v1/defendants"
        response = requests.post(
            defendant_url,
            headers=SUPABASE_HEADERS,
            json=defendant_data,
            timeout=15
        )
        if response.status_code in [201, 409]: # Created or Conflict
            return True
        else:
            print(f"    - 插入被告失败: {response.status_code} {response.text[:100]}")
            return False
    except Exception as e:
        print(f"    - 插入被告异常: {e}")
        return False

def verify_insertion(case_number):
    """
    验证数据是否成功插入
    """
    try:
        query_url = f"{SUPABASE_REST_URL}?case_number=eq.{case_number}&select=id,case_number,plaintiff"
        response = requests.get(query_url, headers=SUPABASE_HEADERS, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if data and len(data) > 0:
                return True, data[0]
        return False, None
    except Exception as e:
        print(f"  ⚠️  验证异常: {e}")
        return False, None

# ==========================================
# 4. 律所网站抓取函数
# ==========================================

def get_headers():
    """获取请求头"""
    return {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
    }

def _process_pdf_and_extract_data(pdf_url, firm_config):
    """
    "Sniper" function: Downloads a PDF, extracts text, and finds case/defendant data.
    """
    try:
        print(f"     sniper> Processing PDF: {pdf_url}")
        response = requests.get(pdf_url, timeout=REQUEST_TIMEOUT, verify=False)
        if response.status_code != 200:
            print(f"     sniper> Failed to download PDF. Status: {response.status_code}")
            return None, []

        all_text = ""
        with pdfplumber.open(aio.BytesIO(response.content)) as pdf:
            for page in pdf.pages:
                all_text += page.extract_text() + "\n"
        
        if not all_text:
            print("    sniper> PDF text extraction failed. Document might be an image.")
            return None, []

        # --- Regex Extraction Logic ---
        # 1. Find Case Number
        case_number = "Unknown"
        case_match = re.search(r"Case\sNo\.\s+([\d:]+-cv-[\d]+)", all_text, re.IGNORECASE)
        if case_match:
            case_number = case_match.group(1).strip().upper()

        # 2. Find Plaintiff
        plaintiff = "Unknown"
        plaintiff_match = re.search(r"([A-Za-z\s,]+),\s+Plaintiff,", all_text, re.IGNORECASE)
        if plaintiff_match:
            plaintiff = plaintiff_match.group(1).strip()

        # 3. Find Defendants from Schedule A
        defendants = []
        schedule_a_text = re.search(r"SCHEDULE\s+A\b(.*)", all_text, re.DOTALL | re.IGNORECASE)
        if schedule_a_text:
            defendant_block = schedule_a_text.group(1)
            # This regex assumes defendants are one per line, possibly with a number.
            found_defendants = re.findall(r"^\d*\s*([A-Za-z0-9_ -]+)\s*$", defendant_block, re.MULTILINE)
            defendants = [name.strip() for name in found_defendants if len(name.strip()) > 3]

        if not defendants:
            print(f"    sniper> Could not find 'Schedule A' or defendants in PDF.")

        print(f"    sniper> Extracted Case: {case_number}, Plaintiff: {plaintiff}, Defendants: {len(defendants)}")

        # Structure the data
        lawsuit_record = {
            "case_number": case_number,
            "plaintiff": plaintiff,
            "law_firm": firm_config['law_firm'],
            "court": "N.D. Illinois", # Assumption, can be improved
            "filed_date": datetime.now().strftime('%Y-%m-%d'),
            "status": "Active Litigation",
            "raw_data_url": pdf_url
        }
        
        defendant_records = []
        for def_name in defendants:
            defendant_records.append({
                "defendant_name": def_name,
                "case_number": case_number,
                "brand_name": plaintiff, # Assumption
                "platform": "Unknown", # Can be improved with more regex
                "source": pdf_url
            })

        return lawsuit_record, defendant_records

    except Exception as e:
        print(f"    sniper> Error processing PDF {pdf_url}: {e}")
        return None, []

def fetch_lawfirm_cases(firm_config):
    """
    从律所网站抓取案件数据, 升级为 "Sniper V2" 协议。
    该函数现在会:
    1. 抓取主案件页面。
    2. 解析HTML, 寻找指向PDF文件的链接。
    3. 下载并解析PDF以提取详细的被告信息。
    """
    firm_name = firm_config['name']
    base_url = firm_config['url']
    
    try:
        print(f"  📡 访问 {firm_name} 网站: {base_url}")
        
        response = requests.get(base_url, headers=get_headers(), timeout=REQUEST_TIMEOUT, verify=False)
        
        if response.status_code != 200:
            print(f"  ⚠️  网站返回状态: {response.status_code}")
            return [], []

        soup = BeautifulSoup(response.content, 'html.parser')
        
        pdf_links = []
        for a_tag in soup.find_all('a', href=True):
            href = a_tag['href']
            if href.lower().endswith('.pdf'):
                full_url = urljoin(base_url, href)
                pdf_links.append(full_url)
        
        if not pdf_links:
            print(f"  ⚪  在 {firm_name} 页面未找到 PDF 链接。")
            return [], []

        print(f"  ✅ 在 {firm_name} 页面找到 {len(pdf_links)} 个 PDF 链接。开始执行 Sniper V2 协议...")
        
        all_lawsuits = []
        all_defendants = []
        for pdf_url in pdf_links:
            lawsuit_record, defendant_records = _process_pdf_and_extract_data(pdf_url, firm_config)
            if lawsuit_record and lawsuit_record["case_number"] != "Unknown":
                all_lawsuits.append(lawsuit_record)
                all_defendants.extend(defendant_records)

        return all_lawsuits, all_defendants
        
    except requests.Timeout:
        print(f"  ⏱️  请求超时")
        return [], []
    except Exception as e:
        print(f"  ❌ 抓取或解析异常: {e}")
        import traceback
        traceback.print_exc()
        return [], []

def process_lawfirm(firm_config):
    """
    处理单个律所的数据抓取, 实现案件和被告的 "upsert" 逻辑。
    返回: (new_cases, new_defendants, skipped_cases, skipped_defendants, failed_cases)
    """
    firm_name = firm_config['name']
    print(f"\n{'─' * 50}")
    print(f"🎯 处理律所: {firm_name}")
    print(f"{'─' * 50}")

    lawsuits, defendants = fetch_lawfirm_cases(firm_config)
    
    if not lawsuits and not defendants:
        return 0, 0, 0, 0, 1

    new_cases_count = 0
    new_defendants_count = 0
    skipped_cases_count = 0
    skipped_defendants_count = 0
    failed_cases_count = 0

    # 1. 处理案件 (Lawsuits)
    unique_case_numbers = {l['case_number'] for l in lawsuits}
    for lawsuit_data in lawsuits:
        # 只处理每个案件号一次
        if lawsuit_data['case_number'] not in unique_case_numbers:
            continue
        unique_case_numbers.remove(lawsuit_data['case_number'])

        is_duplicate, _ = check_duplicate(lawsuit_data['case_number'])
        if is_duplicate:
            print(f"  ⏭️  案件已存在: {lawsuit_data['case_number']}")
            skipped_cases_count += 1
        else:
            success, _ = insert_lawsuit(lawsuit_data)
            if success:
                print(f"  ✅ 插入新案件成功: {lawsuit_data['case_number']}")
                new_cases_count += 1
            else:
                print(f"  ❌ 插入新案件失败: {lawsuit_data['case_number']}")
                failed_cases_count += 1

    # 2. 处理被告 (Defendants) - 无论案件是否已存在
    print(f"  - 扫描 {len(defendants)} 个提取到的被告记录...")
    for def_data in defendants:
        is_def_duplicate = check_defendant_duplicate(def_data['case_number'], def_data['defendant_name'])
        if is_def_duplicate:
            skipped_defendants_count += 1
        else:
            if insert_defendant(def_data):
                new_defendants_count += 1
    
    print(f"  - 新增 {new_defendants_count} 个被告, 跳过 {skipped_defendants_count} 个已存在的被告。")

    return new_cases_count, new_defendants_count, skipped_cases_count, skipped_defendants_count, failed_cases_count

# ==========================================
# 5. 主抓取流程
# ==========================================

def main():
    """主函数"""
    
    print("\n[步骤 1] 测试数据库连接...")
    if not check_database_connection():
        print("\n❌ 数据库连接失败，无法继续")
        sys.exit(1)
    
    print("\n[步骤 2] 开始律所网站抓取 (Sniper V2 模式)...")
    print(f"⏰ 请求延迟: {MIN_DELAY}-{MAX_DELAY} 秒\n")
    
    total_new_cases = 0
    total_new_defendants = 0
    total_skipped_cases = 0
    
    for index, firm_config in enumerate(LAW_FIRMS, 1):
        print(f"\n{'=' * 60}")
        print(f"进度: [{index}/{len(LAW_FIRMS)}] - {firm_config['name']}")
        print(f"{'=' * 60}")
        
        new_cases, new_defendants, skipped_cases, _, _ = process_lawfirm(firm_config)
        
        total_new_cases += new_cases
        total_new_defendants += new_defendants
        total_skipped_cases += skipped_cases
        
        if index < len(LAW_FIRMS):
            delay = random.randint(MIN_DELAY, MAX_DELAY)
            print(f"\n⏳ 等待 {delay} 秒后继续...")
            time.sleep(delay)
    
    # 3. 输出总结
    print("\n" + "=" * 60)
    print("📊 抓取任务完成总结 (Sniper V2 模式)")
    print("=" * 60)
    print(f"✅ 成功插入新案件: {total_new_cases}")
    print(f"✅ 成功插入新被告: {total_new_defendants}")
    print(f"⏭️  跳过已存在案件: {total_skipped_cases}")
    print("\n💡 提示:")
    print("   - 数据已更新。请检查数据库中的 `lawsuits` 和 `defendants` 表。")
    print("=" * 60)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  用户中断")
        sys.exit(0)
    except Exception as e:
        print(f"\n\n❌ 程序异常: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
