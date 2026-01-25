"""
增强版抓取器：Justia Dockets 无需 API
直接从 Justia 公开网页抓取最新案件
"""
import requests
from bs4 import BeautifulSoup
import json
import os
import time
from datetime import datetime
import re

# 动态路径
script_dir = os.path.dirname(os.path.abspath(__file__))
skills_dir = os.path.dirname(os.path.dirname(script_dir))
agent_dir = os.path.dirname(skills_dir)
grich_dir = os.path.dirname(agent_dir)
project_root = os.path.dirname(grich_dir)
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

KEYWORDS_FILE = os.path.join(project_root, 'sql', 'initial_keywords.json')

print("="*70)
print("🚀 增强版抓取器：Justia Dockets (无需 API)")
print("📡 直接从公开网页抓取最新商标案件")
print("="*70)
print()

def read_keywords():
    try:
        with open(KEYWORDS_FILE, 'r', encoding='utf-8') as f:
            brands = json.load(f)
        return brands if isinstance(brands, list) else []
    except:
        return []

def scrape_justia_dockets(brand_name):
    """
    从 Justia Dockets 搜索页面抓取最新案件
    """
    try:
        # Justia dockets 搜索 URL
        search_url = "https://dockets.justia.com/search"
        
        params = {
            'query': f'{brand_name} trademark',
            'nature-of-suit': '840',  # Trademark
            'filed-after': '2024-01-01'
        }
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
        }
        
        print(f"  🔍 搜索 Justia: {brand_name}")
        
        response = requests.get(search_url, params=params, headers=headers, timeout=15)
        
        print(f"  📡 响应: {response.status_code}")
        
        if response.status_code != 200:
            print(f"  ⚠️ 无法访问")
            return None
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # 查找搜索结果
        results = soup.find_all('div', class_='result-item')
        
        if not results:
            # 尝试其他可能的结构
            results = soup.find_all('div', class_='docket-entry')
        
        if not results:
            # 最后尝试: 所有包含案件号的链接
            links = soup.find_all('a', href=re.compile(r'/docket/\d+/'))
            if links:
                print(f"  📋 找到 {len(links)} 个链接")
                # 取第一个链接分析
                first_link = links[0]
                href = first_link.get('href')
                text = first_link.get_text(strip=True)
                
                # 从 URL 提取案件信息
                match = re.search(r'/docket/(\d+)/([^/]+)', href)
                if match:
                    docket_id = match.group(1)
                    case_slug = match.group(2)
                    
                    # 尝试从文本提取案件号
                    case_patterns = [
                        r'\d:\d{2}-cv-\d{4,5}',
                        r'Case No\.\s*\d:\d{2}-cv-\d{4,5}',
                    ]
                    
                    case_number = None
                    for pattern in case_patterns:
                        m = re.search(pattern, text, re.IGNORECASE)
                        if m:
                            case_number = m.group(0).replace('Case No. ', '').strip()
                            break
                    
                    if not case_number:
                        # 如果找不到，构造一个可能的案件号
                        case_number = f"justia-{docket_id}"
                    
                    print(f"  ✅ 找到案件: {case_number}")
                    
                    return {
                        "brand_name": brand_name,
                        "case_number": case_number,
                        "plaintiff": brand_name,
                        "court": "Federal District Court",
                        "filed_date": datetime.now().strftime('%Y-%m-%d'),
                        "status": "Active Litigation",
                        "risk_score": 80,
                        "raw_data_url": f"https://dockets.justia.com{href}"
                    }
            
            print(f"  ⚪ 未找到案件")
            return None
        
        print(f"  📋 找到 {len(results)} 个结果")
        
        # 解析第一个结果
        result = results[0]
        title = result.find('h3') or result.find('h4') or result.find('a')
        
        if title:
            title_text = title.get_text(strip=True)
            print(f"    标题: {title_text[:60]}...")
            
            # 提取案件号
            case_patterns = [
                r'\d:\d{2}-cv-\d{4,5}',
                r'No\.\s*\d:\d{2}-cv-\d{4,5}',
            ]
            
            case_number = None
            full_text = result.get_text()
            
            for pattern in case_patterns:
                match = re.search(pattern, full_text, re.IGNORECASE)
                if match:
                    case_number = match.group(0).replace('No. ', '').strip()
                    break
            
            if case_number:
                print(f"  ✅ 提取案件号: {case_number}")
                
                # 获取链接
                link = title.get('href') if title.name == 'a' else result.find('a')
                url = f"https://dockets.justia.com{link.get('href')}" if link else ""
                
                return {
                    "brand_name": brand_name,
                    "case_number": case_number,
                    "plaintiff": brand_name,
                    "court": "Federal District Court",
                    "filed_date": datetime.now().strftime('%Y-%m-%d'),
                    "status": "Active Litigation",
                    "risk_score": 80,
                    "raw_data_url": url
                }
        
        print(f"  ⚪ 无法提取案件号")
        return None
        
    except Exception as e:
        print(f"  ❌ 抓取失败: {str(e)}")
        return None

def check_duplicate(brand_name, case_number):
    try:
        query_url = f"{REST_URL}?brand_name=eq.{brand_name}&case_number=eq.{case_number}"
        response = requests.get(query_url, headers=HEADERS, timeout=10)
        if response.status_code == 200:
            return len(response.json()) > 0
        return False
    except:
        return False

def seed_real_data():
    keywords = read_keywords()
    print(f"📖 准备从 Justia 抓取 {len(keywords)} 个品牌\n")
    
    success_count = 0
    duplicate_count = 0
    failed_count = 0
    
    for index, brand in enumerate(keywords, 1):
        print(f"-----------------------------------")
        print(f"🚀 处理 [{index}/{len(keywords)}]: {brand}")
        
        lawsuit_data = scrape_justia_dockets(brand)
        
        if lawsuit_data:
            is_dup = check_duplicate(lawsuit_data['brand_name'], lawsuit_data['case_number'])
            
            if is_dup:
                print(f"  ⏭️ 已存在，跳过")
                duplicate_count += 1
            else:
                try:
                    response = requests.post(REST_URL, headers=HEADERS, json=lawsuit_data)
                    if response.status_code in [200, 201]:
                        print(f"  ✅ 新案件已插入!")
                        print(f"     案件号: {lawsuit_data['case_number']}")
                        print(f"     URL: {lawsuit_data['raw_data_url']}")
                        success_count += 1
                    else:
                        print(f"  ❌ 插入失败: {response.text[:100]}")
                        failed_count += 1
                except Exception as e:
                    print(f"  ❌ 数据库错误: {e}")
                    failed_count += 1
        else:
            failed_count += 1
        
        # 延迟避免被识别为爬虫
        if index < len(keywords):
            delay = 5
            print(f"  ⏳ 等待 {delay} 秒...")
            time.sleep(delay)
        print()
    
    print("\n" + "="*70)
    print(f"🎉 Justia 抓取完成!")
    print(f"📊 结果:")
    print(f"   ✅ 成功插入: {success_count}")
    print(f"   ⏭️ 重复跳过: {duplicate_count}")
    print(f"   ❌ 失败/无数据: {failed_count}")
    print(f"   📈 总计: {len(keywords)}")
    
    if success_count > 0:
        print(f"\n✅ 成功！通过 Justia 公开数据抓取真实案件")
        print(f"🌐 验证: 访问 Supabase 或前端页面")
    
    print("="*70)

if __name__ == "__main__":
    try:
        from bs4 import BeautifulSoup
        seed_real_data()
    except ImportError:
        print("❌ 缺少 beautifulsoup4")
        print("   运行: pip install beautifulsoup4")
