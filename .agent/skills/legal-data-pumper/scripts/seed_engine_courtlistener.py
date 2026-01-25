import os
import requests
import json
import time
from datetime import datetime
from dotenv import load_dotenv

# 动态路径：从 skills/legal-data-pumper/scripts/ 定位到 grich-astro/.env
script_dir = os.path.dirname(os.path.abspath(__file__))
# legal-data-pumper/scripts -> legal-data-pumper -> skills -> .agent -> grich-astro
skills_dir = os.path.dirname(os.path.dirname(script_dir))  # skills/
agent_dir = os.path.dirname(skills_dir)  # .agent/
grich_dir = os.path.dirname(agent_dir)  # grich-astro/
project_root = os.path.dirname(grich_dir)  # 项目根目录
env_path = os.path.join(grich_dir, '.env')

# 直接读取.env文件
env_vars = {}
try:
    with open(env_path, 'r', encoding='utf-8-sig') as f:  # utf-8-sig自动移除BOM
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                env_vars[key.strip()] = value.strip()  # 清理空格
except Exception as e:
    print(f"❌ Error reading .env file: {e}")
    exit(1)

SUPABASE_URL = env_vars.get("PUBLIC_SUPABASE_URL")
SUPABASE_KEY = env_vars.get("PUBLIC_SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print(f"❌ Error: Supabase credentials not found in .env")
    print(f"   Found keys: {list(env_vars.keys())}")
    exit(1)

# Supabase REST API endpoint
REST_URL = f"{SUPABASE_URL}/rest/v1/lawsuits"
HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

# CourtListener API with Token
COURTLISTENER_API = "https://www.courtlistener.com/api/rest/v3/search/"
COURTLISTENER_TOKEN = "7f4374db0b69b37c02779dd59ed9c3b0fb90883d"
COURTLISTENER_HEADERS = {
    "Authorization": f"Token {COURTLISTENER_TOKEN}",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

KEYWORDS_FILE = os.path.join(project_root, 'sql', 'initial_keywords.json')

# ⏰ REQUEST DELAY: 防止API限流 (自主故障排除：已自动调整为随机延迟)
import random
REQUEST_DELAY_SECONDS = random.randint(60, 120)  # 随机60-120秒延迟

def read_keywords():
    try:
        with open(KEYWORDS_FILE, 'r', encoding='utf-8') as f:
            brands = json.load(f)
        return brands if isinstance(brands, list) else []
    except Exception as e:
        print(f"❌ Error reading keywords: {e}")
        return []

def check_duplicate(brand_name, case_number):
    """
    🔍 去重逻辑: 检查数据库中是否已存在该案件
    """
    try:
        # 查询数据库,检查是否已有相同的brand_name和case_number
        query_url = f"{REST_URL}?brand_name=eq.{brand_name}&case_number=eq.{case_number}"
        response = requests.get(query_url, headers=HEADERS, timeout=10)
        
        if response.status_code == 200:
            existing_records = response.json()
            if existing_records and len(existing_records) > 0:
                return True  # 已存在
        return False  # 不存在
    except Exception as e:
        print(f"  ⚠️ Error checking duplicate: {e}")
        return False  # 出错时假设不存在,允许插入

def fetch_real_lawsuits(brand_name):
    """
    Query CourtListener's API for real trademark lawsuits.
    """
    try:
        # Search query: brand name + trademark keywords
        query = f'"{brand_name}" AND (trademark OR counterfeiting OR "intellectual property")'
        
        params = {
            'q': query,
            'type': 'r',  # Dockets (case records)
            'order_by': 'dateFiled desc',  # Most recent first
            'court': 'ilnd',  # N.D. Illinois (known for SAD cases)
            'filed_after': '2024-01-01'  # Recent cases only
        }
        
        print(f"  🔍 Querying CourtListener for: {brand_name}")
        response = requests.get(COURTLISTENER_API, params=params, headers=COURTLISTENER_HEADERS, timeout=15)
        
        if response.status_code == 403:
            print(f"  🚫 403 Forbidden - Rate limited. Waiting 15 seconds...")
            time.sleep(15)  # 额外等待
            return None
        
        if response.status_code != 200:
            print(f"  ⚠️ CourtListener returned status {response.status_code}")
            return None
        
        data = response.json()
        results = data.get('results', [])
        
        if not results:
            print(f"  ⚪ No recent lawsuits found")
            return None
        
        # Parse first matching case
        case = results[0]
        
        # Calculate risk score based on case status
        risk_score = 70  # Base score
        case_name = case.get('caseName', '').lower()
        
        if 'tro' in case_name or 'temporary restraining' in case_name:
            risk_score = 95
        elif 'preliminary injunction' in case_name:
            risk_score = 90
        elif 'motion to dismiss' in case_name:
            risk_score = 75
        
        return {
            "brand_name": brand_name,
            "case_number": case.get('docketNumber', 'Unknown'),
            "plaintiff": case.get('caseName', '').split(' v. ')[0] if ' v. ' in case.get('caseName', '') else brand_name,
            "court": case.get('court', 'N.D. Illinois'),
            "filed_date": case.get('dateFiled', datetime.now().strftime('%Y-%m-%d')),
            "status": "Active Litigation",
            "risk_score": risk_score,
            "raw_data_url": f"https://www.courtlistener.com{case.get('absolute_url', '')}"
        }
        
    except requests.Timeout:
        print(f"  ⏱️ Timeout querying CourtListener")
        return None
    except Exception as e:
        print(f"  ❌ Error fetching data: {e}")
        return None

def seed_database():
    print(f"🔌 Connecting to Supabase: {SUPABASE_URL[:30]}...")
    print(f"📡 Using CourtListener API with Token")
    print(f"⏰ Request delay: {REQUEST_DELAY_SECONDS} seconds per brand\n")
    
    keywords = read_keywords()
    print(f"📖 Found {len(keywords)} brands to monitor\n")
    
    success_count = 0
    duplicate_count = 0
    failed_count = 0
    
    for index, brand in enumerate(keywords, 1):
        print(f"-----------------------------------")
        print(f"🚀 Processing [{index}/{len(keywords)}]: {brand}")
        
        # Fetch REAL data from CourtListener
        lawsuit_data = fetch_real_lawsuits(brand)
        
        if lawsuit_data:
            # 🔍 去重检查
            is_duplicate = check_duplicate(lawsuit_data['brand_name'], lawsuit_data['case_number'])
            
            if is_duplicate:
                print(f"  ⏭️ DUPLICATE SKIPPED: {brand} - Case {lawsuit_data['case_number']} already exists")
                duplicate_count += 1
            else:
                try:
                    response = requests.post(REST_URL, headers=HEADERS, json=lawsuit_data)
                    if response.status_code in [200, 201]:
                        print(f"  ✅ NEW DATA INSERTED: {brand}")
                        print(f"     Risk: {lawsuit_data['risk_score']}, Case: {lawsuit_data['case_number']}")
                        success_count += 1
                    else:
                        print(f"  ❌ Failed to insert: {response.text[:100]}")
                        failed_count += 1
                except Exception as e:
                    print(f"  ❌ Database error: {e}")
                    failed_count += 1
        else:
            print(f"  ⚪ No data available")
            failed_count += 1
        
        # ⏰ 请求延迟: 避免API限流
        if index < len(keywords):  # 最后一个不需要等待
            print(f"  ⏳ Waiting {REQUEST_DELAY_SECONDS} seconds before next request...")
            time.sleep(REQUEST_DELAY_SECONDS)
    
    print("\n" + "="*60)
    print(f"🎉 Seeding Complete!")
    print(f"📊 Results:")
    print(f"   ✅ Successfully inserted: {success_count}")
    print(f"   ⏭️ Duplicates skipped: {duplicate_count}")
    print(f"   ❌ Failed/No data: {failed_count}")
    print(f"   📈 Total processed: {len(keywords)}")
    print(f"\n🌐 Visit: https://jaxfamlaw.com/compliance/Nike")
    print("="*60)

if __name__ == "__main__":
    seed_database()
