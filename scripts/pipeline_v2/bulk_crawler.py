#!/usr/bin/env python3
"""
Bulk IELTS Exam Crawler
Fetches exam URLs from ielts-mentor.com listing pages and processes them.
"""
import re
import sys
import requests
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
}


def get_exam_urls_from_listing(listing_url: str, max_pages: int = 5) -> list:
    """Extract exam URLs from ielts-mentor listing page."""
    urls = []
    
    for page in range(1, max_pages + 1):
        page_url = f"{listing_url}?start={(page-1)*20}" if page > 1 else listing_url
        print(f"Fetching page {page}: {page_url}")
        
        try:
            resp = requests.get(page_url, headers=HEADERS, timeout=30)
            resp.raise_for_status()
            html = resp.text
            
            # Extract exam links
            pattern = r'href="(https://www\.ielts-mentor\.com/reading-sample/[^"]+)"'
            matches = re.findall(pattern, html)
            
            for url in matches:
                if url not in urls and '/reading-sample/' in url:
                    urls.append(url)
            
            if not matches:
                break
                
        except Exception as e:
            print(f"Error fetching page {page}: {e}")
            break
    
    return urls


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Bulk crawl IELTS exams")
    parser.add_argument("--source", default="gt", choices=["gt", "academic"], 
                       help="Source type: gt or academic")
    parser.add_argument("--pages", type=int, default=3, help="Number of listing pages")
    parser.add_argument("--workers", type=int, default=5, help="Parallel workers")
    parser.add_argument("--limit", type=int, default=0, help="Limit number of exams")
    args = parser.parse_args()
    
    # Listing URLs
    listings = {
        "gt": "https://www.ielts-mentor.com/reading-sample/gt-reading",
        "academic": "https://www.ielts-mentor.com/reading-sample/academic-reading",
    }
    
    listing_url = listings[args.source]
    print(f"\n=== Bulk crawling {args.source.upper()} exams ===")
    print(f"Listing: {listing_url}")
    print(f"Pages: {args.pages}, Workers: {args.workers}")
    
    # Get URLs
    urls = get_exam_urls_from_listing(listing_url, args.pages)
    print(f"\nFound {len(urls)} exam URLs")
    
    if args.limit > 0:
        urls = urls[:args.limit]
        print(f"Limited to {len(urls)} exams")
    
    if not urls:
        print("No URLs found!")
        return
    
    # Process
    from batch_processor import process_batch
    results = process_batch(urls, args.workers, skip_existing=True)
    
    print(f"\n=== BULK CRAWL COMPLETE ===")
    print(f"Success: {sum(1 for r in results if r.success)}/{len(results)}")


if __name__ == "__main__":
    main()
