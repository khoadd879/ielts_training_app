#!/usr/bin/env python3
"""Utility to re-embed images into normalized data after fix scripts"""
import json
import re
import sys
from pathlib import Path

def reembed_images(source: str, item_id: str):
    """Re-embed images from extracted data into normalized passage_md."""
    extracted_path = Path(f"/home/khoa/RiderProjects/Project_Langfens_Microservice/data/extracted/{source}/{item_id}.json")
    normalized_path = Path(f"/home/khoa/RiderProjects/Project_Langfens_Microservice/data/normalized/{source}/{item_id}.json")
    
    if not extracted_path.exists() or not normalized_path.exists():
        print(f"❌ Files not found: {extracted_path} or {normalized_path}")
        return False
    
    extracted = json.loads(extracted_path.read_text())
    normalized = json.loads(normalized_path.read_text())
    
    content_images = extracted.get('content_images', {})
    if not content_images or not content_images.get('all_images'):
        print("ⓘ No content images found in extracted data")
        return True
    
    passage = normalized['sections'][0]['passage_md']
    image_url = normalized.get('exam', {}).get('image_url', '')
    
    # Check which images are already in passage
    existing_imgs = set(re.findall(r'\(https?://[^\)]+\.(jpg|png|gif)\)', passage))
    
    # Skip patterns
    skip_patterns = ['remove_format', 'Dictionary', 'highlight', 'favicon', 'icon', 'logo', 'avatar']
    
    sections_to_add = []
    added_urls = set()
    
    # Add question-specific images
    question_images = content_images.get('question_images', {})
    for q_range, urls in question_images.items():
        for url in urls:
            if url in str(existing_imgs) or url in added_urls:
                continue
            if any(skip in url for skip in skip_patterns):
                continue
            if url == image_url:  # Skip cover image
                continue
            sections_to_add.append(f"\n---\n\n## Diagram/Image for Questions {q_range}\n\n![Questions {q_range}]({url})\n")
            added_urls.add(url)
            print(f"✓ Added image for Q{q_range}: {url}")
    
    # Add diagram images
    for url in content_images.get('diagram_images', []):
        if url in str(existing_imgs) or url in added_urls:
            continue
        if any(skip in url for skip in skip_patterns):
            continue
        if url == image_url:
            continue
        sections_to_add.append(f"\n---\n\n## Diagram\n\n![Diagram]({url})\n")
        added_urls.add(url)
        print(f"✓ Added diagram: {url}")
    
    # Add to passage
    if sections_to_add:
        passage = passage + ''.join(sections_to_add)
        normalized['sections'][0]['passage_md'] = passage
        normalized_path.write_text(json.dumps(normalized, indent=2, ensure_ascii=False))
        print(f"✓ Saved {len(sections_to_add)} new image(s) to: {normalized_path}")
    else:
        print("ⓘ All images already present or filtered")
    
    return True

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python reembed_images.py <source> <item_id>")
        sys.exit(1)
    
    source = sys.argv[1]
    item_id = sys.argv[2]
    success = reembed_images(source, item_id)
    sys.exit(0 if success else 1)
