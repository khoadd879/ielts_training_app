"""
Link Discovery - Find test links from index pages using AI
"""
from typing import List, Dict, Any, Optional
from urllib.parse import urljoin, urlparse
import re

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from crawler import WebFetcher, ContentCleaner
from ai_pipeline import LLMClient


LINK_DISCOVERY_PROMPT = """
Analyze this webpage and find ALL links that lead to IELTS test content pages.

IMPORTANT: This is likely an INDEX PAGE containing links to individual tests or sections.

Look for links like:
- "Section 1", "Section 2", "Section 3"
- "Test 1", "Test 2", "Practice Test 1"
- "Reading Passage", "Listening Part"
- Links containing numbers like "sample-1", "test-2", "section-3"
- ANY links that appear to lead to actual test content

DO NOT skip links just because they say "Section" - those ARE the test pages!

Return JSON:
{
  "test_links": [
    {
      "url": "the href URL (relative or absolute)",
      "title": "descriptive title like 'Test 1 Section 1' or the link text",
      "test_type": "READING|LISTENING|WRITING|UNKNOWN"
    }
  ],
  "is_index_page": true
}

If there are NO links to test sections/content and this page itself contains a reading passage with questions, return:
{
  "test_links": [],
  "is_index_page": false
}

IMPORTANT: Extract ALL section links you find. A page listing multiple tests with Section 1/2/3 links should return many links.
"""


class LinkDiscoverer:
    """Discover test links from index/listing pages"""
    
    def __init__(self, llm_client: LLMClient = None, use_browser: bool = False):
        self.use_browser = use_browser
        if use_browser:
            from crawler.browser_fetcher import BrowserFetcher
            self.fetcher = BrowserFetcher(headless=True)
        else:
            self.fetcher = WebFetcher()
        self.cleaner = ContentCleaner()
        self.llm = llm_client or LLMClient()
    
    def close(self):
        """Cleanup browser resources"""
        if self.use_browser and hasattr(self.fetcher, 'stop'):
            self.fetcher.stop()
    
    def discover_links(self, url: str) -> Dict[str, Any]:
        """
        Discover test links from a URL
        
        Args:
            url: URL to analyze (can be index page or direct test page)
            
        Returns:
            Dict with 'test_links' list and 'is_index_page' bool
        """
        print(f"🔍 Discovering links from: {url}" + (" (browser)" if self.use_browser else ""))
        
        try:
            # Fetch page
            html = self.fetcher.fetch_with_retry(url)
            if not html:
                return {
                    'success': False,
                    'error': 'Failed to fetch URL',
                    'test_links': [],
                    'is_index_page': False
                }
            
            # Extract content and links
            content_data = self.cleaner.extract_structured_content(html)
            
            # Also extract all href links for context
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(html, 'lxml')
            
            # Get all links
            links_info = []
            for a in soup.find_all('a', href=True):
                href = a.get('href', '')
                text = a.get_text(strip=True)
                if href and text and len(text) > 2:
                    links_info.append(f"[{text}]({href})")
            
            # Prepare content for AI
            analysis_content = f"""
PAGE URL: {url}

PAGE TITLE: {content_data.get('title', 'Unknown')}

ALL LINKS FOUND ON PAGE ({len(links_info)} total):
{chr(10).join(links_info[:200])}

PAGE CONTENT PREVIEW:
{content_data.get('raw_text', '')[:1500]}
"""
            
            # Use AI to analyze
            result = self.llm.call(
                prompt=LINK_DISCOVERY_PROMPT,
                content=analysis_content,
                json_output=True
            )
            
            # Resolve relative URLs
            test_links = []
            for link in result.get('test_links', []):
                link_url = link.get('url', '')
                if link_url:
                    # Convert relative to absolute URL
                    absolute_url = urljoin(url, link_url)
                    test_links.append({
                        'url': absolute_url,
                        'title': link.get('title', ''),
                        'test_type': link.get('test_type', 'UNKNOWN')
                    })
            
            return {
                'success': True,
                'test_links': test_links,
                'is_index_page': result.get('is_index_page', len(test_links) > 0),
                'source_url': url
            }
            
        except Exception as e:
            print(f"❌ Error discovering links: {e}")
            return {
                'success': False,
                'error': str(e),
                'test_links': [],
                'is_index_page': False
            }
    
    def discover_and_list(self, url: str) -> List[Dict[str, str]]:
        """
        Discover and return just the list of test URLs
        
        Returns:
            List of dicts with 'url', 'title', 'test_type'
        """
        result = self.discover_links(url)
        
        if not result.get('success'):
            print(f"❌ Discovery failed: {result.get('error')}")
            return []
        
        if not result.get('is_index_page'):
            print("ℹ️ This appears to be a test page, not an index page.")
            return [{'url': url, 'title': 'Direct test page', 'test_type': 'UNKNOWN'}]
        
        links = result.get('test_links', [])
        print(f"✓ Found {len(links)} test links")
        
        for i, link in enumerate(links, 1):
            print(f"  {i}. [{link.get('test_type', '?')}] {link.get('title', 'Untitled')}")
            print(f"     {link.get('url', '')}")
        
        return links
