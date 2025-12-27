#!/usr/bin/env python3
"""
Clean noise from existing SQL seed files.
Removes footer content from ielts-writing.info passages.
ONLY modifies the InstructionsMd field, not PromptMd fields.
"""

import os
import glob
import re

SEEDS_DIR = "/home/khoa/RiderProjects/Project_Langfens_Microservice/deploy/seeds"

def clean_sql_file(filepath: str) -> bool:
    """Clean noise from a single SQL file. Returns True if modified."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Only process ielts-writing.info files
    if 'ielts-writing.info' not in content:
        return False
    
    original = content
    
    # Find the InstructionsMd passage block ONLY
    # It starts with E'# Passage and ends with ');
    # We need to be very careful to only modify this specific section
    
    passage_pattern = r"(E'# Passage\\n\\n)(.*?)(\\nSHARE THIS PAGE.*?)('\s*\n\s*\);)"
    
    def clean_passage_match(match):
        prefix = match.group(1)
        passage_content = match.group(2)
        # noise = match.group(3)  # We remove this
        suffix = match.group(4)
        
        # Clean × at start
        passage_content = re.sub(r'^×\\n', '', passage_content)
        
        return f"{prefix}{passage_content}{suffix}"
    
    # Apply the cleaning - DOTALL for multiline
    content = re.sub(passage_pattern, clean_passage_match, content, flags=re.DOTALL)
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    
    return False


def main():
    sql_files = glob.glob(os.path.join(SEEDS_DIR, "seed_exam_ielts-reading-sample-*.sql"))
    
    modified = 0
    for filepath in sql_files:
        filename = os.path.basename(filepath)
        if clean_sql_file(filepath):
            print(f"Cleaned: {filename}")
            modified += 1
        else:
            print(f"No change: {filename}")
    
    print(f"\nTotal modified: {modified}")


if __name__ == "__main__":
    main()
