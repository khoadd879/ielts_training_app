#!/usr/bin/env python3
"""
Full IELTS Reading Test Pipeline

Crawl 3 passages individually → Merge into 1 full test → Seed database

Usage:
    python full_test_pipeline.py \\
        --p1 "URL1" --h1 "Q1-5:TFNG,Q6-13:SUMMARY" \\
        --p2 "URL2" --h2 "Q14-18:MATCHING" \\
        --p3 "URL3" --h3 "Q27-32:MCQ" \\
        --title "IELTS Academic Reading Test 120" \\
        --output reading-full-test-120

Example:
    python full_test_pipeline.py \\
        --p1 "https://www.ielts-mentor.com/reading-sample/academic-reading/3753-nutmeg-a-valuable-spice" \\
        --p2 "https://www.ielts-mentor.com/reading-sample/academic-reading/3754-driverless-cars" \\
        --p3 "https://www.ielts-mentor.com/reading-sample/academic-reading/3755-what-is-exploration" \\
        --title "IELTS Academic Reading Test 119" \\
        --output reading-full-test-119
"""
import sys
import json
import argparse
import subprocess
from pathlib import Path

from config import get_logger, detect_source, SEEDS_DIR
from fetch import extract_id

logger = get_logger(__name__)

DATA_DIR = Path(__file__).parent.parent.parent / "data"
NORMALIZED_DIR = DATA_DIR / "normalized"


def parse_hints(hints_str: str) -> dict:
    """Parse hints string like 'Q1-5:TFNG,Q6-13:SUMMARY' into dict."""
    hints = {}
    if not hints_str:
        return hints
    for part in hints_str.split(','):
        if ':' in part:
            q_range, q_type = part.split(':', 1)
            hints[q_range.strip()] = q_type.strip()
    return hints


def run_single_pipeline(url: str, hints: dict = None) -> tuple[str, str, bool]:
    """
    Run orchestrator for a single passage.
    Returns: (source, item_id, success)
    """
    source = detect_source(url)
    item_id = extract_id(url, source)
    
    logger.info(f"Processing: {item_id}")
    
    # Build command
    cmd = ['python', 'orchestrator.py', url]
    
    if hints:
        hints_str = ','.join([f"{k}:{v}" for k, v in hints.items()])
        cmd.append(f'--hints={hints_str}')
    
    # Run pipeline
    result = subprocess.run(cmd, capture_output=True, text=True, cwd=Path(__file__).parent)
    
    success = result.returncode == 0
    if not success:
        logger.error(f"Pipeline failed for {item_id}")
        logger.error(result.stderr[-500:] if result.stderr else "No error output")
    
    return source, item_id, success


def merge_and_export(source: str, item_ids: list, title: str, output_id: str) -> bool:
    """Merge passages and export to database."""
    from merge_full_test import merge_passages
    from multi_section_export import export_multi_section
    
    # Merge
    merged = merge_passages(source, item_ids, title, output_id)
    
    # Save merged JSON
    output_dir = NORMALIZED_DIR / source
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / f"{output_id}.json"
    output_path.write_text(json.dumps(merged, indent=2, ensure_ascii=False), encoding='utf-8')
    logger.info(f"Saved merged JSON: {output_path}")
    
    # Export SQL
    sql_path = export_multi_section(merged, output_id)
    logger.info(f"Exported SQL: {sql_path}")
    
    return True


def seed_database(sql_path: Path) -> bool:
    """Seed the database with generated SQL."""
    import os
    os.environ['PGPASSWORD'] = 'exam'
    
    result = subprocess.run([
        'psql', '-h', 'localhost', '-p', '5433', '-U', 'exam', '-d', 'exam-db',
        '-f', str(sql_path)
    ], capture_output=True, text=True)
    
    return result.returncode == 0


def main():
    parser = argparse.ArgumentParser(description="Full IELTS Reading Test Pipeline")
    
    # Passage URLs
    parser.add_argument('--p1', required=True, help='URL for passage 1 (Q1-13)')
    parser.add_argument('--p2', required=True, help='URL for passage 2 (Q14-26)')
    parser.add_argument('--p3', required=True, help='URL for passage 3 (Q27-40)')
    
    # Hints for each passage
    parser.add_argument('--h1', default='', help='Hints for passage 1')
    parser.add_argument('--h2', default='', help='Hints for passage 2')
    parser.add_argument('--h3', default='', help='Hints for passage 3')
    
    # Output config
    parser.add_argument('--title', default='IELTS Academic Reading Full Test', help='Test title')
    parser.add_argument('--output', required=True, help='Output ID (e.g., reading-full-test-120)')
    parser.add_argument('--no-seed', action='store_true', help='Skip database seeding')
    
    args = parser.parse_args()
    
    print("╔" + "═" * 60 + "╗")
    print("║         FULL IELTS READING TEST PIPELINE                 ║")
    print("╠" + "═" * 60 + "╣")
    print(f"║ Passage 1: {args.p1[:45]}...")
    print(f"║ Passage 2: {args.p2[:45]}...")
    print(f"║ Passage 3: {args.p3[:45]}...")
    print("╚" + "═" * 60 + "╝")
    
    passages = [
        (args.p1, parse_hints(args.h1)),
        (args.p2, parse_hints(args.h2)),
        (args.p3, parse_hints(args.h3)),
    ]
    
    # Step 1: Run pipeline for each passage
    item_ids = []
    source = None
    
    for i, (url, hints) in enumerate(passages, 1):
        print(f"\n📄 [{i}/3] Processing Passage {i}...")
        src, item_id, success = run_single_pipeline(url, hints)
        
        if not success:
            print(f"❌ Passage {i} failed! Check logs.")
            return 1
        
        source = src
        item_ids.append(item_id)
        print(f"   ✓ {item_id}")
    
    # Step 2: Merge
    print(f"\n🔗 Merging {len(item_ids)} passages...")
    merge_and_export(source, item_ids, args.title, args.output)
    print(f"   ✓ Merged as: {args.output}")
    
    # Step 3: Seed database
    if not args.no_seed:
        sql_path = SEEDS_DIR / f"seed_exam_ielts-mentor-{args.output}.sql"
        print(f"\n💾 Seeding database...")
        if seed_database(sql_path):
            print(f"   ✓ Database seeded")
        else:
            print(f"   ⚠ Database seeding failed (non-blocking)")
    
    print(f"\n" + "═" * 60)
    print(f"✅ FULL TEST PIPELINE COMPLETE!")
    print(f"   Title: {args.title}")
    print(f"   Slug: ielts-mentor-{args.output}")
    print(f"   Questions: 40 (Q1-13 + Q14-26 + Q27-40)")
    print("═" * 60)
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
