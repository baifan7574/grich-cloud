"""
直接查询 defendants 表验证数据
"""
import requests
import json
import os

# 读取环境变量
script_dir = os.path.dirname(os.path.abspath(__file__))
grich_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(script_dir))))
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

DEFENDANTS_URL = f"{SUPABASE_URL}/rest/v1/defendants"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

print("="*70)
print("🔍 查询 defendants 表 - 案号: 12-cv-4316")
print("="*70)
print()

try:
    # 查询案号为 12-cv-4316 的前5条记录
    query_url = f"{DEFENDANTS_URL}?case_number=eq.12-cv-4316&limit=5&select=defendant_name,store_url,platform,brand_name,case_number"
    
    response = requests.get(query_url, headers=HEADERS, timeout=10)
    
    if response.status_code == 200:
        data = response.json()
        
        if len(data) > 0:
            print(f"✅ 找到 {len(data)} 条记录\n")
            print("="*70)
            
            for i, record in enumerate(data, 1):
                print(f"\n记录 {i}:")
                print(f"  品牌名称: {record.get('brand_name')}")
                print(f"  案号: {record.get('case_number')}")
                print(f"  被告名称: {record.get('defendant_name')}")
                print(f"  平台: {record.get('platform')}")
                print(f"  店铺链接: {record.get('store_url')}")
                print("-"*70)
            
            print("\n" + "="*70)
            print("✅ 数据验证成功！defendants 表中确实存在真实数据")
            print("="*70)
        else:
            print("❌ 没有找到记录")
            print("可能原因：数据尚未插入或案号不匹配")
    else:
        print(f"❌ 查询失败: {response.status_code}")
        print(response.text)
        
except Exception as e:
    print(f"❌ 查询错误: {e}")
