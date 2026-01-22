#!/usr/bin/env python3
"""
Exam Review Tool
================
Generates a human-readable summary of exam JSON for manual review.

Usage:
    python review_exam.py [JSON_FILE]
    python review_exam.py --all
"""

import json
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
OUTPUT_DIR = SCRIPT_DIR / "output"


def review_exam(data: dict) -> str:
    """Generate a review summary for an exam."""
    lines = []
    
    for exam in data.get('exams', []):
        title = exam.get('title', 'Unknown')
        slug = exam.get('slug', '')
        category = exam.get('category', '')
        level = exam.get('level', '')
        duration = exam.get('durationMin', 0)
        
        lines.extend([
            "=" * 60,
            f"EXAM: {title}",
            "=" * 60,
            f"Slug: {slug}",
            f"Category: {category} | Level: {level} | Duration: {duration}min",
            "",
        ])
        
        for section in exam.get('sections', []):
            lines.extend(_review_section(section))
    
    return "\n".join(lines)


def _review_section(section: dict) -> list[str]:
    """Generate review for a section."""
    lines = []
    
    title = section.get('title', 'Section')
    instructions = section.get('instructionsMd', '')
    questions = section.get('questions', [])
    
    lines.extend([
        "-" * 50,
        f"SECTION: {title}",
        f"Questions: {len(questions)}",
        "-" * 50,
        "",
    ])
    
    # Passage preview
    if instructions:
        preview = instructions[:400] + "..." if len(instructions) > 400 else instructions
        lines.extend([
            "PASSAGE PREVIEW:",
            preview.replace('\n', '\n  '),
            "",
        ])
    
    # Group questions by type
    q_by_type = {}
    for q in questions:
        q_type = q.get('type', 'UNKNOWN')
        if q_type not in q_by_type:
            q_by_type[q_type] = []
        q_by_type[q_type].append(q)
    
    lines.append("QUESTIONS BY TYPE:")
    for q_type, qs in q_by_type.items():
        indices = [str(q.get('idx', '?')) for q in qs]
        lines.append(f"  {q_type}: Q{', Q'.join(indices)} ({len(qs)} questions)")
    
    lines.append("")
    
    # Sample questions
    lines.append("SAMPLE QUESTIONS:")
    shown_types = set()
    for q in questions[:5]:  # Show first 5
        q_type = q.get('type', '')
        if q_type not in shown_types:
            shown_types.add(q_type)
            idx = q.get('idx', '?')
            prompt = q.get('promptMd', '')[:100]
            lines.append(f"  Q{idx} [{q_type}]: {prompt}...")
    
    lines.append("")
    
    # Check for potential issues
    issues = []
    if len(instructions) < 200:
        issues.append("⚠ Passage seems very short")
    if len(questions) < 5:
        issues.append("⚠ Very few questions")
    
    # Check for noise patterns
    noise_patterns = ['SHARE THIS PAGE', 'CONTACT US', 'cookie', 'While using this site']
    for pattern in noise_patterns:
        if pattern.lower() in instructions.lower():
            issues.append(f"❌ NOISE DETECTED: '{pattern}'")
    
    if issues:
        lines.append("ISSUES:")
        for issue in issues:
            lines.append(f"  {issue}")
        lines.append("")
    
    return lines


def review_file(filepath: str):
    """Review a single JSON file."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        print(f"Error loading {filepath}: {e}")
        return
    
    print(review_exam(data))


def review_all():
    """Review all JSON files in output directory."""
    if not OUTPUT_DIR.exists():
        print(f"Output directory not found: {OUTPUT_DIR}")
        return
    
    for json_file in sorted(OUTPUT_DIR.glob("*.json")):
        print(f"\n{'#' * 70}")
        print(f"# FILE: {json_file.name}")
        print(f"{'#' * 70}\n")
        review_file(str(json_file))


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return
    
    if sys.argv[1] == '--all':
        review_all()
    else:
        review_file(sys.argv[1])


if __name__ == "__main__":
    main()
