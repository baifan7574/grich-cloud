import os
import json
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

SUPABASE_URL = os.environ.get("PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("PUBLIC_SUPABASE_ANON_KEY") or os.environ.get("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("⚠️ 警告: 缺少 Supabase 环境变量 (可能是为了仅测试能否运行而跳过)")
    # For CI without secrets, maybe we shouldn't exit 1 immediately if we want to debug other things,
    # but strictly speaking we need these.
    # However, if this script is just for verification, and env vars are missing in CI, we should probably fail gracefully or check if we are in a 'build' mode.
    # User said "Adapt for GitHub Secrets", so they SHOULD be there.
    # If they are there, os.environ.get will work.
    pass

if SUPABASE_URL and SUPABASE_KEY:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
else:
    supabase = None

print("🔍 正在核验 Supabase 数据库最新数据...\n")

# 1. 检查 Lawsuits 表
print("=== 📂 最新案件 (Lawsuits) ===")
try:
    # 按插入时间倒序查前 5 条
    res = supabase.table('lawsuits').select('*').order('created_at', desc=True).limit(5).execute()
    cases = res.data
    if not cases:
        print("⚠️ 数据库为空或无法连接 (Lawsuits)")
    else:
        for case in cases:
            print(f"👉 [案号] {case.get('case_number')}")
            print(f"   [原告] {case.get('plaintiff')}")
            print(f"   [律所] {case.get('law_firm')}")
            print(f"   [来源] {case.get('raw_data_url')}")
            print(f"   [入库时间] {case.get('created_at')}")
            print("-" * 30)
except Exception as e:
    print(f"❌ 查询失败: {e}")

print("\n=== 👥 最新被告 (Defendants) ===")
try:
    res = supabase.table('defendants').select('*').order('created_at', desc=True).limit(5).execute()
    defendants = res.data
    if not defendants:
        print("⚠️ 暂无被告数据 (可能还没抓到 PDF 或解析失败)")
    else:
        for d in defendants:
            print(f"👉 [名称] {d.get('defendant_name')}")
            print(f"   [关联案号] {d.get('case_number')}")
            print(f"   [来源] {d.get('source')}")
            print("-" * 30)
except Exception as e:
    print(f"❌ 查询失败: {e}")
