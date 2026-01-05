import json
import os
import urllib.parse
from datetime import datetime

class SitemapGenerator:
    def __init__(self):
        self.base_url = "https://jaxfamlaw.com"
        # Adjusted paths to be relative to this script
        self.script_dir = os.path.dirname(os.path.abspath(__file__))
        self.keywords_file = os.path.join(self.script_dir, '../sql/initial_keywords.json')
        self.output_file = os.path.join(self.script_dir, '../grich-web/public/sitemap.xml')

    def generate(self):
        print(f"Reading keywords from: {self.keywords_file}")
        
        if not os.path.exists(self.keywords_file):
            print(f"Error: Keywords file not found at {self.keywords_file}")
            return

        with open(self.keywords_file, 'r', encoding='utf-8') as f:
            brands = json.load(f)

        urls = []
        # Phase 6 Scenarios
        scenarios = ['frozen-funds', 'tro-list', 'lawsuit-withdraw']
        
        # Add home page
        urls.append(self.base_url)

        for brand in brands:
            # Basic URL encoding (spaces to %20, etc.)
            # But usually for SEO friendly URLs we might want slugs. 
            # For now, following the specific requirement of [brand] param.
            safe_brand = urllib.parse.quote(brand)
            
            # Add brand home if needed, or just the scenarios
            urls.append(f"{self.base_url}/compliance/{safe_brand}")
            
            for scenario in scenarios:
                url = f"{self.base_url}/compliance/{safe_brand}/{scenario}"
                urls.append(url)

        self._write_sitemap(urls)
    
    def _write_sitemap(self, urls):
        # XML Structure
        xml_content = ['<?xml version="1.0" encoding="UTF-8"?>']
        xml_content.append('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
        
        today = datetime.now().strftime('%Y-%m-%d')
        
        for url in urls:
            xml_content.append('  <url>')
            xml_content.append(f'    <loc>{url}</loc>')
            xml_content.append(f'    <lastmod>{today}</lastmod>')
            xml_content.append('    <changefreq>daily</changefreq>')
            xml_content.append('    <priority>0.8</priority>')
            xml_content.append('  </url>')
            
        xml_content.append('</urlset>')
        
        # Ensure output directory exists
        os.makedirs(os.path.dirname(self.output_file), exist_ok=True)
        
        with open(self.output_file, 'w', encoding='utf-8') as f:
            f.write('\n'.join(xml_content))
            
        print(f"Successfully generated sitemap with {len(urls)} URLs at: {self.output_file}")

if __name__ == "__main__":
    generator = SitemapGenerator()
    generator.generate()
