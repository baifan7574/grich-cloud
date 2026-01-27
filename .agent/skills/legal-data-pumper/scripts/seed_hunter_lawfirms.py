import asyncio
import re
import os
from datetime import datetime
from playwright.async_api import async_playwright
from supabase import create_client, Client
from dotenv import load_dotenv

# 1. 环境配置
load_dotenv()
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
        "url": "https://gbc.law/cases", # 需根据实际可访问 URL 调整，GBC 常用 gbc.law
        "selector": "a[href*='cases']", # 泛用选择器
        "priority": "High"
    },
    {
        "firm": "HSP",
        "url": "https://hsp.law/service-of-process/", # 常见 HSP 公示页
        "selector": ".case-item, table tr",
        "priority": "Medium"
    },
    {
        "firm": "Keith",
        "url": "https://keith.law/cases/",
        "selector": ".entry-title",
        "priority": "High"
    },
    {
        "firm": "EPS",
        "url": "https://epslaw.com/active-cases/",  # 需验证
        "selector": "table tr",
        "priority": "Medium"
    }
]

# 3. 正则表达式
CASE_PATTERN = r"(\d{1,2}:\d{2}-cv-\d{3,5})" # 匹配 1:26-cv-00123

async def process_page(page, target):
    print(f"🕵️ 正在扫描: {target['firm']} - {target['url']}")
    try:
        await page.goto(target['url'], timeout=30000, wait_until="networkidle")
        
        # 获取页面文本用于正则提取
        content = await page.content()
        
        # 1. 提取页面上出现的所有案号
        found_cases = set(re.findall(CASE_PATTERN, content))
        print(f"   -> 发现 {len(found_cases)} 个潜在案号")
        
        for case_no in found_cases:
            # 2. 关联逻辑：检查是否在我们的数据库中 (由 Sentinel 发现的)
            # 或者直接 Upsert (既然在律所官网发现了，那肯定是该律所代理的)
            
            print(f"      -> 处理案号: {case_no}")
            
            # (A) 更新 Law Firm 信息 (如果数据库里是 Unknown)
            # 首先检查案件是否存在
            res = supabase.table('lawsuits').select('*').eq('case_number', case_no).execute()
            
            if len(res.data) > 0:
                # 案件存在，更新 Law Firm
                current_firm = res.data[0].get('law_firm')
                if current_firm != target['firm']:
                    print(f"         📝 更新律所: {current_firm} -> {target['firm']}")
                    supabase.table('lawsuits').update({'law_firm': target['firm']}).eq('case_number', case_no).execute()
            else:
                # 案件不存在，创建新案件 (Hunter 也能发现新案子)
                print(f"         🆕 发现新案 (从律所官网): {case_no}")
                payload = {
                    "case_number": case_no,
                    "plaintiff": "Unknown (Hunter Discovered)",
                    "law_firm": target['firm'],
                    "court": "N.D. Illinois", # 假设大多是 ILND，后续可优化
                    "status": "Active (Firm Website)",
                    "filed_date": datetime.now().strftime("%Y-%m-%d"),
                    "raw_data_url": target['url'],
                    "risk_score": 95
                }
                supabase.table('lawsuits').insert(payload).execute()

            # (B) 尝试抓取被告 (简易版：寻找附近的 Store Name)
            # 这是一个复杂的任务，通常需要针对每个网站写具体的解析器
            # V1 版本：我们先提取案号附近的链接文本，看是否像 PDF 或 Shop Name
            
            # 寻找该案号附近的 PDF 链接
            # XPath: 查找包含案号文本的元素，然后找它旁边的 'a' 标签
            # 这是一个启发式尝试
            try:
                # 查找包含案号的链接
                links = await page.locator(f"a:has-text('{case_no}')").all()
                for link in links:
                    href = await link.get_attribute('href')
                    if href and '.pdf' in href:
                        print(f"         📎 发现 PDF 证据: {href}")
                        # 可以在这里做 PDF 解析 (V2)
                        
                        # 存一个特殊的被告占位符，引导用户去下载 PDF
                        defendant_payload = {
                            "case_number": case_no,
                            "defendant_name": "See Attached Schedule A (PDF)",
                            "store_url": href, # 把 PDF 链接存在 store_url
                            "platform": "PDF Document",
                            "source": f"{target['firm']} Website"
                        }
                        # 插入被告 (忽略重复)
                        try:
                            supabase.table('defendants').insert(defendant_payload).execute()
                        except:
                            pass # 忽略重复
            except Exception as e:
                print(f"         ⚠️ 被告提取跳过: {e}")

    except Exception as e:
        print(f"   ❌ 扫描失败: {e}")

async def main():
    print("🚀 启动律所猎手 (Law Firm Hunter)...")
    async with async_playwright() as p:
        # 使用 Chrome 浏览器，无头模式
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        )
        page = await context.new_page()

        for target in TARGETS:
            await process_page(page, target)
        
        await browser.close()
    
    print("✅ 猎捕完成。")

if __name__ == "__main__":
    asyncio.run(main())
