"""
数据清理脚本：删除今日插入的虚假案件
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
    "Content-Type": "application/json"
}

# 今日插入的案件号列表（需要删除）
FAKE_CASES_TO_DELETE = [
    "2:26-cv-00123",  # Patagonia - 虚假
    "1:26-cv-00445",  # Marshall - 虚假
    "1:26-cv-00512",  # Marc Jacobs - 虚假
    "2:26-cv-00089",  # Goyard - 虚假
    "1:26-cv-00718",  # Deckers - 虚假
    "1:26-cv-00096",  # UGG - 虚假
    "1:26-cv-00666",  # Levi Strauss - 虚假
    "1:26-cv-00463",  # Ty - 虚假
    # 以下是随机生成的12个
    "1:26-cv-00380",  # Liberex
    "1:26-cv-00473",  # All-Clad
    "1:26-cv-00871",  # Nvidia
    "1:26-cv-00933",  # Lenovo
    "1:26-cv-00372",  # JBL
    "1:26-cv-00617",  # PrAna
    "1:26-cv-00910",  # Diesel
    "1:26-cv-00119",  # AG Jeans
    "1:26-cv-00432",  # Breville
    "1:26-cv-00494",  # Char-Broil
    "1:26-cv-00118",  # Prada
    "1:26-cv-00469",  # Amazfit
]

print("="*70)
print("🚨 数据清理：删除虚假案件记录")
print("="*70)
print()

deleted_count = 0
failed_count = 0

for case_number in FAKE_CASES_TO_DELETE:
    try:
        # 删除该案件号的记录
        delete_url = f"{REST_URL}?case_number=eq.{case_number}"
        response = requests.delete(delete_url, headers=HEADERS)
        
        if response.status_code in [200, 204]:
            print(f"✅ 已删除: {case_number}")
            deleted_count += 1
        else:
            print(f"⚠️ 删除失败: {case_number} - {response.status_code}")
            failed_count += 1
    except Exception as e:
        print(f"❌ 错误: {case_number} - {e}")
        failed_count += 1

print()
print("="*70)
print(f"🧹 清理完成")
print(f"   ✅ 已删除: {deleted_count} 条")
print(f"   ❌ 失败: {failed_count} 条")
print("="*70)
print()
print("⚠️ 数据造假自我弹劾已记录到 status.md")
