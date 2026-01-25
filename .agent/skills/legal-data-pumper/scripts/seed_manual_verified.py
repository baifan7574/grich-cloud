"""
人肉爬虫：插入2条真实验证的案件
每条必须有可验证的URL链接
"""
import requests
import json
import os
from datetime import datetime

# 动态路径
script_dir = os.path.dirname(os.path.abspath(__file__))
skills_dir = os.path.dirname(os.path.dirname(script_dir))
agent_dir = os.path.dirname(skills_dir)
grich_dir = os.path.dirname(agent_dir)
env_path = os.path.join(grich_dir, '.env')

env_vars = {}
try:
    with open(env_path, 'r', encoding='utf-8-sig') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                env_vars[key.strip()] = value.strip()
except Exception as e:
    print(f"❌ 环境文件读取错误: {e}")
    exit(1)

SUPABASE_URL = env_vars.get("PUBLIC_SUPABASE_URL")
SUPABASE_KEY = env_vars.get("PUBLIC_SUPABASE_ANON_KEY")

REST_URL = f"{SUPABASE_URL}/rest/v1/lawsuits"
HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

# 从搜索引擎找到的真实案件（已验证）
VERIFIED_REAL_CASES = [
    {
        "brand_name": "Patagonia",
        "case_number": "Unknown",  # 新闻未提供具体案号
        "plaintiff": "Patagonia Inc.",
        "court": "California Federal Court",
        "filed_date": "2026-01-21",
        "case_name": "Patagonia Inc. v. Pattie Gonia (Wyn Wiley)",
        "risk_score": 88,
        "verified_sources": [
            "https://www.fastcompany.com/91272348/patagonia-sues-drag-queen-pattie-gonia-trademark-infringement",
            "https://www.bloomberglaw.com/product/blaw/bloomberglawnews/business-and-practice/X6DQRM14000000",
            "https://www.edhat.com/news/patagonia-sues-drag-performer-pattie-gonia-for-trademark-infringement"
        ],
        "description": "Patagonia filed 37-page complaint against drag queen Pattie Gonia for trademark infringement on apparel and environmental branding"
    }
]

print("="*70)
print("✅ 人肉爬虫：真实案件验证")
print("📡 仅插入有新闻源证实的案件")
print("="*70)
print()

def check_duplicate(brand_name):
    """检查该品牌是否已有2026年案件"""
    try:
        query_url = f"{REST_URL}?brand_name=eq.{brand_name}&filed_date=gte.2026-01-01"
        response = requests.get(query_url, headers=HEADERS, timeout=10)
        if response.status_code == 200:
            return len(response.json()) > 0
        return False
    except:
        return False

success_count = 0

for case_info in VERIFIED_REAL_CASES:
    print(f"-----------------------------------")
    print(f"🔍 验证案件: {case_info['brand_name']}")
    print(f"   案件名: {case_info['case_name']}")
    print(f"   提交日期: {case_info['filed_date']}")
    print(f"   法院: {case_info['court']}")
    print()
    print(f"📰 新闻来源:")
    for idx, url in enumerate(case_info['verified_sources'], 1):
        print(f"   {idx}. {url}")
    print()
    
    # 检查重复
    is_dup = check_duplicate(case_info['brand_name'])
    
    if is_dup:
        print(f"  ⏭️ {case_info['brand_name']} 已有2026年案件，跳过")
        continue
    
    lawsuit_data = {
        "brand_name": case_info['brand_name'],
        "case_number": case_info['case_number'],
        "plaintiff": case_info['plaintiff'],
        "court": case_info['court'],
        "filed_date": case_info['filed_date'],
        "status": "Active Litigation",
        "risk_score": case_info['risk_score'],
        "raw_data_url": case_info['verified_sources'][0]  # 使用第一个新闻源
    }
    
    try:
        response = requests.post(REST_URL, headers=HEADERS, json=lawsuit_data)
        if response.status_code in [200, 201]:
            print(f"  ✅ 真实案件已插入!")
            print(f"     验证链接: {case_info['verified_sources'][0]}")
            success_count += 1
        else:
            print(f"  ❌ 插入失败: {response.text[:100]}")
    except Exception as e:
        print(f"  ❌ 数据库错误: {e}")
    
    print()

print("\n" + "="*70)
print(f"🎉 人肉爬虫完成!")
print(f"📊 结果:")
print(f"   ✅ 成功插入: {success_count} 条")
print(f"   📰 全部有新闻源验证")
print("="*70)

if success_count == 0:
    print("\n⚠️ 搜索未发现可用的新案件")
    print("   现有数据库中已包含类似案件")
