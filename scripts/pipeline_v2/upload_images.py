#!/usr/bin/env python3
"""
Upload images to Cloudinary and replace URLs in exam JSON files.
Usage: python upload_images.py <source> <item_id>
"""
import cloudinary
import cloudinary.uploader
import json
import os
import re
import sys
import hashlib
import logging
from pathlib import Path
from urllib.parse import urlparse

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Cloudinary configuration
CLOUDINARY_CONFIG = {
    'cloud_name': os.environ.get('CLOUDINARY_CLOUD_NAME', 'df41zs8il'),
    'api_key': os.environ.get('CLOUDINARY_API_KEY', '842313919764698'),
    'api_secret': os.environ.get('CLOUDINARY_API_SECRET', 'g9RgScZ5eAQn9Ie2FEwmNqiSyJ8'),
}

cloudinary.config(**CLOUDINARY_CONFIG)

# Base paths
BASE_DIR = Path(__file__).parent.parent.parent
NORMALIZED_DIR = BASE_DIR / 'data' / 'normalized'
UPLOAD_CACHE_FILE = BASE_DIR / 'data' / '.cloudinary_cache.json'


def load_cache() -> dict:
    if UPLOAD_CACHE_FILE.exists():
        return json.loads(UPLOAD_CACHE_FILE.read_text())
    return {}


def save_cache(cache: dict):
    UPLOAD_CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
    UPLOAD_CACHE_FILE.write_text(json.dumps(cache, indent=2))


def url_to_public_id(url: str, folder: str = 'ielts') -> str:
    url_hash = hashlib.md5(url.encode()).hexdigest()[:12]
    parsed = urlparse(url)
    filename = Path(parsed.path).stem
    filename = re.sub(r'[^a-zA-Z0-9_-]', '_', filename)[:30]
    return f"{folder}/{filename}_{url_hash}"


def upload_to_cloudinary(url: str, cache: dict) -> str:
    if url in cache:
        logger.info(f"  [CACHE] {url[:60]}...")
        return cache[url]
    
    if 'cloudinary.com' in url:
        return url
    
    try:
        public_id = url_to_public_id(url)
        logger.info(f"  [UPLOAD] {url[:60]}...")
        
        result = cloudinary.uploader.upload(
            url,
            public_id=public_id,
            overwrite=True,
            resource_type="image",
            transformation=[
                {"quality": "auto:good"},
                {"fetch_format": "auto"}
            ]
        )
        
        new_url = result['secure_url']
        cache[url] = new_url
        logger.info(f"    -> {new_url}")
        return new_url
        
    except Exception as e:
        logger.warning(f"  [FAILED] {url}: {e}")
        return url


def process_json(source: str, item_id: str):
    json_path = NORMALIZED_DIR / source / f"{item_id}.json"
    
    if not json_path.exists():
        logger.error(f"File not found: {json_path}")
        return False
    
    logger.info(f"Processing: {json_path}")
    data = json.loads(json_path.read_text())
    cache = load_cache()
    changed = False
    
    # Process exam.image_url
    if data.get('exam', {}).get('image_url'):
        old_url = data['exam']['image_url']
        new_url = upload_to_cloudinary(old_url, cache)
        if new_url != old_url:
            data['exam']['image_url'] = new_url
            changed = True
    
    # Process sections
    for section in data.get('sections', []):
        if section.get('image_url'):
            old_url = section['image_url']
            new_url = upload_to_cloudinary(old_url, cache)
            if new_url != old_url:
                section['image_url'] = new_url
                changed = True
        
        # Helper to replace images in any markdown text
        def replace_images_in_text(text: str) -> str:
            if not text:
                return text
            nonlocal changed
            img_pattern = r'!\[([^\]]*)\]\(([^)]+)\)'
            
            def replace_img(match):
                nonlocal changed
                alt = match.group(1)
                url = match.group(2)
                new_url = upload_to_cloudinary(url, cache)
                if new_url != url:
                    changed = True
                return f'![{alt}]({new_url})'
            
            return re.sub(img_pattern, replace_img, text)

        # 1. Sections: passage_md, instruction_md, group instructions
        if section.get('passage_md'):
            section['passage_md'] = replace_images_in_text(section['passage_md'])
            
        if section.get('instruction_md'):
            section['instruction_md'] = replace_images_in_text(section['instruction_md'])
            
        for group in section.get('question_groups', []):
            if group.get('instruction_md'):
                group['instruction_md'] = replace_images_in_text(group['instruction_md'])

    # 3. Questions: prompt_md, explanation_md
    for q in data.get('questions', []):
        if q.get('prompt_md'):
            q['prompt_md'] = replace_images_in_text(q['prompt_md'])
        if q.get('explanation_md'):
            q['explanation_md'] = replace_images_in_text(q['explanation_md'])
    
    if changed:
        json_path.write_text(json.dumps(data, indent=2, ensure_ascii=False))
        logger.info(f"Updated: {json_path}")
    else:
        logger.info("No changes needed")
    
    save_cache(cache)
    return True


def main():
    if len(sys.argv) < 3:
        print("Usage: python upload_images.py <source> <item_id>")
        sys.exit(1)
    
    source = sys.argv[1]
    item_id = sys.argv[2]
    
    logger.info(f"=== Cloudinary Image Upload ===")
    logger.info(f"Cloud: {CLOUDINARY_CONFIG['cloud_name']}")
    
    success = process_json(source, item_id)
    
    if success:
        logger.info("Image upload complete!")
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()

# Can be called from orchestrator
def upload_all_images(source: str, item_id: str) -> bool:
    """Upload all images for an item to Cloudinary. Returns True on success."""
    return process_json(source, item_id)
