#!/usr/bin/env python3
"""
Merge multiple passages into a single full IELTS Reading Test.

Usage:
    python merge_full_test.py item_id1 item_id2 item_id3 --title "Full Test Title" --output merged_id
    
Example:
    python merge_full_test.py \
        3753-nutmeg-a-valuable-spice \
        3754-driverless-cars \
        3755-what-is-exploration \
        --title "IELTS Academic Reading Full Test" \
        --output full-test-119
"""
import json
import sys
import argparse
from pathlib import Path
from typing import List

from config import get_logger
from export import export_sql

logger = get_logger(__name__)

DATA_DIR = Path(__file__).parent.parent.parent / "data"
NORMALIZED_DIR = DATA_DIR / "normalized"


def load_normalized(source: str, item_id: str) -> dict:
    """Load normalized JSON data."""
    path = NORMALIZED_DIR / source / f"{item_id}.json"
    if not path.exists():
        raise FileNotFoundError(f"Not found: {path}")
    return json.loads(path.read_text(encoding='utf-8'))


def merge_passages(source: str, item_ids: List[str], title: str, output_id: str) -> dict:
    """
    Merge multiple single-passage exams into one full test.
    
    IMPORTANT: Passages are expected to already have correct global indices:
    - Passage 1: Q1-13
    - Passage 2: Q14-26  
    - Passage 3: Q27-40
    
    We preserve all indices as-is and only update section idx.
    """
    merged = {
        "exam": {
            "title": title,
            "slug": output_id,
            "category": "IELTS",
            "level": "B2",
            "duration_min": 60,  # Full reading test = 60 min
            "audio_url": "",
            "image_url": ""
        },
        "sections": [],
        "questions": [],
        "_metadata": {
            "source": source,
            "item_id": output_id,
            "url": f"merged:{','.join(item_ids)}",
            "normalized_by": "merge_full_test.py"
        }
    }
    
    for section_idx, item_id in enumerate(item_ids, 1):
        logger.info(f"Loading section {section_idx}: {item_id}")
        data = load_normalized(source, item_id)
        
        # Get original section (usually just 1)
        orig_section = data["sections"][0]
        orig_questions = data["questions"]
        
        # Get question range from the first and last question
        first_idx = orig_questions[0]["idx"] if orig_questions else 1
        last_idx = orig_questions[-1]["idx"] if orig_questions else 1
        logger.info(f"  → {len(orig_questions)} questions (Q{first_idx} - Q{last_idx})")
        
        # Create new section - preserve title from original 
        new_section = {
            "idx": section_idx,
            "title": orig_section.get("title", item_id),
            "passage_md": orig_section.get("passage_md", ""),
            "instruction_md": orig_section.get("instruction_md", ""),
            "audio_url": orig_section.get("audio_url", ""),
            "question_groups": []
        }
        
        # Preserve question_groups exactly as-is (they already have correct indices)
        for grp in orig_section.get("question_groups", []):
            new_grp = {
                "idx": grp["idx"],
                "start_idx": grp["start_idx"],
                "end_idx": grp["end_idx"],
                "instruction_md": grp.get("instruction_md", "")
            }
            new_section["question_groups"].append(new_grp)
        
        merged["sections"].append(new_section)
        
        # Add questions exactly as-is (preserve original indices)
        for q in orig_questions:
            merged["questions"].append(q.copy())
    
    # Sort questions by idx to ensure order
    merged["questions"].sort(key=lambda x: x["idx"])
    
    logger.info(f"Merged: {len(merged['sections'])} sections, {len(merged['questions'])} questions")
    
    return merged


def main():
    parser = argparse.ArgumentParser(description="Merge passages into full IELTS test")
    parser.add_argument("item_ids", nargs="+", help="Item IDs to merge")
    parser.add_argument("--source", default="ielts-mentor", help="Source name")
    parser.add_argument("--title", default="IELTS Academic Reading Full Test", help="Test title")
    parser.add_argument("--output", required=True, help="Output item ID")
    
    args = parser.parse_args()
    
    print(f"╔{'═' * 60}╗")
    print(f"║ MERGE FULL TEST: {len(args.item_ids)} passages")
    print(f"╚{'═' * 60}╝")
    
    # Merge data
    merged = merge_passages(args.source, args.item_ids, args.title, args.output)
    
    # Save merged JSON
    output_dir = NORMALIZED_DIR / args.source
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / f"{args.output}.json"
    output_path.write_text(json.dumps(merged, indent=2, ensure_ascii=False), encoding='utf-8')
    print(f"✓ Saved merged JSON: {output_path}")
    
    # Export SQL
    sql_path = export_sql(args.source, args.output)
    if sql_path:
        print(f"✓ Exported SQL: {sql_path}")
    else:
        print("✗ SQL export failed")
        return 1
    
    print(f"\n✅ MERGE COMPLETE!")
    print(f"   Sections: {len(merged['sections'])}")
    print(f"   Questions: {len(merged['questions'])}")
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
