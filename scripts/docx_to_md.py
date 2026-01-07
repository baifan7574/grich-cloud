import os
import mammoth
from markdownify import markdownify as md

def convert_docx_to_md(docx_path):
    print(f"Converting: {docx_path}")
    try:
        with open(docx_path, "rb") as docx_file:
            result = mammoth.convert_to_html(docx_file)
            html = result.value
            messages = result.messages
            
            markdown = md(html, heading_style="ATX")
            
            md_path = os.path.splitext(docx_path)[0] + ".md"
            with open(md_path, "w", encoding="utf-8") as md_file:
                md_file.write(markdown)
            
            print(f"Success: {md_path}")
            for message in messages:
                print(f"  Msg: {message}")
    except Exception as e:
        print(f"Error converting {docx_path}: {e}")

def main():
    root_dir = "."
    exclude_dirs = {"node_modules", ".git", ".gemini", "dist", "build"}
    
    for dirpath, dirnames, filenames in os.walk(root_dir):
        # Modify dirnames in-place to skip excluded directories
        dirnames[:] = [d for d in dirnames if d not in exclude_dirs]
        
        for filename in filenames:
            if filename.lower().endswith(".docx") and not filename.startswith("~$"):
                full_path = os.path.join(dirpath, filename)
                convert_docx_to_md(full_path)

if __name__ == "__main__":
    print("Starting conversion scan...")
    main()
    print("Scan complete.")
