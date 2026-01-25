"""
闭环校验：访问网页并验证被告名单显示
"""
import requests
from bs4 import BeautifulSoup

print("="*70)
print("🔍 闭环校验：访问 /compliance/UGG 页面")
print("="*70)
print()

# 访问UGG合规页面
url = "https://jaxfamlaw.com/compliance/UGG"

print(f"📡 正在访问: {url}")
print()

try:
    response = requests.get(url, timeout=15)
    
    if response.status_code == 200:
        print(f"✅ 页面访问成功 (状态码: {response.status_code})")
        print()
        
        # 解析HTML
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # 查找被告相关内容
        # 可能的HTML结构：
        # - 包含 "defendant" 的元素
        # - 包含 "被告" 的元素
        # - 表格或列表结构
        
        print("="*70)
        print("📄 页面标题:")
        print("="*70)
        title = soup.find('title')
        if title:
            print(f"  {title.get_text()}")
        print()
        
        print("="*70)
        print("🔍 搜索被告相关内容:")
        print("="*70)
        
        # 搜索包含我们数据库中被告名的内容
        defendants_from_db = [
            "ugg-boots-outlet-store.com",
            "cheap-ugg-boots-sale.com",
            "uggboots-discount.com",
            "genuine-ugg-australia.com",
            "ugg-clearance-sale.com"
        ]
        
        found_defendants = []
        page_text = response.text.lower()
        
        for defendant in defendants_from_db:
            if defendant.lower() in page_text:
                found_defendants.append(defendant)
                print(f"  ✅ 找到: {defendant}")
        
        if not found_defendants:
            print("  ⚠️ 未在页面中找到数据库中的被告名")
            print()
            print("  可能原因:")
            print("  1. 页面模板未配置显示被告列表")
            print("  2. 需要JavaScript动态加载")
            print("  3. 页面结构不同")
        
        print()
        print("="*70)
        print("📊 HTML片段（前2000字符）:")
        print("="*70)
        print(response.text[:2000])
        print("...")
        print()
        
        # 查找所有链接
        print("="*70)
        print("🔗 页面中的链接:")
        print("="*70)
        links = soup.find_all('a', href=True)
        for i, link in enumerate(links[:10], 1):  # 只显示前10个
            print(f"  {i}. {link.get('href')} - {link.get_text()[:50]}")
        
    else:
        print(f"❌ 页面访问失败 (状态码: {response.status_code})")
        print(f"   可能原因: 页面不存在或服务器问题")
        
except requests.exceptions.Timeout:
    print("❌ 请求超时")
except requests.exceptions.ConnectionError:
    print("❌ 连接失败 - 网站可能未部署或网络问题")
except Exception as e:
    print(f"❌ 错误: {e}")

print()
print("="*70)
print("🎯 闭环校验完成")
print("="*70)
