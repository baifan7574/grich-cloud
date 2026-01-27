import feedparser
import requests
import json
import os
import re
from datetime import datetime
from bs4 import BeautifulSoup
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

# 2. 目标 RSS 源 (ILND: N.D. Illinois)
RSS_URL = "https://www.courtlistener.com/dockets/rss/?court=ilnd"

# 3. 关键词过滤
KEYWORDS = ["Trademark", "Copyright", "Counterfeit", "Infringement"]

print(f"📡 启动哨兵 (Sentinel) - 监控源: {RSS_URL}")

def fetch_rss_feed():
    print("📥 获取 RSS 数据...")
    feed = feedparser.parse(RSS_URL)
    
    if feed.bozo:
        print(f"❌ RSS 解析错误: {feed.bozo_exception}")
        return []
    
    print(f"✅ 成功获取 {len(feed.entries)} 条最近更新")
    return feed.entries

def extract_case_info(entry):
    """从 RSS 条目中提炼基础信息"""
    title = entry.title
    link = entry.link
    description = entry.description
    
    # 提取案号 (e.g., 1:26-cv-00123)
    case_number_match = re.search(r'\d{1,2}:\d{2}-cv-\d{5}', title)
    case_number = case_number_match.group(0) if case_number_match else None
    
    if not case_number:
        # 有些 RSS 标题不含标准案号，尝试从链接或描述中找
        return None

    # 提取原告与被告 (简单分割，后续需增强)
    # 假设标题格式: "CaseName (1:26-cv-XXXXX)" 
    # 或者 "Plaintiff v. Defendant"
    case_name = title.split('(')[0].strip()
    
    # 判断是否包含关键词
    is_relevant = any(kw.lower() in title.lower() or kw.lower() in description.lower() for kw in KEYWORDS)
    
    if not is_relevant:
        return None

    return {
        "case_number": case_number,
        "case_name": case_name,
        "rss_url": link,
        "summary": description,
        "published": entry.published
    }

def get_law_firm_google_fallback(plaintiff_name):
    """(Fallback) 通过 Google 搜索尝试推断律所"""
    # 比如搜索 "PlaintiffName trademark lawsuit law firm"
    # 这里为了演示，暂时返回 Unknown，生产环境可接入 Serper
    return "Unknown (Needs Audit)"

def enhance_case_data(case_info):
    """
    第二步：情报补全
    去详情页抓取 Law Firm 和 Defendant
    """
    print(f"🔍 正在增强情报: {case_info['case_number']}")
    
    # 模拟访问详情页 (实际生产需接入 Playwright/Puppeteer)
    # 这里先使用 requests 尝试获取页面 HTML，如果通过普通请求能拿到最好
    # 很多 details 页面需要 JS 渲染，这里作为 V1 MVP，我们先做基础爬取
    
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        resp = requests.get(case_info['rss_url'], headers=headers, timeout=10)
        soup = BeautifulSoup(resp.text, 'html.parser')
        
        # 尝试提取律所
        # CourtListener 页面结构经常变，这里需要针对性选择器
        # 假设律所通常在 Counsel 部分
        law_firm = "Unknown"
        # TODO: 使用 Playwright 实现精准提取 (Next iteration)
        
        # 补全数据
        case_info['law_firm'] = law_firm
        case_info['plaintiff'] = case_info['case_name'].split(' v. ')[0] if ' v. ' in case_info['case_name'] else case_info['case_name']
        case_info['court'] = "N.D. Illinois"
        case_info['status'] = "New Filing"
        
        # 如果律所未知，标记需要人工审计
        if law_firm == "Unknown":
            case_info['status'] = "Needs Manual Audit"
            
        return case_info

    except Exception as e:
        print(f"⚠️ 增强失败: {e}")
        return case_info

def save_to_supabase(case_data):
    """入库操作"""
    # 1. 查重
    res = supabase.table('lawsuits').select('*').eq('case_number', case_data['case_number']).execute()
    if len(res.data) > 0:
        print(f"⏭️ 案件已存在: {case_data['case_number']}")
        return False
    
    # 2. 插入
    payload = {
        "case_number": case_data['case_number'],
        "plaintiff": case_data['plaintiff'],
        "court": case_data['court'],
        "law_firm": case_data.get('law_firm', 'Unknown'),
        "filed_date": datetime.now().strftime("%Y-%m-%d"), # 近似为抓取日
        "status": case_data.get('status', 'Active'),
        "raw_data_url": case_data['rss_url'],
        "risk_score": 90
    }
    
    try:
        supabase.table('lawsuits').insert(payload).execute()
        print(f"✅ 成功入库: {case_data['case_number']} | {case_data['plaintiff']}")
        return True
    except Exception as e:
        print(f"❌ 入库失败: {e}")
        return False

def main_pipeline():
    entries = fetch_rss_feed()
    
    new_cases_count = 0
    
    for entry in entries:
        # Step 1: 基础筛选
        basic_info = extract_case_info(entry)
        if not basic_info:
            continue
            
        # Step 2: 增强数据
        full_data = enhance_case_data(basic_info)
        
        # Step 3: 入库
        if save_to_supabase(full_data):
            new_cases_count += 1
            
    print("\n" + "="*50)
    print(f"🎉 流程结束. 新入库案件: {new_cases_count}")
    print("="*50)

if __name__ == "__main__":
    main_pipeline()
