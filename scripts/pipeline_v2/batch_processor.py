#!/usr/bin/env python3
"""
Batch Pipeline Processor
Parallel processing of multiple IELTS exam URLs for faster pipeline execution.
"""
import sys
import json
import concurrent.futures
from pathlib import Path
from typing import List, Dict, Optional
import time

# Add parent dir to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from orchestrator import run_pipeline, PipelineResult
from config import get_logger

logger = get_logger(__name__)


def process_single_url(url: str, skip_existing: bool = True) -> Dict:
    """Process a single URL and return result dict."""
    start_time = time.time()
    
    # Extract item_id from URL
    item_id = url.rstrip('/').split('/')[-1]
    
    # Check if already processed
    normalized_path = Path(__file__).parent.parent.parent / "data" / "normalized" / "ielts-mentor" / f"{item_id}.json"
    if skip_existing and normalized_path.exists():
        return {
            'url': url,
            'item_id': item_id,
            'status': 'SKIPPED',
            'reason': 'Already exists',
            'time_seconds': 0
        }
    
    try:
        result = run_pipeline(url, use_ai=False, skip_validation=False)
        elapsed = time.time() - start_time
        
        return {
            'url': url,
            'item_id': item_id,
            'status': 'SUCCESS' if result.success else 'FAILED',
            'sql_path': str(result.sql_path) if result.sql_path else None,
            'warnings': len(result.warnings),
            'time_seconds': round(elapsed, 2)
        }
    except Exception as e:
        elapsed = time.time() - start_time
        return {
            'url': url,
            'item_id': item_id,
            'status': 'ERROR',
            'error': str(e)[:200],
            'time_seconds': round(elapsed, 2)
        }


def batch_process(urls: List[str], max_workers: int = 3, skip_existing: bool = True) -> Dict:
    """
    Process multiple URLs in parallel.
    
    Args:
        urls: List of IELTS exam URLs to process
        max_workers: Number of parallel workers (default 3)
        skip_existing: Skip URLs that already have normalized files
        
    Returns:
        Dict with summary and individual results
    """
    logger.info(f"Starting batch process: {len(urls)} URLs with {max_workers} workers")
    start_time = time.time()
    
    results = []
    success = 0
    skipped = 0
    failed = 0
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(process_single_url, url, skip_existing): url for url in urls}
        
        for future in concurrent.futures.as_completed(futures):
            url = futures[future]
            try:
                result = future.result()
                results.append(result)
                
                if result['status'] == 'SUCCESS':
                    success += 1
                    logger.info(f"✅ {result['item_id']}: SUCCESS ({result['time_seconds']}s)")
                elif result['status'] == 'SKIPPED':
                    skipped += 1
                    logger.info(f"⏭️ {result['item_id']}: SKIPPED (exists)")
                else:
                    failed += 1
                    logger.warning(f"❌ {result['item_id']}: {result['status']}")
                    
            except Exception as e:
                failed += 1
                results.append({
                    'url': url,
                    'status': 'ERROR',
                    'error': str(e)[:200]
                })
    
    total_time = time.time() - start_time
    
    summary = {
        'total': len(urls),
        'success': success,
        'skipped': skipped,
        'failed': failed,
        'total_time_seconds': round(total_time, 2),
        'avg_time_seconds': round(total_time / max(len(urls), 1), 2),
        'success_rate': f"{(success / max(len(urls) - skipped, 1)) * 100:.1f}%"
    }
    
    logger.info(f"Batch complete: {success}/{len(urls)} SUCCESS, {skipped} SKIPPED, {failed} FAILED in {total_time:.1f}s")
    
    return {
        'summary': summary,
        'results': sorted(results, key=lambda x: x.get('item_id', ''))
    }


def extract_urls_from_listing_page(page_content: str) -> List[str]:
    """Extract IELTS exam URLs from a listing page HTML/text."""
    import re
    
    urls = []
    # Pattern for ielts-mentor reading URLs
    pattern = r'https://www\.ielts-mentor\.com/reading-sample/gt-reading/\d+-[a-z0-9-]+'
    
    for match in re.finditer(pattern, page_content, re.IGNORECASE):
        url = match.group(0)
        if url not in urls:
            urls.append(url)
    
    return urls


# CLI
if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("""
Usage:
  python batch_processor.py <url1> <url2> ...
  python batch_processor.py --file urls.txt
  python batch_processor.py --workers 5 <url1> ...
  
Options:
  --workers N     Number of parallel workers (default: 3)
  --no-skip       Don't skip existing normalized files
  --file FILE     Read URLs from file (one per line)
""")
        sys.exit(1)
    
    # Parse arguments
    urls = []
    max_workers = 3
    skip_existing = True
    
    i = 1
    while i < len(sys.argv):
        arg = sys.argv[i]
        if arg == '--workers':
            max_workers = int(sys.argv[i + 1])
            i += 2
        elif arg == '--no-skip':
            skip_existing = False
            i += 1
        elif arg == '--file':
            urls_file = Path(sys.argv[i + 1])
            urls = [line.strip() for line in urls_file.read_text().splitlines() if line.strip()]
            i += 2
        elif arg.startswith('http'):
            urls.append(arg)
            i += 1
        else:
            i += 1
    
    if not urls:
        print("No URLs provided")
        sys.exit(1)
    
    print(f"Processing {len(urls)} URLs with {max_workers} workers...")
    result = batch_process(urls, max_workers, skip_existing)
    
    print("\n" + "="*60)
    print("BATCH PROCESSING COMPLETE")
    print("="*60)
    print(json.dumps(result['summary'], indent=2))
    
    # Show failures
    failures = [r for r in result['results'] if r['status'] not in ['SUCCESS', 'SKIPPED']]
    if failures:
        print(f"\n⚠️ {len(failures)} FAILED:")
        for f in failures:
            print(f"  - {f.get('item_id', f.get('url'))}: {f.get('error', f.get('status'))}")
