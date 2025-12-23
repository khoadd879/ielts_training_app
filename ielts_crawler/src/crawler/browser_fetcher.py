"""
Browser-based fetcher using Playwright for sites with bot protection
"""
import time
from typing import Optional, Dict, List
from playwright.sync_api import sync_playwright, Page, Browser

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import config


class BrowserFetcher:
    """Fetch web pages using a real browser to bypass bot protection"""
    
    def __init__(self, headless: bool = True, delay_ms: int = None):
        """
        Initialize BrowserFetcher
        
        Args:
            headless: Run browser in headless mode
            delay_ms: Delay between requests in ms
        """
        self.headless = headless
        self.delay_ms = delay_ms or config.REQUEST_DELAY_MS
        self.playwright = None
        self.browser: Optional[Browser] = None
        self.last_request_time = 0
    
    def start(self):
        """Start the browser"""
        if not self.playwright:
            self.playwright = sync_playwright().start()
            self.browser = self.playwright.chromium.launch(
                headless=self.headless,
                args=['--disable-blink-features=AutomationControlled']
            )
            print("🌐 Browser started")
    
    def stop(self):
        """Stop the browser"""
        if self.browser:
            self.browser.close()
            self.browser = None
        if self.playwright:
            self.playwright.stop()
            self.playwright = None
            print("🌐 Browser stopped")
    
    def _wait_for_rate_limit(self):
        """Wait if needed to respect rate limiting"""
        if self.delay_ms > 0:
            elapsed = (time.time() * 1000) - self.last_request_time
            if elapsed < self.delay_ms:
                wait_time = (self.delay_ms - elapsed) / 1000
                time.sleep(wait_time)
    
    def fetch(self, url: str, wait_selector: str = None, timeout: int = 30000) -> str:
        """
        Fetch page HTML using browser
        
        Args:
            url: URL to fetch
            wait_selector: CSS selector to wait for (optional)
            timeout: Timeout in milliseconds
            
        Returns:
            HTML content
        """
        self.start()
        self._wait_for_rate_limit()
        
        page = self.browser.new_page()
        
        try:
            # Set user agent to look more like a real browser
            page.set_extra_http_headers({
                'Accept-Language': 'en-US,en;q=0.9',
            })
            
            print(f"📄 Loading: {url}")
            page.goto(url, timeout=timeout, wait_until='networkidle')
            
            # Handle common cookie banners
            self._handle_cookie_banner(page)
            
            # Click "Show answers" buttons to reveal correct answers
            self._click_show_answers(page)
            
            # Wait for specific content if selector provided
            if wait_selector:
                page.wait_for_selector(wait_selector, timeout=timeout)
            
            # Small delay to let dynamic content load
            page.wait_for_timeout(1000)
            
            html = page.content()
            self.last_request_time = time.time() * 1000
            
            return html
            
        finally:
            page.close()
    
    def _handle_cookie_banner(self, page: Page):
        """Try to click common cookie accept buttons"""
        cookie_selectors = [
            'button:has-text("Accept")',
            'button:has-text("Accept All")',
            'button:has-text("I Accept")',
            'button:has-text("OK")',
            '[class*="cookie"] button',
            '#accept-cookies',
            '.accept-cookies',
        ]
        
        for selector in cookie_selectors:
            try:
                btn = page.locator(selector).first
                if btn.is_visible(timeout=500):
                    btn.click()
                    page.wait_for_timeout(500)
                    print("   ✓ Handled cookie banner")
                    return
            except Exception:
                continue
    
    def _click_show_answers(self, page: Page):
        """Try to click Show Answer/Check Answer buttons to reveal answers"""
        answer_selectors = [
            # Common show answer button patterns
            '#b2',  # IELTS-up specific
            'button:has-text("Show answer")',
            'button:has-text("Show answers")',
            'button:has-text("Show Answer")',
            'button:has-text("Show Answers")',
            'button:has-text("Check answer")',
            'button:has-text("View answer")',
            'button:has-text("Reveal answer")',
            '[class*="show-answer"]',
            '[class*="answer-btn"]',
            '.show-answer',
            '.show-answers',
            'a:has-text("Show answers")',
            'input[value*="Show"]',
        ]
        
        clicked = False
        for selector in answer_selectors:
            try:
                btns = page.locator(selector).all()
                for btn in btns:
                    if btn.is_visible(timeout=300):
                        btn.click()
                        clicked = True
                        page.wait_for_timeout(300)
            except Exception:
                continue
        
        if clicked:
            print("   ✓ Clicked Show Answers buttons")
            page.wait_for_timeout(1000)  # Wait for answers to appear
    
    def fetch_with_retry(
        self,
        url: str,
        max_retries: int = 3,
        wait_selector: str = None
    ) -> Optional[str]:
        """
        Fetch URL with retry logic
        
        Args:
            url: URL to fetch
            max_retries: Maximum retries
            wait_selector: CSS selector to wait for
            
        Returns:
            HTML content or None
        """
        for attempt in range(max_retries):
            try:
                return self.fetch(url, wait_selector)
            except Exception as e:
                print(f"   Attempt {attempt + 1}/{max_retries} failed: {e}")
                if attempt < max_retries - 1:
                    time.sleep(2 ** attempt)
        
        return None
    
    def discover_links(self, url: str, link_pattern: str = None) -> List[Dict[str, str]]:
        """
        Discover links from a page
        
        Args:
            url: URL to analyze
            link_pattern: Optional pattern to filter links (e.g. '/reading')
            
        Returns:
            List of dicts with 'url', 'text'
        """
        self.start()
        self._wait_for_rate_limit()
        
        page = self.browser.new_page()
        
        try:
            page.goto(url, wait_until='networkidle')
            self._handle_cookie_banner(page)
            page.wait_for_timeout(1000)
            
            # Get all links
            links = page.evaluate('''(pattern) => {
                const anchors = document.querySelectorAll('a[href]');
                const results = [];
                anchors.forEach(a => {
                    const href = a.href;
                    const text = a.innerText.trim();
                    if (href && text && text.length > 2) {
                        if (!pattern || href.includes(pattern)) {
                            results.push({ url: href, text: text });
                        }
                    }
                });
                return results;
            }''', link_pattern or '')
            
            self.last_request_time = time.time() * 1000
            return links
            
        finally:
            page.close()
    
    def __enter__(self):
        self.start()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.stop()
