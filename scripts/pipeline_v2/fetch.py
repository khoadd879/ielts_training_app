#!/usr/bin/env python3
"""
Stage 1: Fetch
Fetches raw HTML from IELTS exam URLs.
"""
import json
import re
import requests
from datetime import datetime
from pathlib import Path
from typing import Optional

from config import RAW_DIR, REQUEST_HEADERS, REQUEST_TIMEOUT, detect_source, get_logger

logger = get_logger(__name__)


def extract_id(url: str, source: str) -> str:
    """Extract unique ID from URL."""
    if source == 'ielts-mentor':
        match = re.search(r'/(\d+-[^/]+)/?$', url)
        if match:
            return match.group(1)
    elif source == 'ielts-writing':
        match = re.search(r'/ielts_reading/(\d+)', url)
        if match:
            return match.group(1)
    elif source == 'mini-ielts':
        # Pattern: /1504/listening/early-history-of-salt or /1504/reading/slug
        match = re.search(r'/(\d+)/(listening|reading)/([^/]+)', url)
        if match:
            return f"{match.group(1)}-{match.group(3)}"
    # Fallback
    return url.split('/')[-2] if url.endswith('/') else url.split('/')[-1]


def get_solution_url(url: str, source: str) -> str:
    """Get solution page URL for mini-ielts."""
    if source == 'mini-ielts':
        # /1504/listening/slug -> /1504/view-solution/listening/slug
        return re.sub(r'/(\d+)/(listening|reading)/', r'/\1/view-solution/\2/', url)
    return None


def fetch(url: str) -> dict:
    """
    Fetch raw HTML from URL.
    Returns dict with source, item_id, html, metadata.
    For mini-ielts, also fetches solution page.
    """
    source = detect_source(url)
    if source == 'unknown':
        return {'success': False, 'error': f'Unknown source: {url}'}
    
    item_id = extract_id(url, source)
    
    logger.info(f"Fetching: {url}")
    
    try:
        response = requests.get(url, headers=REQUEST_HEADERS, timeout=REQUEST_TIMEOUT)
        response.raise_for_status()
        
        result = {
            'success': True,
            'source': source,
            'item_id': item_id,
            'url': url,
            'html': response.text,
            'fetched_at': datetime.now().isoformat(),
        }
        
        # For mini-ielts, also fetch solution page
        if source == 'mini-ielts':
            solution_url = get_solution_url(url, source)
            if solution_url:
                logger.info(f"Fetching solution: {solution_url}")
                try:
                    sol_response = requests.get(solution_url, headers=REQUEST_HEADERS, timeout=REQUEST_TIMEOUT)
                    sol_response.raise_for_status()
                    result['solution_html'] = sol_response.text
                    result['solution_url'] = solution_url
                except Exception as e:
                    logger.warning(f"Solution fetch failed: {e}")
        
        return result
    except Exception as e:
        logger.error(f"Fetch failed: {e}")
        return {'success': False, 'error': str(e)}


def save_raw(data: dict) -> Optional[Path]:
    """Save fetched HTML to disk."""
    if not data.get('success'):
        return None
    
    source_dir = RAW_DIR / data['source']
    source_dir.mkdir(parents=True, exist_ok=True)
    
    # Save HTML
    html_path = source_dir / f"{data['item_id']}.html"
    html_path.write_text(data['html'], encoding='utf-8')
    
    # Save metadata
    meta = {k: v for k, v in data.items() if k != 'html'}
    meta_path = source_dir / f"{data['item_id']}.meta.json"
    meta_path.write_text(json.dumps(meta, indent=2), encoding='utf-8')
    
    logger.info(f"Saved: {html_path}")
    return html_path


def fetch_and_save(url: str) -> Optional[dict]:
    """Fetch URL and save to raw directory. Returns data dict."""
    data = fetch(url)
    if data.get('success'):
        save_raw(data)
    return data


# CLI
if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python fetch.py <URL>")
        sys.exit(1)
    
    url = sys.argv[1]
    result = fetch_and_save(url)
    if result.get('success'):
        print(f"✓ Fetched: {result['source']}/{result['item_id']}")
    else:
        print(f"✗ Failed: {result.get('error')}")
        sys.exit(1)
