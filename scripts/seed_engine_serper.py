import os
import requests
import json
import time
from datetime import datetime

# Serper.dev API配置
SERPER_API_URL = "https://google.serper.dev/search"

# Determine paths relative to this script
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
BRANDS_FILE = os.path.join(PROJECT_ROOT, 'sql', 'brands_1000.json')

# Load .env only if local (optional fallback)
# In GitHub Actions, secrets are injected as env vars, so we check os.environ first
env_path = os.path.join(PROJECT_ROOT, '.env')
if os.path.exists(env_path):
    try:
        with open(env_path, 'r', encoding='utf-8-sig') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    if key.strip() not in os.environ: # Don't overwrite existing env vars
                        os.environ[key.strip()] = value.strip()
    except Exception as e:
        print(f"⚠️ Warning: Could not read .env file: {e}")

SERPER_API_KEY = os.environ.get("SERPER_API_KEY")
SUPABASE_URL = os.environ.get("PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("PUBLIC_SUPABASE_ANON_KEY")
DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY")

# Supabase REST API
REST_URL = f"{SUPABASE_URL}/rest/v1/lawsuits"
HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

def read_brands():
    """读取品牌列表"""
    try:
        with open(BRANDS_FILE, 'r', encoding='utf-8') as f:
            brands = json.load(f)
        return brands if isinstance(brands, list) else []
    except Exception as e:
        print(f"❌ Error reading brands: {e}")
        return []

def check_duplicate(brand_name, case_number):
    """检查是否重复"""
    try:
        query_url = f"{REST_URL}?brand_name=eq.{brand_name}&case_number=eq.{case_number}"
        response = requests.get(query_url, headers=HEADERS, timeout=10)
        if response.status_code == 200:
            existing_records = response.json()
            return len(existing_records) > 0
        return False
    except:
        return False

# DeepSeek API配置
DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions"

if not DEEPSEEK_API_KEY:
    print(f"❌ Error: DEEPSEEK_API_KEY not found in .env")
    exit(1)

def analyze_with_deepseek(brand_name, search_results):
    """
    使用DeepSeek AI通过搜索结果提取案件信息
    """
    try:
        # 准备搜索摘要上下文
        context = ""
        for i, result in enumerate(search_results[:5]): # 只取前5条结果
            context += f"Result {i+1}:\n"
            context += f"Title: {result.get('title', '')}\n"
            context += f"Snippet: {result.get('snippet', '')}\n"
            context += f"Date: {result.get('date', 'Unknown')}\n"
            context += f"Link: {result.get('link', '')}\n\n"

        prompt = f"""
        You are a legal data analyst. Analyze these search results for the brand "{brand_name}" regarding trademark infringement lawsuits (especially Schedule A/SAD cases in N.D. Illinois).

        Search Results:
        {context}

        Task: Extract the most recent and relevant lawsuit details.
        
        Return ONLY a JSON object with these fields:
        - case_number: The specific case number (e.g., "1:24-cv-12345" or "24-cv-12345"). If NOT found, return "Unknown".
        - court: The court name (e.g., "N.D. Illinois"). If unknown but looks like a SAD case, default to "N.D. Illinois".
        - plaintiff: The law firm or plaintiff name.
        - filed_date: The filing date (YYYY-MM-DD). If unknown, use today's date "{datetime.now().strftime('%Y-%m-%d')}".
        - risk_score: Integer 0-100.
            - 90-100: Active TRO/Injunction mentioned or case filed in last 30 days.
            - 70-89: "Lawsuit", "Complaint" mentioned but no specific TRO confirmed.
            - 0-30: No recent lawsuit found.
        - raw_data_url: The most relevant URL from the results.

        JSON Response:
        """

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {DEEPSEEK_API_KEY}"
        }

        data = {
            "model": "deepseek-chat",
            "messages": [
                {"role": "system", "content": "You are a helpful assistant that outputs strict JSON."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.1
        }

        # print(f"  🧠 Asking DeepSeek to analyze...")
        response = requests.post(DEEPSEEK_API_URL, headers=headers, json=data, timeout=20)
        
        if response.status_code != 200:
            print(f"  ⚠️ DeepSeek API error: {response.text}")
            return None

        result = response.json()
        content = result['choices'][0]['message']['content']
        
        # 清理可能的Markdown格式
        content = content.replace('```json', '').replace('```', '').strip()
        
        extraction = json.loads(content)
        return extraction

    except Exception as e:
        print(f"  ❌ DeepSeek extraction error: {e}")
        return None

def extract_with_regex(brand_name, search_results):
    """
    Fallback: 使用正则表达式简单提取信息
    """
    # 简单提取: 检查是否有案号关键词
    has_lawsuit = False
    case_number = "Unknown"
    
    print(f"  🔍 Inspecting {len(search_results)} results:")
    for result in search_results:
        title = result.get('title', '').replace('\n', ' ')
        snippet = result.get('snippet', '').replace('\n', ' ')
        link = result.get('link', '')
        print(f"    - [{title[:30]}...] {snippet[:50]}...")
        
        title_snippet_lower = (title + snippet).lower()
        
        # 检查是否包含诉讼关键词
        if any(keyword in title_snippet_lower for keyword in ['lawsuit', 'trademark', 'infringement', 'tro', 'restraining', 'complaint', 'v.']):
            has_lawsuit = True
            
            # 尝试提取案号 (简单正则)
            import re
            text = title + ' ' + snippet
            # 匹配格式如: 1:24-cv-01234, 24-cv-1234 等
            case_match = re.search(r'\d{1,2}:\d{2}-cv-\d{4,5}', text) or re.search(r'\d{2}-cv-\d{4,5}', text)
            if case_match:
                case_number = case_match.group(0)
            break
    
    if not has_lawsuit:
        return None
    
    return {
        "brand_name": brand_name,
        "case_number": case_number,
        "plaintiff": f"{brand_name} IP Holdings (Est.)",
        "court": "N.D. Illinois (Likely)",
        "filed_date": datetime.now().strftime('%Y-%m-%d'),
        "status": "Potential Risk Detected",
        "risk_score": 70,
        "raw_data_url": search_results[0].get('link', '')
    }

def search_brand_lawsuits(brand_name):
    """
    使用Serper.dev精准搜索 Justia Dockets
    策略：只抓取 Justia 上的公开案件头信息 (Case Header)
    """
    if not SERPER_API_KEY:
        print(f"  ⚠️ Serper API Key未配置,跳过")
        return None
    
    try:
        # 🎯 新策略：Justia 定向打击 - 全网搜索模式
        # Serper 对 site: 指令支持可能有限，改用关键词全网搜
        # 搜索: "Nike" trademark lawsuit Justia
        query = f'"{brand_name}" trademark lawsuit Justia'
        
        payload = {
            "q": query,
            "num": 20, # 抓更多结果，然后我们自己过滤
            "gl": "us",
            "hl": "en"
        }
        
        headers = {
            "X-API-KEY": SERPER_API_KEY,
            "Content-Type": "application/json"
        }
        
        print(f"  🔍 Targeting Justia Dockets for: {brand_name}")
        response = requests.post(SERPER_API_URL, json=payload, headers=headers, timeout=15)
        
        if response.status_code != 200:
            print(f"  ⚠️ Serper returned status {response.status_code}")
            return None
        
        data = response.json()
        organic_results = data.get('organic', [])
        
        if not organic_results:
            print(f"  ⚪ No Justia dockets found")
            return None
        
        # 尝试使用DeepSeek智能解析 Justia 的结果
        extracted_data = None
        if DEEPSEEK_API_KEY:
             # 修改 System Prompt 专门针对 Justia 格式
             # Justia 标题通常是: "Nike, Inc. v. The Partnerships ... :: Justia Dockets"
             print(f"  🧠 Parsing Justia results using DeepSeek...")
             extracted_data = analyze_with_deepseek(brand_name, organic_results)
        
        # ⚠️ Fallback: 正则解析 Justia 格式
        if not extracted_data:
             if DEEPSEEK_API_KEY:
                 print(f"  ⚠️ DeepSeek failed/skipped, using Justia regex parser...")
             
             # Justia Regex Logic
             print(f"  🔍 Inspecting {len(organic_results)} results for Regex extraction:")
             for result in organic_results:
                 title = result.get('title', '').replace('\n', ' ')
                 snippet = result.get('snippet', '').replace('\n', ' ')
                 link = result.get('link', '')
                 print(f"    - [{title[:30]}...] {snippet[:50]}...")
                 
                 # 提取案号: 尝试在标题和摘要中查找
                 import re
                 text = title + ' ' + snippet
                 
                 # 宽松匹配: 
                 # 1. 标准: 1:24-cv-12345
                 # 2. Justia变体: 2:2025cv02325 (4位年份, 无dash)
                 # 3. 简写: 24-cv-12345
                 case_match = re.search(r'(\d{1,2}:\d{2,4}[- ]?cv[- ]?\d{4,6})', text, re.IGNORECASE) or \
                              re.search(r'(\d{2,4}[- ]?cv[- ]?\d{4,6})', text, re.IGNORECASE)
                 
                 # 如果找不到 cv 格式，尝试找 "Case No. 12345" 这种简单格式 (风险较高，需谨慎)
                 
                 if case_match:
                     print(f"    ✅ Regex matched: {case_match.group(1)}")
                     extracted_data = {
                        "brand_name": brand_name,
                        "case_number": case_match.group(1),
                        "plaintiff": f"{brand_name}", 
                        "court": "N.D. Illinois (Likely)", 
                        "filed_date": datetime.now().strftime('%Y-%m-%d'), 
                        "status": "Active Litigation",
                        "risk_score": 80, 
                        "raw_data_url": link
                     }
                     break

        if not extracted_data:
            return None
            
        # 必须包含品牌名
        extracted_data['brand_name'] = brand_name
        
        return extracted_data
        
    except Exception as e:
        print(f"  ❌ Error searching: {e}")
        return None

def seed_database(limit=None):
    """
    主函数: 抓取品牌数据
    """
    print(f"🔌 Connecting to Supabase: {SUPABASE_URL[:30]}...")
    print(f"🔍 Using Serper.dev Google Search API")
    print(f"⏰ Request delay: 3 seconds per brand\n")
    
    brands = read_brands()
    if limit:
        brands = brands[:limit]
    
    print(f"📖 Found {len(brands)} brands to process\n")
    
    success_count = 0
    duplicate_count = 0
    failed_count = 0
    
    for index, brand in enumerate(brands, 1):
        print(f"-----------------------------------")
        print(f"🚀 Processing [{index}/{len(brands)}]: {brand}")
        
        # 使用Serper搜索
        lawsuit_data = search_brand_lawsuits(brand)
        
        if lawsuit_data:
            # 去重检查
            is_duplicate = check_duplicate(lawsuit_data['brand_name'], lawsuit_data['case_number'])
            
            if is_duplicate:
                print(f"  ⏭️ DUPLICATE SKIPPED")
                duplicate_count += 1
            else:
                try:
                    response = requests.post(REST_URL, headers=HEADERS, json=lawsuit_data)
                    if response.status_code in [200, 201]:
                        print(f"  ✅ NEW DATA INSERTED")
                        print(f"     Case: {lawsuit_data['case_number']}, Risk: {lawsuit_data['risk_score']}")
                        success_count += 1
                    else:
                        print(f"  ❌ Failed to insert: {response.text[:100]}")
                        failed_count += 1
                except Exception as e:
                    print(f"  ❌ Database error: {e}")
                    failed_count += 1
        else:
            print(f"  ⚪ No lawsuit data found")
            failed_count += 1
        
        # 延迟3秒
        if index < len(brands):
            print(f"  ⏳ Waiting 3 seconds...")
            time.sleep(3)
    
    print("\n" + "="*60)
    print(f"🎉 Seeding Complete!")
    print(f"📊 Results:")
    print(f"   ✅ Successfully inserted: {success_count}")
    print(f"   ⏭️ Duplicates skipped: {duplicate_count}")
    print(f"   ❌ Failed/No data: {failed_count}")
    print(f"   📈 Total processed: {len(brands)}")
    print(f"\n🌐 Visit: https://jaxfamlaw.com/compliance/Nike")
    print("="*60)

if __name__ == "__main__":
    # 全量模式: 处理所有品牌
    seed_database()
