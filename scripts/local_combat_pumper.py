import os
import re
import sys
import time
import requests
import feedparser
from datetime import datetime
from bs4 import BeautifulSoup
from supabase import create_client, Client
from dotenv import load_dotenv

# 1. 加载配置
load_dotenv()
SUPABASE_URL = os.getenv("PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("PUBLIC_SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ [Local] 错误: 无法找到 Supabase 凭证，请检查 .env 文件。")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# 2. 深度抓取配置
TARGET_FIRMS = [
    {"firm": "GBC", "url": "https://gbc.law/cases/"},
    {"firm": "EPS", "url": "https://www.ipcounselorslawsuit.com/"},
    {"firm": "Keith", "url": "https://www.keith.law/cases/"},
    {"firm": "HSP", "url": "https://www.hspdirect.com/cases/"}
]

RSS_FEEDS = [
    "https://www.courtlistener.com/recap/rss/court/ilnd/",
    "https://dockets.justia.com/search?courts=ilnd&nos=840&format=rss"
]

CASE_PATTERN = r"(\d{1,2}:\d{2}-cv-\d{3,5})|(\d{2}-cv-\d{3,5})"

def get_headers():
    return {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    }

def find_schedule_a_links(content):
    """提取微软云/SharePoint 链接逻辑"""
    patterns = [
        r'https://[\w\.-]*sharepoint\.com[:\w\./\?=&%-]*',
        r'https://[\w\.-]*1drv\.ms[:\w\./\?=&%-]*',
        r'https://[\w\.-]*onedrive\.live\.com[:\w\./\?=&%-]*'
    ]
    links = set()
    for p in patterns:
        for m in re.findall(p, content):
            links.add(m)
    return list(links)

def process_case(case_no, firm_name, source_url):
    # 插入案件
    res = supabase.table('lawsuits').select('id').eq('case_number', case_no).execute()
    new_case = False
    if len(res.data) == 0:
        print(f"   [New Case] 发现新案: {case_no}")
        supabase.table('lawsuits').insert({
            "case_number": case_no,
            "law_firm": firm_name,
            "status": "Active (Local Captured)",
            "filed_date": datetime.now().strftime("%Y-%m-%d"),
            "risk_score": 95,
            "raw_data_url": source_url,
            "created_at": datetime.now().isoformat() # 关键时间戳
        }).execute()
        new_case = True
    return new_case

def run_combat():
    print(f"📅 当前时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    total_new = 0
    requests.packages.urllib3.disable_warnings()

    # 1. 扫描律所官网
    for target in TARGET_FIRMS:
        print(f"🔎 正在扫描律所官宣: {target['firm']}...")
        try:
            resp = requests.get(target['url'], headers=get_headers(), timeout=15, verify=False)
            if resp.status_code == 200:
                cases = set(re.findall(CASE_PATTERN, resp.text))
                cloud_links = find_schedule_a_links(resp.text)
                
                if cloud_links:
                    print(f"   ☁️ 发现疑似被告名单云链接: {len(cloud_links)} 条")
                
                for c in cases:
                    case_id = c[0] if isinstance(c, tuple) else c
                    if case_id and process_case(case_id, target['firm'], target['url']):
                        total_new += 1
            else:
                print(f"   ⚠️ 响应异常: {resp.status_code}")
        except Exception as e:
            print(f"   ❌ 请求出错: {e}")

    # 2. 扫描 RSS 条目
    for rss_url in RSS_FEEDS:
        print(f"📡 正在拉取实时数据流: {rss_url}...")
        try:
            feed = feedparser.parse(rss_url, request_headers=get_headers())
            for entry in feed.entries:
                case_id_match = re.search(r'\d{1,2}:\d{2}-cv-\d{3,5}', entry.title)
                if case_id_match:
                    case_id = case_id_match.group(0)
                    if process_case(case_id, "RSS_Sentinel", entry.link):
                        total_new += 1
        except Exception as e:
            print(f"   ❌ RSS 出错: {e}")

    print("\n" + "="*50)
    print(f"🎯 成功抓取 {total_new} 条新案，已写入 Supabase 数据库")
    print("="*50)
    
    if total_new == 0:
        # 为了不让本地报错退出，这里只打印，但如果是 CI 环境则 exit 1
        print("[Local] 今日律所暂无更新或抓取被拦截。")

if __name__ == "__main__":
    run_combat()
