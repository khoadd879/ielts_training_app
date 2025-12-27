#!/usr/bin/env python3
"""
Pipeline Cache Manager
Provides caching and incremental processing capabilities for the IELTS pipeline.
"""
import json
import hashlib
import time
from pathlib import Path
from typing import Optional, Dict, Any
from dataclasses import dataclass
from datetime import datetime

from config import get_logger

logger = get_logger(__name__)

# Cache directory
CACHE_DIR = Path(__file__).parent.parent.parent / "data" / ".cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)


@dataclass
class CacheEntry:
    """Cache entry metadata."""
    url: str
    item_id: str
    source: str
    html_hash: str
    processed_at: str
    pipeline_version: str
    stages_completed: list


def get_url_hash(url: str) -> str:
    """Get hash of URL for cache key."""
    return hashlib.md5(url.encode()).hexdigest()[:12]


def get_file_hash(filepath: Path) -> Optional[str]:
    """Get hash of file content."""
    if not filepath.exists():
        return None
    content = filepath.read_bytes()
    return hashlib.md5(content).hexdigest()[:16]


def get_cache_path(source: str, item_id: str) -> Path:
    """Get path to cache file for an item."""
    return CACHE_DIR / source / f"{item_id}.cache.json"


def load_cache(source: str, item_id: str) -> Optional[Dict]:
    """Load cache entry for an item."""
    cache_path = get_cache_path(source, item_id)
    if cache_path.exists():
        try:
            return json.loads(cache_path.read_text())
        except:
            return None
    return None


def save_cache(source: str, item_id: str, cache_data: Dict) -> None:
    """Save cache entry for an item."""
    cache_path = get_cache_path(source, item_id)
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    cache_path.write_text(json.dumps(cache_data, indent=2))


def is_cache_valid(source: str, item_id: str, raw_html_path: Optional[Path] = None) -> bool:
    """
    Check if cache is valid (HTML hasn't changed since last processing).
    
    Returns True if:
    - Cache exists
    - HTML file hash matches cached hash
    - All pipeline stages were completed
    """
    cache = load_cache(source, item_id)
    if not cache:
        return False
    
    # Check if raw HTML has changed
    if raw_html_path and raw_html_path.exists():
        current_hash = get_file_hash(raw_html_path)
        if current_hash != cache.get('html_hash'):
            return False
    
    # Check if all stages completed
    required_stages = ['fetch', 'clean', 'extract', 'normalize', 'validate', 'repair', 'export']
    completed = cache.get('stages_completed', [])
    if not all(s in completed for s in required_stages):
        return False
    
    return True


def update_cache(source: str, item_id: str, url: str, stage: str, 
                 html_hash: Optional[str] = None, version: str = "2.0") -> None:
    """Update cache after completing a pipeline stage."""
    cache = load_cache(source, item_id) or {
        'url': url,
        'item_id': item_id,
        'source': source,
        'html_hash': html_hash,
        'processed_at': datetime.now().isoformat(),
        'pipeline_version': version,
        'stages_completed': []
    }
    
    if html_hash:
        cache['html_hash'] = html_hash
    
    if stage not in cache['stages_completed']:
        cache['stages_completed'].append(stage)
    
    cache['last_updated'] = datetime.now().isoformat()
    save_cache(source, item_id, cache)


def clear_cache(source: Optional[str] = None, item_id: Optional[str] = None) -> int:
    """
    Clear cache entries.
    
    Args:
        source: Clear all cache for this source (optional)
        item_id: Clear specific item cache (requires source)
        
    Returns:
        Number of cache entries cleared
    """
    count = 0
    
    if source and item_id:
        cache_path = get_cache_path(source, item_id)
        if cache_path.exists():
            cache_path.unlink()
            count = 1
    elif source:
        source_dir = CACHE_DIR / source
        if source_dir.exists():
            for f in source_dir.glob("*.cache.json"):
                f.unlink()
                count += 1
    else:
        for source_dir in CACHE_DIR.iterdir():
            if source_dir.is_dir():
                for f in source_dir.glob("*.cache.json"):
                    f.unlink()
                    count += 1
    
    logger.info(f"Cleared {count} cache entries")
    return count


def get_cache_stats() -> Dict:
    """Get cache statistics."""
    stats = {
        'total_entries': 0,
        'sources': {},
        'total_size_kb': 0
    }
    
    for source_dir in CACHE_DIR.iterdir():
        if source_dir.is_dir():
            source = source_dir.name
            cache_files = list(source_dir.glob("*.cache.json"))
            stats['sources'][source] = len(cache_files)
            stats['total_entries'] += len(cache_files)
            for f in cache_files:
                stats['total_size_kb'] += f.stat().st_size / 1024
    
    stats['total_size_kb'] = round(stats['total_size_kb'], 2)
    return stats


# CLI
if __name__ == '__main__':
    import sys
    
    if len(sys.argv) < 2:
        print("""
Usage:
  python cache_manager.py stats          # Show cache statistics
  python cache_manager.py clear          # Clear all cache
  python cache_manager.py clear <source> # Clear source cache
  python cache_manager.py check <source> <item_id>  # Check cache validity
""")
        sys.exit(0)
    
    cmd = sys.argv[1]
    
    if cmd == 'stats':
        stats = get_cache_stats()
        print(json.dumps(stats, indent=2))
    
    elif cmd == 'clear':
        source = sys.argv[2] if len(sys.argv) > 2 else None
        count = clear_cache(source)
        print(f"Cleared {count} cache entries")
    
    elif cmd == 'check':
        if len(sys.argv) < 4:
            print("Usage: python cache_manager.py check <source> <item_id>")
            sys.exit(1)
        source, item_id = sys.argv[2], sys.argv[3]
        valid = is_cache_valid(source, item_id)
        print(f"Cache valid: {valid}")
        cache = load_cache(source, item_id)
        if cache:
            print(json.dumps(cache, indent=2))
