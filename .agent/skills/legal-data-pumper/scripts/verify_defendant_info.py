import requests
import json
import os

# 读取环境变量# 动态路径
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
    print(f"Error reading .env file: {e}")
    exit(1)

SUPABASE_URL = env_vars.get("PUBLIC_SUPABASE_URL")
SUPABASE_KEY = env_vars.get("PUBLIC_SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print(f"Error: Missing Supabase credentials in .env file\nURL: {SUPABASE_URL}\nKEY: {SUPABASE_KEY}")
    exit(1)

REST_URL = f"{SUPABASE_URL}/rest/v1/lawsuits"
HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

print("="*70)
print("验证：引擎2是否抓到了被告人信息？")
print("="*70)
print()

try:
    # 获取所有数据
    response = requests.get(REST_URL, headers=HEADERS, timeout=10)
    
    if response.status_code != 200:
        print(f"数据库连接失败: {response.status_code}")
        print(response.text)
        exit(1)
        
    data = response.json()
    
    print(f"数据库总记录: {len(data)} 条")
    print()
    
    # 1. 检查数据库表结构
    print("第一步：检查数据库表结构")
    print("-" * 70)
    if len(data) > 0:
        sample = data[0]
        print("字段列表:")
        for key in sample.keys():
            print(f"  - {key}")
        print()
        
        # 检查是否有被告人相关字段
        defendant_fields = [k for k in sample.keys() if 'defendant' in k.lower()]
        if defendant_fields:
            print(f"发现被告人字段: {defendant_fields}")
        else:
            print("没有发现 'defendant' 相关字段")
        print()
    
    # 2. 分析引擎2的数据
    print("第二步：分析引擎2（律所狙击）的数据")
    print("-" * 70)
    
    courtlistener_data = [r for r in data if 'courtlistener' in str(r.get('raw_data_url', '')).lower()]
    print(f"引擎2数据量: {len(courtlistener_data)} 条")
    print()
    
    if len(courtlistener_data) > 0:
        print("引擎2数据样本（前3条）:")
        for i, record in enumerate(courtlistener_data[:3], 1):
            print(f"\n样本 {i}:")
            print(f"  品牌: {record.get('brand_name', 'N/A')}")
            print(f"  案号: {record.get('case_number', 'N/A')}")
            print(f"  原告: {record.get('plaintiff', 'N/A')}")
            print(f"  法院: {record.get('court', 'N/A')}")
            print(f"  状态: {record.get('status', 'N/A')}")
            
            # 关键：检查是否有被告人信息
            if 'defendant' in record:
                print(f"  被告人: {record.get('defendant', 'N/A')}")
            elif 'defendants' in record:
                print(f"  被告人列表: {record.get('defendants', 'N/A')}")
            else:
                print(f"  无被告人信息")
            
            print(f"  数据源: {record.get('raw_data_url', 'N/A')[:60]}...")
    else:
        print("没有找到引擎2的数据")
    
    print()
    
    # 3. 检查所有数据中是否有被告人信息
    print("第三步：全局检查被告人信息")
    print("-" * 70)
    
    has_defendant_count = 0
    for record in data:
        if record.get('defendant') or record.get('defendants'):
            has_defendant_count += 1
    
    print(f"包含被告人信息的记录: {has_defendant_count} / {len(data)}")
    print(f"比例: {has_defendant_count/len(data)*100:.1f}%")
    print()
    
    if has_defendant_count > 0:
        print("数据库中有被告人信息！")
        print("\n示例记录:")
        for record in data:
            if record.get('defendant') or record.get('defendants'):
                print(f"  品牌: {record.get('brand_name')}")
                print(f"  被告人: {record.get('defendant') or record.get('defendants')}")
                break
    else:
        print("数据库中没有被告人信息")
        print("\n可能的原因:")
        print("  1. 引擎2还没有真正运行")
        print("  2. 引擎2运行了但没有成功抓取被告人信息")
        print("  3. 数据库表结构中没有设计被告人字段")
    
    print()
    print("=" * 70)
    print("验证完成")
    print("=" * 70)

except Exception as e:
    print(f"验证失败: {e}")
    import traceback
    traceback.print_exc()
