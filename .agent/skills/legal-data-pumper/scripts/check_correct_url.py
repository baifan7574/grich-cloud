"""
验证：访问正确的case_template URL
"""
import requests

print("="*70)
print("🔍 访问case_template页面（正确URL）")
print("="*70)
print()

# 正确的URL应该是case_template.html?case=12-cv-4316&paid=true
urls = [
    "https://jaxfamlaw.com/case_template.html?case=12-cv-4316&paid=true",
    "https://jaxfamlaw.com/case_template?case=12-cv-4316&paid=true",
]

for url in urls:
    print(f"📡 尝试: {url}")
    try:
        response = requests.get(url, timeout=10)
        print(f"   状态: {response.status_code}")
        
        if response.status_code == 200:
            html = response.text
            
            # 搜索被告名单
            defendants = [
                "ugg-boots-outlet-store.com",
                "cheap-ugg-boots-sale.com",
                "uggboots-discount.com"
            ]
            
            found = sum(1 for d in defendants if d in html)
            print(f"   找到被告: {found}/3")
            
            # 查找defendants-list div
            if 'id="defendants-list"' in html:
                print(f"   ✅ 找到 defendants-list 容器")
            
            # 查找defendants-list-section
            if 'id="defendants-list-section"' in html:
                print(f"   ✅ 找到 defendants-list-section")
                
            if found > 0:
                print(f"\n   ✅ THIS IS THE RIGHT URL!")
                print()
                print("="*70)
                print("HTML片段（包含被告）:")
                print("="*70)
                for defendant in defendants:
                    if defendant in html:
                        idx = html.find(defendant)
                        print(html[max(0, idx-100):idx+200])
                        print("\n...")
                        break
        print()
    except Exception as e:
        print(f"   ❌ 错误: {e}\n")

print("="*70)
print("结论: case_template.html 使用JavaScript动态加载数据")
print("需要等JavaScript执行完成后才能看到被告列表")
print("建议: 使用浏览器访问查看最终效果")
print("="*70)
