
import requests
import json
import re
import time

# Target: Reddit JSON API (Unofficial but effective for monitoring)
TARGETS = [
    "https://www.reddit.com/r/AmazonSeller/search.json?q=TRO&restrict_sr=1&sort=new",
    "https://www.reddit.com/r/AmazonSeller/search.json?q=lawsuit&restrict_sr=1&sort=new"
]

def scrape_reddit_monitoring():
    print(f"[*] Starting Reddit Spy Mission...")
    
    headers = {
        'User-Agent': 'GRICH-Intelligence-Bot/1.0 (by /u/SecurityResearcher)'
    }

    all_signals = []

    for url in TARGETS:
        try:
            print(f"    Scanning: {url}")
            response = requests.get(url, headers=headers, timeout=10)
            
            if response.status_code != 200:
                print(f"    [!] Failed: {response.status_code}")
                continue

            data = response.json()
            posts = data.get('data', {}).get('children', [])
            
            print(f"    Found {len(posts)} recent posts. Analyzing...")
            
            # Regex for Case Numbers (Loose pattern: 24-cv-xxxx or just 24-xxxx)
            case_pattern = re.compile(r'\b(2[0-9]-cv-\d{3,5})\b', re.IGNORECASE)
            
            for post in posts:
                post_data = post.get('data', {})
                title = post_data.get('title', '')
                selftext = post_data.get('selftext', '')
                full_text = f"{title} {selftext}"
                
                # Check for signals
                found_cases = set(case_pattern.findall(full_text))
                
                if found_cases:
                    print(f"    [+] SIGNAL DETECTED in post: {title[:50]}...")
                    for case in found_cases:
                        print(f"        -> Case: {case}")
                        all_signals.append({
                            "source": "Reddit",
                            "case_number": case,
                            "context": title,
                            "url": post_data.get('url')
                        })
                
            time.sleep(2) # Be polite

        except Exception as e:
            print(f"    [!] Error scanning {url}: {e}")

    print(f"[*] Mission Complete. Total Signals: {len(all_signals)}")
    return all_signals

if __name__ == "__main__":
    scrape_reddit_monitoring()
