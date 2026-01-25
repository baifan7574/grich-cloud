import requests
import json

# Supabase 配置
SUPABASE_URL = "https://rdlmumybuwveaaeceohj.supabase.co"
SUPABASE_KEY = "sb_publishable_aPXWTauRxJ88A88mwLDoPQ_puVi7PZj"

url = f"{SUPABASE_URL}/rest/v1/lawsuits?select=*"
headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}"
}

print("="*70)
print("📊 查询 Supabase 数据库中的诉讼案件")
print("="*70)
print()

response = requests.get(url, headers=headers)

if response.status_code == 200:
    data = response.json()
    print(f"✅ 成功查询到 {len(data)} 条案件记录\n")
    
    for idx, case in enumerate(data, 1):
        print(f"{idx}. 品牌: {case.get('brand_name')}")
        print(f"   案件号: {case.get('case_number')}")
        print(f"   法院: {case.get('court')}")
        print(f"   风险评分: {case.get('risk_score')}")
        print(f"   状态: {case.get('status')}")
        print(f"   提交日期: {case.get('filed_date')}")
        print(f"   来源: {case.get('raw_data_url', '')[:60]}...")
        print()
else:
    print(f"❌ 查询失败: {response.status_code}")
    print(response.text)
