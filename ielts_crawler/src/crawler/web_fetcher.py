import time
import requests
from typing import Optional, Dict
from bs4 import BeautifulSoup

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import config


class WebFetcher:
    """Fetch web pages with rate limiting and proper headers"""
    
    DEFAULT_HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
    }
    
    def __init__(self, delay_ms: int = None):
        """
        Initialize WebFetcher
        
        Args:
            delay_ms: Delay between requests in milliseconds
        """
        self.delay_ms = delay_ms or config.REQUEST_DELAY_MS
        self.session = requests.Session()
        self.session.headers.update(self.DEFAULT_HEADERS)
        self.last_request_time = 0
    
    def _wait_for_rate_limit(self):
        """Wait if needed to respect rate limiting"""
        if self.delay_ms > 0:
            elapsed = (time.time() * 1000) - self.last_request_time
            if elapsed < self.delay_ms:
                wait_time = (self.delay_ms - elapsed) / 1000
                time.sleep(wait_time)
    
    def fetch(
        self,
        url: str,
        timeout: int = 30,
        headers: Optional[Dict[str, str]] = None
    ) -> str:
        """
        Fetch HTML content from URL
        
        Args:
            url: URL to fetch
            timeout: Request timeout in seconds
            headers: Additional headers to send
            
        Returns:
            HTML content as string
            
        Raises:
            requests.RequestException: On network errors
        """
        self._wait_for_rate_limit()
        
        try:
            if headers:
                self.session.headers.update(headers)
            
            response = self.session.get(url, timeout=timeout)
            response.raise_for_status()
            
            self.last_request_time = time.time() * 1000
            
            # Try to get correct encoding
            response.encoding = response.apparent_encoding or 'utf-8'
            
            return response.text
            
        except requests.RequestException as e:
            print(f"Error fetching {url}: {e}")
            raise
    
    def fetch_with_retry(
        self,
        url: str,
        max_retries: int = 3,
        timeout: int = 30
    ) -> Optional[str]:
        """
        Fetch URL with retry logic
        
        Args:
            url: URL to fetch
            max_retries: Maximum number of retries
            timeout: Request timeout
            
        Returns:
            HTML content or None if all retries fail
        """
        for attempt in range(max_retries):
            try:
                return self.fetch(url, timeout)
            except requests.RequestException as e:
                print(f"Attempt {attempt + 1}/{max_retries} failed: {e}")
                if attempt < max_retries - 1:
                    time.sleep(2 ** attempt)  # Exponential backoff
        
        return None
