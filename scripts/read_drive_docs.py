import zipfile
import re
import sys
import os

def get_docx_text(path):
    if not os.path.exists(path):
        return "File not found."
    try:
        with zipfile.ZipFile(path) as docx:
            xml_content = docx.read('word/document.xml').decode('utf-8')
            # Remove XML tags
            text = re.sub('<[^<]+?>', '', xml_content)
            return text
    except Exception as e:
        return f"Error reading {path}: {e}"

files = [
    r"G:\我的云端硬盘\网站\全球法律合规预警自动化专家系统 (GRICH)\几大坑失败的原因。.docx",
    r"G:\我的云端硬盘\网站\全球法律合规预警自动化专家系统 (GRICH)\🛠️ GRICH 前端界面优化与致命风险修复指令.docx",
    r"G:\我的云端硬盘\网站\全球法律合规预警自动化专家系统 (GRICH)\新建 Microsoft Word 文档.docx",
    r"G:\我的云端硬盘\网站\全球法律合规预警自动化专家系统 (GRICH)\报告模板。.docx"
]

for f in files:
    print(f"--- FILE: {os.path.basename(f)} ---")
    print(get_docx_text(f))
    print("\n" + "="*50 + "\n")
