"""
验证被告名单是否显示在HTML源码中
"""
import requests
from bs4 import BeautifulSoup
import re

print("="*70)
print("🔍 最终验收：验证UGG页面被告名单")
print("="*70)
print()

# 访问UGG合规页面 (带paid参数查看完整报告)
url = "https://jaxfamlaw.com/compliance/UGG?case=12-cv-4316&paid=true"

print(f"📡 访问: {url}")
print()

try:
    response = requests.get(url, timeout=15)
    
    if response.status_code == 200:
        print(f"✅ 页面访问成功\n")
        
        html = response.text
        
        # 搜索被告名单
        defendants_from_db = [
            "ugg-boots-outlet-store.com",
            "cheap-ugg-boots-sale.com",
            "uggboots-discount.com",
            "genuine-ugg-australia.com",
            "ugg-clearance-sale.com",
            "amazon-seller-UGGA123",
            "ebay-seller-cheapuggs",
            "aliexpress-store-uggboot",
            "dhgate-seller-ugg2025",
            "temu-shop-uggdiscount"
        ]
        
        print("="*70)
        print("🎯 被告名单验证结果:")
        print("="*70)
        
        found_count = 0
        for i, defendant in enumerate(defendants_from_db, 1):
            if defendant in html:
                print(f"  ✅ #{i}: {defendant}")
                found_count += 1
            else:
                print(f"  ❌ #{i}: {defendant} - 未找到")
        
        print()
        print(f"📊 找到: {found_count}/10")
        print()
        
        if found_count >= 8:
            print("="*70)
            print("✅ 验收通过！被告名单已显示在HTML中")
            print("="*70)
            print()
            
            # 提取被告列表Section的HTML片段
            print("📄 被告列表HTML源码片段:")
            print("="*70)
            
            # 查找defendants-list-section
            match = re.search(r'<section id="defendants-list-section".*?</section>', html, re.DOTALL)
            if match:
                section_html = match.group(0)
                # 只显示前1500字符
                print(section_html[:1500])
                print("...")
                print(f"\n(完整Section长度: {len(section_html)} 字符)")
            else:
                # 如果找不到section，至少显示包含被告名的部分
                for defendant in defendants_from_db[:3]:
                    if defendant in html:
                        start = html.find(defendant) - 200
                        end = html.find(defendant) + 300
                        print(f"\n包含 '{defendant}' 的HTML片段:")
                        print(html[max(0, start):end])
                        break
        else:
            print("="*70)
            print("❌ 验收失败！被告名单未正确显示")
            print("="*70)
            print()
            print("可能原因:")
            print("1. 需要访问带 ?paid=true 参数的URL")
            print("2. JavaScript动态加载延迟")
            print("3. 数据库查询失败")
    else:
        print(f"❌ 页面访问失败: {response.status_code}")
        
except Exception as e:
    print(f"❌ 错误: {e}")

print()
print("="*70)
print("🎯 最终验收完成")
print("="*70)
