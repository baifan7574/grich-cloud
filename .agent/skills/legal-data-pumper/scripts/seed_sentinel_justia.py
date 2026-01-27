import requests
from bs4 import BeautifulSoup
import re
import os
from datetime import datetime
from supabase import create_client, Client
from dotenv import load_dotenv

# 1. 环境配置
load_dotenv()
SUPABASE_URL = os.environ.get("PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("PUBLIC_SUPABASE_ANON_KEY") or os.environ.get("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Fatal: Missing Supabase credentials.")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# 2. 目标源: Justia Dockets (N.D. Illinois) - Filtered by Trademark
# Justia 的 URL 结构比较固定，且反爬较弱
TARGET_URL = "https://dockets.justia.com/search?courts=ilnd&cases=civil&nos=840" # NOS 840 = Trademark

print(f"📡 启动哨兵 (Sentinel) - 监控源: {TARGET_URL}")

def fetch_justia_cases():
    print("📥 访问 Justia Dockets...")
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    try:
        resp = requests.get(TARGET_URL, headers=headers, timeout=20)
        if resp.status_code != 200:
            print(f"❌ 访问失败: Status {resp.status_code}")
            return []
            
        soup = BeautifulSoup(resp.text, 'html.parser')
        
        # 解析列表
        cases = []
        # Justia 的列表项通常在 .has-padding-content 或 .track-case 类中
        # 具体结构需要适配，通常每一行都是一个 div.result-item 或类似
        # 这里的解析逻辑是针对标准 Justia 搜索结果页的
        
        rows = soup.find_all('div', class_='result-item') # 假设类名，需根据实际调整
        if not rows:
            # 备选选择器
            rows = soup.find_all('div', class_='docket-list-item') 
            
        # 如果还是找不到，尝试更通用的查找
        if not rows:
            print("⚠️ 未找到标准列表项，尝试通用抓取...")
            # 查找所有链接文本包含 "v." 的
            links = soup.find_all('a', string=re.compile(r' v\. '))
            for link in links:
                title = link.get_text(strip=True)
                url = link.get('href')
                # 尝试在上级元素中找案号
                parent_text = link.find_parent('div').get_text() if link.find_parent('div') else ""
                case_no_match = re.search(r'\d{1,2}:\d{2}-cv-\d{3,5}', parent_text)
                
                if case_no_match:
                    cases.append({
                        "case_number": case_no_match.group(0),
                        "case_name": title,
                        "url": url if url.startswith('http') else f"https://dockets.justia.com{url}",
                        "date": datetime.now().strftime("%Y-%m-%d") # 暂用今日
                    })
        else:
            # 标准解析逻辑 (待根据 Justia 实际 HTML 优化)
            for row in rows:
                # 提取逻辑...
                pass

        print(f"✅ 成功从页面提取 {len(cases)} 个潜在案件")
        return cases

    except Exception as e:
        print(f"❌ 抓取异常: {e}")
        return []

def save_to_supabase(case_data):
    """入库操作"""
    # 1. 查重
    res = supabase.table('lawsuits').select('*').eq('case_number', case_data['case_number']).execute()
    if len(res.data) > 0:
        print(f"⏭️ 案件已存在: {case_data['case_number']}")
        return False
    
    # 2. 插入
    # 尝试拆分 Plaintiff
    plaintiff = case_data['case_name'].split(' v. ')[0]
    
    payload = {
        "case_number": case_data['case_number'],
        "plaintiff": plaintiff,
        "court": "N.D. Illinois",
        "law_firm": "Unknown", # 等待 Hunter 补全
        "filed_date": case_data['date'],
        "status": "New Filing",
        "raw_data_url": case_data['url'],
        "risk_score": 88
    }
    
    try:
        supabase.table('lawsuits').insert(payload).execute()
        print(f"✅ 成功入库: {case_data['case_number']} | {plaintiff}")
        return True
    except Exception as e:
        print(f"❌ 入库失败: {e}")
        return False

def main_pipeline():
    # 1. 抓取 Justia
    cases = fetch_justia_cases()
    
    # 2. 如果 Justia 失败，尝试 fallback (这里可以放 Google Search 逻辑)
    if not cases:
        print("⚠️ Justia 返回空，尝试 Google Search API (Fallback)...")
        # TODO: 接入 Serper 作为备选
    
    new_cases_count = 0
    for case in cases:
        if save_to_supabase(case):
            new_cases_count += 1
            
    print("\n" + "="*50)
    print(f"🎉 流程结束. 新入库案件: {new_cases_count}")
    print("="*50)

if __name__ == "__main__":
    main_pipeline()
