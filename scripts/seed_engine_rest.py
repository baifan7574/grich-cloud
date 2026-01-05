
import os
import random
import time
import requests
import json
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Load environment variables
env_path = r'd:\quicktoolshub\雷达监控。\GRICH\grich-astro\.env'
load_dotenv(env_path)

url: str = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key: str = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

if not url or not key:
    print(f"❌ Error: Supabase credentials not found in {env_path}")
    exit(1)

# Construct REST API endpoint
REST_URL = f"{url}/rest/v1/lawsuits"
HEADERS = {
    "apikey": key,
    "Authorization": f"Bearer {key}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

KEYWORDS_FILE = r'd:\quicktoolshub\雷达监控。\GRICH\sql\initial_keywords.json'

def read_keywords():
    try:
        with open(KEYWORDS_FILE, 'r', encoding='utf-8') as f:
            brands = json.load(f)
        # Ensure it's a list
        if isinstance(brands, list):
            return brands
        return []
    except Exception as e:
        print(f"❌ Error reading keywords file: {e}")
        return []

def get_mock_legal_data(brand_name):
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
    print(f"🔌 Connecting to Supabase REST API: {url[:20]}...")
    
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
        response = requests.post(REST_URL, headers=HEADERS, json=nike_data)
        if response.status_code in [200, 201]:
            print(f"✅ Inserted Nike data: Risk Score 98")
        else:
            print(f"⚠️ Error inserting Nike: {response.text}")
    except Exception as e:
        print(f"⚠️ Network Error inserting Nike: {e}")

    # Process other keywords
    for keyword in keywords[:10]: # Limit to first 10 for safety test
        if keyword.lower() == 'nike': continue
        
        print(f"🔍 Scanning: {keyword}...")
        legal_data = get_mock_legal_data(keyword)
        
        if legal_data:
            try:
                response = requests.post(REST_URL, headers=HEADERS, json=legal_data)
                if response.status_code in [200, 201]:
                    print(f"✅ FOUND RISK! Inserted data for {keyword} (Score: {legal_data['risk_score']})")
                else:
                    print(f"❌ Failed to insert {keyword}: {response.text}")
            except Exception as e:
                print(f"❌ Failed to insert {keyword}: {e}")
        else:
            print(f"⚪ No active lawsuits found for {keyword}")

    print("\n🎉 Seeding Complete!")
    print("Now visit: https://jaxfamlaw.com/compliance/Nike")

if __name__ == "__main__":
    seed_database()
