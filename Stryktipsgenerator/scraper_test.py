"""
Scraper för att hämta Stryktips-matcher från Svenska Spel
"""
import cloudscraper
import json
import re

def scrape_stryktips():
    """Försöker scrapa Stryktipset från svenska spel."""
    scraper = cloudscraper.create_scraper()
    
    print("Söker efter Stryktips-data...")
    
    # Testa huvudsidan
    resp = scraper.get("https://www.svenskaspel.se/", timeout=20)
    print(f"Huvudsida: {resp.status_code}")
    
    # Sök efter inbäddad JSON
    patterns = [
        r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>',
        r'window\.__INITIAL_STATE__\s*=\s*(\{.*?\});',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, resp.text, re.DOTALL)
        if match:
            print("Hittade inbäddad data!")
            try:
                data = json.loads(match.group(1))
                print(f"Keys: {list(data.keys())[:5]}")
                return data
            except:
                pass
    
    # Sök efter eventComment (matchinfo)
    events = re.findall(r'"eventComment"\s*:\s*"([^"]+)"', resp.text)
    if events:
        print(f"\nHittade {len(events)} matcher:")
        for i, e in enumerate(events[:13], 1):
            print(f"  {i}. {e}")
        return events
    
    print("Ingen data hittad")
    return None

if __name__ == "__main__":
    scrape_stryktips()
