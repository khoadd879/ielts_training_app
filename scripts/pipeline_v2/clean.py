#!/usr/bin/env python3
"""
Stage 2: Clean
Rule-based cleaning of raw HTML to extract main text content.
"""
import json
import re
from bs4 import BeautifulSoup, NavigableString
from pathlib import Path
from typing import Optional

from config import RAW_DIR, get_logger

logger = get_logger(__name__)

# Directory for cleaned output
CLEANED_DIR = Path(__file__).parent.parent.parent / "data" / "cleaned"
CLEANED_DIR.mkdir(parents=True, exist_ok=True)


def load_raw(source: str, item_id: str) -> Optional[dict]:
    """Load raw HTML from disk."""
    source_dir = RAW_DIR / source
    html_path = source_dir / f"{item_id}.html"
    meta_path = source_dir / f"{item_id}.meta.json"
    
    if not html_path.exists():
        logger.error(f"Raw HTML not found: {html_path}")
        return None
    
    html = html_path.read_text(encoding='utf-8')
    metadata = {}
    if meta_path.exists():
        metadata = json.loads(meta_path.read_text(encoding='utf-8'))
    
    return {'html': html, 'metadata': metadata}


def remove_noise(soup: BeautifulSoup) -> None:
    """Remove noise elements from soup (in-place)."""
    # Remove scripts, styles, nav, footer, ads
    noise_tags = ['script', 'style', 'nav', 'footer', 'header', 'aside', 
                  'iframe', 'noscript', 'form']
    for tag in soup.find_all(noise_tags):
        tag.decompose()
    
    # Remove common noise classes
    noise_classes = ['advertisement', 'ads', 'sidebar', 'social-share', 
                     'comments', 'related-posts', 'newsletter']
    for cls in noise_classes:
        for elem in soup.find_all(class_=re.compile(cls, re.IGNORECASE)):
            elem.decompose()


def extract_main_content(soup: BeautifulSoup, source: str) -> BeautifulSoup:
    """Extract main content container based on source."""
    if source == 'ielts-mentor':
        main = soup.find('article') or soup.find('div', class_='item-page')
    elif source == 'ielts-writing':
        main = soup.find('div', class_='content') or soup.find('main')
    else:
        main = soup.find('main') or soup.find('article')
    
    return main if main else soup.body or soup


def get_text_with_structure(element) -> str:
    """Extract text while preserving paragraph structure."""
    parts = []
    
    for child in element.children:
        if isinstance(child, NavigableString):
            text = str(child).strip()
            if text:
                parts.append(text)
        elif child.name in ['p', 'div']:
            text = child.get_text(separator=' ', strip=True)
            if text:
                parts.append(f"\n\n{text}")
        elif child.name in ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']:
            text = child.get_text(separator=' ', strip=True)
            if text:
                parts.append(f"\n\n## {text}")
        elif child.name == 'br':
            parts.append('\n')
        elif child.name in ['ul', 'ol']:
            for li in child.find_all('li', recursive=False):
                text = li.get_text(separator=' ', strip=True)
                if text:
                    parts.append(f"\n• {text}")
        elif child.name in ['strong', 'b']:
            text = child.get_text(separator=' ', strip=True)
            if text:
                parts.append(f"**{text}**")
        elif hasattr(child, 'children'):
            nested = get_text_with_structure(child)
            if nested:
                parts.append(nested)
    
    return ' '.join(parts)


def normalize_whitespace(text: str) -> str:
    """Normalize whitespace in text."""
    text = re.sub(r'[ \t]+', ' ', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


def remove_common_noise_patterns(text: str) -> str:
    """Remove common noise patterns from text."""
    patterns = [
        r'Last Updated:.*?\n',
        r'Written by.*?\n',
        r'Hits:.*?\n',
        r'Rating:.*?\n',
        r'Click the button.*?\n',
        r'Show/Hide.*?\n',
        r'IELTS Mentor.*?\n',
        r'Share this page.*',
        r'Rating \d+\.\d+ \(\d+ Votes?\)',
    ]
    for pattern in patterns:
        text = re.sub(pattern, '', text, flags=re.IGNORECASE)
    return text


def clean(source: str, item_id: str) -> Optional[dict]:
    """
    Clean raw HTML and extract main text content.
    Returns dict with cleaned text and metadata.
    """
    raw = load_raw(source, item_id)
    if not raw:
        return None
    
    logger.info(f"Cleaning: {source}/{item_id}")
    
    soup = BeautifulSoup(raw['html'], 'html.parser')
    
    # Step 1: Remove noise
    remove_noise(soup)
    
    # Step 2: Extract main content
    main = extract_main_content(soup, source)
    
    # Step 3: Get text with structure
    text = main.get_text(separator='\n', strip=True)
    
    # Step 4: Normalize and clean
    text = normalize_whitespace(text)
    text = remove_common_noise_patterns(text)
    
    return {
        'source': source,
        'item_id': item_id,
        'url': raw['metadata'].get('url', ''),
        'text': text,
        'text_length': len(text),
        'word_count': len(text.split()),
    }


def save_cleaned(data: dict) -> Optional[Path]:
    """Save cleaned text to disk."""
    source = data['source']
    item_id = data['item_id']
    
    source_dir = CLEANED_DIR / source
    source_dir.mkdir(parents=True, exist_ok=True)
    
    # Save text
    text_path = source_dir / f"{item_id}.txt"
    text_path.write_text(data['text'], encoding='utf-8')
    
    # Save metadata
    meta = {k: v for k, v in data.items() if k != 'text'}
    meta_path = source_dir / f"{item_id}.meta.json"
    meta_path.write_text(json.dumps(meta, indent=2), encoding='utf-8')
    
    logger.info(f"Saved cleaned: {text_path}")
    return text_path


def clean_and_save(source: str, item_id: str) -> Optional[dict]:
    """Clean raw HTML and save. Returns cleaned data."""
    data = clean(source, item_id)
    if data:
        save_cleaned(data)
    return data


# CLI
if __name__ == "__main__":
    import sys
    if len(sys.argv) < 3:
        print("Usage: python clean.py <source> <item_id>")
        sys.exit(1)
    
    source, item_id = sys.argv[1], sys.argv[2]
    result = clean_and_save(source, item_id)
    if result:
        print(f"✓ Cleaned: {result['word_count']} words")
    else:
        print("✗ Clean failed")
        sys.exit(1)
