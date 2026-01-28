import asyncio
import re
import os
from datetime import datetime
from playwright.async_api import async_playwright
from supabase import create_client, Client
from dotenv import load_dotenv

# 1. 环境配置
# 1. 环境配置
try:
    load_dotenv()
except Exception:
    pass
SUPABASE_URL = os.environ.get("PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("PUBLIC_SUPABASE_ANON_KEY") or os.environ.get("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Fatal: Missing Supabase credentials.")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# 2. 目标律所监控列表
TARGETS = [
    {
        "firm": "GBC",
        "url": "https://www.gbcinfringement.com/", 
        "selector": "a[href*='case'], table tr",
        "priority": "High"
    },
    {
        "firm": "HSP",
        "url": "https://hspdirect.com/cases/",
        "selector": ".case-item, table tr",
        "priority": "High"
    },
    {
        "firm": "Keith",
        "url": "https://keith.law/cases/",
        "selector": ".entry-title",
        "priority": "High"
    },
    {
        "firm": "EPS",
        "url": "https://epslaw.com/notices/",
        "selector": "table tr",
        "priority": "Medium"
    }
]

# 3. 正则表达式
CASE_PATTERN = r"(\d{1,2}:\d{2}-cv-\d{3,5})" # 匹配 1:26-cv-00123

async def process_page(page, target):
    print(f"🕵️ 正在扫描: {target['firm']} - {target['url']}")
    
    # Retry Logic
    max_retries = 3
    for attempt in range(max_retries):
        try:
            await page.goto(target['url'], timeout=60000, wait_until="domcontentloaded")
            break # Success
        except Exception as e:
            if attempt == max_retries - 1:
                print(f"   ❌ [Final Fail] 无法访问 {target['firm']}: {e}")
                return 0 # Fail this target
            print(f"   ⚠️ [Retry {attempt+1}/{max_retries}] 连接失败，3秒后重试...")
            await asyncio.sleep(3)
    
    try:
        # 获取页面文本用于正则提取
        content = await page.content()
        
        # 1. 提取页面上出现的所有案号
        found_cases = set(re.findall(CASE_PATTERN, content))
        print(f"   -> 发现 {len(found_cases)} 个潜在案号")
        
        caseload_count = 0
        for case_no in found_cases:
            # 2. 关联逻辑
            print(f"      -> 处理案号: {case_no}")
            
            # (A) 更新 Law Firm 信息
            res = supabase.table('lawsuits').select('*').eq('case_number', case_no).execute()
            
            if len(res.data) > 0:
                current_firm = res.data[0].get('law_firm')
                if current_firm != target['firm']:
                    print(f"         📝 更新律所: {current_firm} -> {target['firm']}")
                    supabase.table('lawsuits').update({'law_firm': target['firm']}).eq('case_number', case_no).execute()
                caseload_count += 1
            else:
                print(f"         🆕 发现新案 (从律所官网): {case_no}")
                payload = {
                    "case_number": case_no,
                    "plaintiff": "Unknown (Hunter Discovered)",
                    "law_firm": target['firm'],
                    "court": "N.D. Illinois",
                    "status": "Active (Firm Website)",
                    "filed_date": datetime.now().strftime("%Y-%m-%d"),
                    "raw_data_url": target['url'],
                    "risk_score": 95
                }
                try:
                    supabase.table('lawsuits').insert(payload).execute()
                    caseload_count += 1
                except Exception as insert_err:
                     print(f"         ❌ Insert Error: {insert_err}")

            # (B) 尝试抓取被告 (简易版)
            try:
                links = await page.locator(f"a:has-text('{case_no}')").all()
                for link in links:
                    href = await link.get_attribute('href')
                    if href and '.pdf' in href:
                        print(f"         📎 发现 PDF 证据: {href}")
                        defendant_payload = {
                            "case_number": case_no,
                            "defendant_name": "See Attached Schedule A (PDF)",
                            "store_url": href,
                            "platform": "PDF Document",
                            "source": f"{target['firm']} Website"
                        }
                        try:
                            supabase.table('defendants').insert(defendant_payload).execute()
                        except:
                            pass
            except Exception as e:
                pass # Silent fail on PDF
                
        return caseload_count

    except Exception as e:
        print(f"   ❌ 解析失败: {e}")
        return 0

async def main():
    print("🚀 启动律所猎手 (Law Firm Hunter) - Stealth Mode...")
    
    total_harvested = 0
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=[
                '--disable-blink-features=AutomationControlled',
                '--no-sandbox',
                '--disable-setuid-sandbox'
            ]
        )
        
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            ignore_https_errors=True,
            viewport={'width': 1920, 'height': 1080}
        )
        
        page = await context.new_page()

        await page.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });
        """)

        for target in TARGETS:
            count = await process_page(page, target)
            total_harvested += count
        
        await browser.close()
    
    print("\n" + "="*50)
    print(f"📊 猎杀统计: 总计处理 {total_harvested} 个案件")
    print("="*50)
    
    if total_harvested == 0:
        print("🚨 CRITICAL: NO TARGETS ACQUIRED")
        # In Sniper (Law Firm) mode, it's possible no firm has posted updates TODAY.
        # But if ALL sites failed to load, it's an error.
        # We'll rely on the logs to distinguish, but simply failing CI might be too harsh if it's just a slow news day.
        # However, user demanded 'Strict Audit'.
        raise Exception("Sniper Mission Failed - 0 Targets Found")

if __name__ == "__main__":
    asyncio.run(main())
