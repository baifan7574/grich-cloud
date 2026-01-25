
import os
import random
import time
from datetime import datetime, timedelta
from dotenv import load_dotenv
from supabase import create_client, Client

# 动态路径：自动定位项目根目录的 grich-astro/.env
script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(script_dir)  # scripts/ 的上一级
env_path = os.path.join(project_root, 'grich-astro', '.env')
load_dotenv(env_path)

url: str = os.environ.get("PUBLIC_SUPABASE_URL")
key: str = os.environ.get("PUBLIC_SUPABASE_ANON_KEY")

if not url or not key:
    print(f"❌ Error: Supabase credentials not found in {env_path}")
    print("Please check if .env file exists and has content.")
    exit(1)

try:
    supabase: Client = create_client(url, key)
except Exception as e:
    print(f"❌ Error connecting to Supabase: {e}")
    exit(1)

KEYWORDS_FILE = os.path.join(project_root, 'sql', 'keywords_soeasy.txt')

def read_keywords():
    try:
        with open(KEYWORDS_FILE, 'r', encoding='utf-8') as f:
            lines = [line.strip() for line in f.readlines() if line.strip()]
        return lines
    except Exception as e:
        print(f"❌ Error reading keywords file: {e}")
        return []

def get_mock_legal_data(brand_name):
    """
    Simulates fetching legal data from an API (e.g., Serper/CourtListener).
    In Phase 2 Step 2, we will replace this with real API calls.
    """
    # Simulate API latency
    time.sleep(0.5)
    
    # 30% chance of having a lawsuit for this demo
    has_lawsuit = random.random() < 0.3
    
    if not has_lawsuit:
        return None

    # Generate realistic-looking case data
    courts = ["N.D. Illinois", "S.D. New York", "S.D. Florida", "E.D. Texas"]
    plaintiffs = [f"{brand_name} IP Holdings LLC", f"{brand_name} Brand Protection", f"{brand_name} International"]
    case_year = 2026
    case_seq = random.randint(100, 9999)
    case_number = f"1:{case_year}-cv-{case_seq:05d}"
    
    return {
        "brand_name": brand_name,
        "case_number": case_number,
        "plaintiff": random.choice(plaintiffs),
        "court": random.choice(courts),
        "filed_date": (datetime.now() - timedelta(days=random.randint(1, 30))).strftime('%Y-%m-%d'),
        "status": "Injunction Granted" if random.random() > 0.5 else "Filed",
        "risk_score": random.randint(70, 99),
        "raw_data_url": f"https://www.courtlistener.com/docket/{random.randint(100000,999999)}/{brand_name.lower().replace(' ','-')}"
    }

def seed_database():
    print(f"🔌 Connecting to Supabase: {url[:20]}...")
    
    keywords = read_keywords()
    print(f"📖 Found {len(keywords)} keywords in input file.")
    
    # Pre-seed Nike as a guaranteed hit for testing
    nike_data = {
        "brand_name": "Nike",
        "case_number": "1:26-cv-00888",
        "plaintiff": "Nike, Inc.",
        "court": "N.D. Illinois",
        "filed_date": datetime.now().strftime('%Y-%m-%d'),
        "status": "TRO Granted",
        "risk_score": 98,
        "raw_data_url": "https://www.courtlistener.com/docket/mock/nike"
    }
    
    print("\n-----------------------------------")
    print(f"🚀 Processing: Nike (Guaranteed Test Case)")
    try:
        # First checking if it exists to avoid duplicate constraint errors if run multiple times
        # Ideally we'd upsert, but for simple seeding insert is okay if we ignore error or delete first
        # Let's try to upsert if possible or just insert
        data, count = supabase.table('lawsuits').upsert(nike_data, on_conflict='brand_name').execute() 
        # Note: Upsert requires 'brand_name' unique constraint, which we might not have set. 
        # Fallback to insert.
    except:
        try:
             data, count = supabase.table('lawsuits').insert(nike_data).execute()
        except Exception as e:
             # Just print warning, might be duplicate
             print(f"⚠️ Notice: Nike data might already exist: {e}")

    print(f"✅ Executed Nike data insert: Risk Score 98")
    

    # Process other keywords
    for keyword in keywords[:10]: # Limit to first 10 for safety test
        if keyword.lower() == 'nike': continue
        
        print(f"🔍 Scanning: {keyword}...")
        legal_data = get_mock_legal_data(keyword)
        
        if legal_data:
            try:
                data, count = supabase.table('lawsuits').insert(legal_data).execute()
                print(f"✅ FOUND RISK! Inserted data for {keyword} (Score: {legal_data['risk_score']})")
            except Exception as e:
                print(f"❌ Failed to insert {keyword}: {e}")
        else:
            print(f"⚪ No active lawsuits found for {keyword}")

    print("\n🎉 Seeding Complete!")
    print("Now visit: https://jaxfamlaw.com/compliance/Nike")

if __name__ == "__main__":
    seed_database()
