import zipfile
import xml.etree.ElementTree as ET
import sys
import os

def get_docx_text(path):
    """
    Extracts text from a .docx file without external dependencies.
    """
    try:
        if not os.path.exists(path):
            return f"❌ File not found: {path}"
            
        with zipfile.ZipFile(path) as document:
            xml_content = document.read('word/document.xml')
            
        tree = ET.fromstring(xml_content)
        
        # XML Namespace map (simplified for searching)
        # Word XML uses namespaces like w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
        # We'll just look for tags ending in 't' (text) and 'p' (paragraph)
        
        text_content = []
        for elem in tree.iter():
            # Extract text nodes <w:t>
            if elem.tag.endswith('}t'):
                if elem.text:
                    text_content.append(elem.text)
            # Add newlines for paragraphs <w:p>
            elif elem.tag.endswith('}p'):
                text_content.append('\n')
                
        return ''.join(text_content)
        
    except Exception as e:
        return f"❌ Error reading {os.path.basename(path)}: {str(e)}"

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python read_docx.py <file_path1> <file_path2> ...")
        sys.exit(1)
        
    for file_path in sys.argv[1:]:
        filename = os.path.basename(file_path)
        print(f"\n{'='*20} START: {filename} {'='*20}")
        content = get_docx_text(file_path)
        print(content)
        print(f"{'='*20} END: {filename} {'='*20}\n")
