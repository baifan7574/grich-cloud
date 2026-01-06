
import urllib.request
import urllib.parse
from html.parser import HTMLParser
import re
import ssl

# Target: Greer, Burns & Crain (GBC)
TARGET_URL = "https://gbcinternetenforcement.net/"

class CaseParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.found_cases = set()
        # Regex: 24-00123 or 24-cv-00123 or 24 cv 00123
        self.case_pattern = re.compile(r'\b(2[3-6])[- ]?(cv)?[- ]?(\d{3,5})\b', re.IGNORECASE)

    def handle_data(self, data):
        match = self.case_pattern.search(data)
        if match:
            # Normalize logic
            year, _, number = match.groups()
            normalized = f"20{year}-cv-{number}" if len(year) == 2 else f"{year}-cv-{number}"
            if len(year) == 2: year = "20"+year
            raw = match.group(0)
            self.found_cases.add(raw)

def scrape_gbc_monitor_native():
    print(f"[*] Approaching the Death Star (GBC) via Native Protocol...")
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }

    try:
        # Create unverified context to bypass SSL errors
        context = ssl._create_unverified_context()
        
        req = urllib.request.Request(TARGET_URL, headers=headers)
        with urllib.request.urlopen(req, context=context, timeout=15) as response:
            html_content = response.read().decode('utf-8', errors='ignore')
            
            parser = CaseParser()
            parser.feed(html_content)
            
            print(f"[+] Scan Complete. Total GBC Cases Detected: {len(parser.found_cases)}")
            for case in parser.found_cases:
                print(f"    -> Signal: {case}")
            
            return list(parser.found_cases)

    except Exception as e:
        print(f"[!] Mission Failed (Native): {e}")
        return []

if __name__ == "__main__":
    scrape_gbc_monitor_native()
