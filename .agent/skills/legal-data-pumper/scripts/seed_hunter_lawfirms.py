import requests
import re
import os
from datetime import datetime
from supabase import create_client, Client

# 1. 环境配置 (无需 load_dotenv，直接 os.getenv)
SUPABASE_URL = os.environ.get("PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("PUBLIC_SUPABASE_ANON_KEY") or os.environ.get("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Fatal: Missing Supabase credentials.")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# 2. 目标律所监控列表
TARGETS = [
    {
        "firm": "GBC",
        "url": "https://www.gbcinfringement.com/", 
        "priority": "High"
    },
    {
        "firm": "HSP",
        "url": "https://hspdirect.com/cases/",
        "priority": "High"
    },
    {
        "firm": "Keith",
        "url": "https://keith.law/cases/",
        "priority": "High"
    },
    {
        "firm": "EPS",
        "url": "https://epslaw.com/notices/",
        "priority": "Medium"
    }
]

CASE_PATTERN = r"(\d{1,2}:\d{2}-cv-\d{3,5})"

def get_headers():
    return {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
    }

def scan_target(target):
    print(f"🕵️ 扫描 (Light Mode): {target['firm']} - {target['url']}")
    try:
        resp = requests.get(target['url'], headers=get_headers(), timeout=15, verify=False)
        if resp.status_code != 200:
            print(f"   ❌ HTTP {resp.status_code}")
            return 0
            
        content = resp.text
        found_cases = set(re.findall(CASE_PATTERN, content))
        print(f"   -> 发现 {len(found_cases)} 个潜在案号")
        
        caseload_count = 0
        for case_no in found_cases:
            print(f"      -> 检查案号: {case_no}")
             # (A) 更新 Law Firm 信息
            res = supabase.table('lawsuits').select('*').eq('case_number', case_no).execute()
            
            if len(res.data) > 0:
                current_firm = res.data[0].get('law_firm')
                if current_firm != target['firm']:
                    print(f"         📝 更新律所: {current_firm} -> {target['firm']}")
                    supabase.table('lawsuits').update({'law_firm': target['firm']}).eq('case_number', case_no).execute()
                caseload_count += 1
            else:
                print(f"         🆕 发现新案: {case_no}")
                payload = {
                    "case_number": case_no,
                    "plaintiff": "Unknown (Hunter Discovered)",
                    "law_firm": target['firm'],
                    "court": "N.D. Illinois",
                    "status": "Active (Firm Website)",
                    "filed_date": datetime.now().strftime("%Y-%m-%d"),
                    "raw_data_url": target['url'],
                    "risk_score": 95
                }
                try:
                    supabase.table('lawsuits').insert(payload).execute()
                    caseload_count += 1
                except Exception as e:
                    pass

        return caseload_count

    except Exception as e:
        print(f"   ❌ 请求失败: {e}")
        return 0

def main():
    print("🚀 启动律所猎手 (Law Firm Hunter) - Light Request Mode...")
    total = 0
    requests.packages.urllib3.disable_warnings() # Suppress SSL warnings

    for target in TARGETS:
        total += scan_target(target)
    
    print("\n" + "="*50)
    print(f"📊 猎杀统计: 总计处理 {total} 个案件")
    print("="*50)
    
    # Hunter is auxiliary, so we don't necessarily fail the pipeline if it finds nothing, 
    # as long as Sentinel found something. 
    # But if user wants strict audit everywhere:
    if total == 0:
         print("⚠️ Hunter 未发现新数据 (可能律所今日无更新或反爬拦截)")

if __name__ == "__main__":
    main()
