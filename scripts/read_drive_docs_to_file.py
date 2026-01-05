import zipfile
import re
import sys
import os

def get_docx_text(path):
    if not os.path.exists(path):
        return f"File not found: {path}"
    try:
        with zipfile.ZipFile(path) as docx:
            xml_content = docx.read('word/document.xml').decode('utf-8')
            text = re.sub('<[^<]+?>', '', xml_content)
            return text
    except Exception as e:
        return f"Error reading {path}: {e}"

files = [
    r"G:\我的云端硬盘\网站\全球法律合规预警自动化专家系统 (GRICH)\几大坑失败的原因。.docx",
    r"G:\我的云端硬盘\网站\全球法律合规预警自动化专家系统 (GRICH)\🛠️ GRICH 前端界面优化与致命风险修复指令.docx",
    r"G:\我的云端硬盘\网站\全球法律合规预警自动化专家系统 (GRICH)\新建 Microsoft Word 文档.docx"
]

output_file = r"d:\quicktoolshub\雷达监控。\GRICH\drive_docs_content.txt"

with open(output_file, "w", encoding="utf-8") as f:
    for path in files:
        f.write(f"--- FILE: {os.path.basename(path)} ---\n")
        f.write(get_docx_text(path))
        f.write("\n" + "="*50 + "\n\n")

print("Done writing to " + output_file)
