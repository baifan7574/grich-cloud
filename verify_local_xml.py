import xml.etree.ElementTree as ET
import sys

FILE_PATH = "dist/sitemap.xml"

print(f"🔍 正在验证 {FILE_PATH} 的 XML 语法...")

try:
    tree = ET.parse(FILE_PATH)
    root = tree.getroot()
    print("✅ XML 语法解析通过！")
    
    # 额外检查 URL 内容
    print("\n🔍 抽查 URL 内容:")
    namespace = {'ns': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
    urls = root.findall('ns:url/ns:loc', namespace)
    
    found_amp = False
    for i, loc in enumerate(urls):
        url = loc.text
        if '.html' in url:
            print(f"❌ 发现 .html 后缀: {url}")
            sys.exit(1)
        if '&' in url and 'current' not in url: # 排除特定情况，这里主要看原始文本
             # xml.etree 解析后，&amp; 会被还原为 &。
             # 我们需要检查原始文件内容来确认是否转义。
             pass

    # 读取原始文件检查转义
    with open(FILE_PATH, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # 检查原始文件行
    lines = content.splitlines()
    error_count = 0
    checked_count = 0
    
    for i, line in enumerate(lines):
        if "<loc>" in line:
            # 检查是否有未转义的 &
            # 正则：& 后面没有跟着 amp;
            import re
            # 查找单独的 &, 忽略 &amp;
            # 如果存在 & 但不是 &amp;，则是错误
            # 简单检查：如果有 &defendant，必须是 &amp;defendant
            if "&defendant" in line and "&amp;defendant" not in line:
                 print(f"❌ 第 {i+1} 行发现未转义的字符: {line.strip()}")
                 error_count += 1
            
            if "&amp;" in line:
                checked_count += 1
                if checked_count <= 3:
                     print(f"✅ 转义正确示例 (行 {i+1}): {line.strip()}")

    if error_count == 0:
        print(f"\n✅ 所有 {checked_count} 个多参数 URL 均已正确转义。")
    else:
        print(f"\n❌ 发现 {error_count} 个转义错误！")
        sys.exit(1)

except ET.ParseError as e:
    print(f"❌ XML 解析失败: {e}")
    sys.exit(1)
except Exception as e:
    print(f"❌ 发生未知错误: {e}")
    sys.exit(1)
