#!/usr/bin/env python3
"""
Stage 2: Extract
Extracts passages, questions, and answers from raw HTML.
IMPORTS extraction logic from old crawlers (ieltsmentor, ieltswriting).
"""
import json
import re
import importlib.util
from bs4 import BeautifulSoup
from pathlib import Path
from typing import Optional

from config import RAW_DIR, EXTRACTED_DIR, get_logger

logger = get_logger(__name__)

# Import old crawler modules
def load_crawler_module(name: str, filename: str):
    """Load old crawler module dynamically."""
    try:
        spec = importlib.util.spec_from_file_location(
            name,
            Path(__file__).parent.parent / "crawler" / filename
        )
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module
    except Exception as e:
        logger.error(f"Failed to import {filename}: {e}")
        return None

crawler_ieltsmentor = load_crawler_module("crawler_ieltsmentor", "crawler-ieltsmentor.py")
crawler_ieltswriting = load_crawler_module("crawler_ieltswriting", "crawler-ieltswriting.py")
crawler_miniielts = load_crawler_module("crawler_miniielts", "crawler-miniielts.py")

if crawler_ieltsmentor:
    logger.info("Successfully imported crawler-ieltsmentor.py")
if crawler_ieltswriting:
    logger.info("Successfully imported crawler-ieltswriting.py")
if crawler_miniielts:
    logger.info("Successfully imported crawler-miniielts.py")


def extract_audio_url(soup) -> Optional[str]:
    """
    Extract audio URL from HTML with multiple fallback patterns.
    
    Patterns checked (in order):
    1. <iframe src="...youtube.com/embed/...">
    2. <iframe data-src="...youtube.com/embed/...">
    3. data-youtube-id attribute
    4. Direct youtube.com/embed links in HTML text
    5. youtu.be short links
    """
    if not soup:
        return None
    
    # Pattern 1: Standard iframe with youtube.com
    for iframe in soup.find_all('iframe'):
        src = iframe.get('src') or iframe.get('data-src') or ''
        if 'youtube.com' in src or 'youtu.be' in src:
            return src
    
    # Pattern 2: data-youtube-id attribute
    for elem in soup.find_all(attrs={'data-youtube-id': True}):
        video_id = elem.get('data-youtube-id')
        if video_id:
            return f"https://www.youtube.com/embed/{video_id}"
    
    # Pattern 3: youtubeId or videoId in data attributes
    for elem in soup.find_all(attrs={'data-video-id': True}):
        video_id = elem.get('data-video-id')
        if video_id:
            return f"https://www.youtube.com/embed/{video_id}"
    
    # Pattern 4: YouTube embed URL in text/scripts
    html_text = str(soup)
    
    # Match youtube.com/embed/VIDEO_ID
    embed_match = re.search(r'youtube\.com/embed/([a-zA-Z0-9_-]{11})', html_text)
    if embed_match:
        video_id = embed_match.group(1)
        return f"https://www.youtube.com/embed/{video_id}"
    
    # Match youtu.be/VIDEO_ID
    short_match = re.search(r'youtu\.be/([a-zA-Z0-9_-]{11})', html_text)
    if short_match:
        video_id = short_match.group(1)
        return f"https://www.youtube.com/embed/{video_id}"
    
    # Match youtube.com/watch?v=VIDEO_ID
    watch_match = re.search(r'youtube\.com/watch\?v=([a-zA-Z0-9_-]{11})', html_text)
    if watch_match:
        video_id = watch_match.group(1)
        return f"https://www.youtube.com/embed/{video_id}"
    
    return None


def extract_image_url(soup, base_url: str = '') -> Optional[str]:
    """
    Extract thumbnail/cover image URL from HTML.
    
    Patterns checked (in order):
    1. Open Graph og:image meta tag (best for thumbnails)
    2. twitter:image meta tag
    3. First img with class containing 'thumb', 'cover', 'featured'
    4. First img in .card, .thumbnail, .featured-image
    5. First large img (width > 200 or no width specified)
    """
    if not soup:
        return None
    
    # Pattern 1: Open Graph og:image
    og_image = soup.find('meta', property='og:image')
    if og_image and og_image.get('content'):
        return og_image['content']
    
    # Pattern 2: twitter:image
    twitter_image = soup.find('meta', {'name': 'twitter:image'})
    if twitter_image and twitter_image.get('content'):
        return twitter_image['content']
    
    # Pattern 3: img with thumbnail-like class
    for img in soup.find_all('img'):
        img_class = ' '.join(img.get('class', []))
        if any(kw in img_class.lower() for kw in ['thumb', 'cover', 'featured', 'hero', 'banner']):
            src = img.get('src') or img.get('data-src')
            if src:
                return make_absolute_url(src, base_url)
    
    # Pattern 4: img in specific containers
    for container_class in ['.card-img', '.thumbnail', '.featured-image', '.post-image', '.exam-image']:
        container = soup.select_one(container_class)
        if container:
            img = container.find('img') if container.name != 'img' else container
            if img:
                src = img.get('src') or img.get('data-src')
                if src:
                    return make_absolute_url(src, base_url)
    
    # Pattern 5: First content img (not icons/logos)
    for img in soup.select('article img, .content img, .post img, main img'):
        src = img.get('src') or img.get('data-src') or ''
        width = img.get('width', '')
        # Skip small icons and logos
        if width and int(width) < 100:
            continue
        if any(skip in src.lower() for skip in ['icon', 'logo', 'avatar', 'emoji']):
            continue
        if src:
            return make_absolute_url(src, base_url)
    
    return None


def make_absolute_url(url: str, base_url: str) -> str:
    """Convert relative URL to absolute."""
    if not url:
        return ''
    if url.startswith('http://') or url.startswith('https://'):
        return url
    if url.startswith('//'):
        return 'https:' + url
    if url.startswith('/'):
        # Extract domain from base_url
        import re
        match = re.match(r'(https?://[^/]+)', base_url)
        if match:
            return match.group(1) + url
    return url


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
    
    return {'html': html, 'metadata': metadata, 'source': source, 'item_id': item_id}


def extract_ielts_mentor(html: str, url: str) -> dict:
    """
    Extract data using ielts-mentor crawler functions.
    Matches the EXACT flow from old crawler main block.
    """
    c = crawler_ieltsmentor  # alias
    soup = BeautifulSoup(html, 'html.parser')
    
    # Use OLD CRAWLER functions - exact same flow as main block
    title = c.extract_title(soup)
    exam_id = c.extract_exam_id(url)
    passages = c.extract_passages(soup)
    answers = c.extract_answers(soup)
    question_texts = c.extract_question_texts(soup)
    heading_options = c.extract_heading_options(soup)
    
    # extract_questions takes: soup, answers, question_texts, heading_options
    questions = c.extract_questions(soup, answers, question_texts, heading_options)
    
    return {
        'title': title,
        'exam_id': exam_id,
        'passages': passages,
        'questions': questions,
        'answers': answers,
        'heading_options': heading_options,
    }


def extract_ielts_writing(html: str, url: str) -> dict:
    """
    Extract data using ielts-writing crawler functions.
    """
    c = crawler_ieltswriting  # alias
    soup = BeautifulSoup(html, 'html.parser')
    
    # Use OLD CRAWLER functions
    title = c.extract_title(soup)
    exam_id = c.extract_exam_id(url)
    passages = c.extract_passages(soup)
    answers = c.extract_answers(soup)
    question_texts = c.extract_question_texts(soup)
    heading_options = c.extract_heading_options(soup)
    
    questions = c.extract_questions(soup, answers, question_texts, heading_options)
    
    return {
        'title': title,
        'exam_id': exam_id,
        'passages': passages,
        'questions': questions,
        'answers': answers,
        'heading_options': heading_options,
    }


def extract_mini_ielts(html: str, url: str, solution_html: str = None) -> dict:
    """Extract data using mini-ielts crawler functions."""
    c = crawler_miniielts
    soup = BeautifulSoup(html, 'html.parser')
    
    # Extract data directly from soup
    meta_question_types = c._extract_meta_question_types(soup)
    title = c._extract_title(soup)
    passage = c._extract_passage(soup)
    questions = c._extract_questions(soup, meta_question_types)
    
    # Get answers from solution page
    answers = {}
    transcript = ''
    if solution_html:
        solution_soup = BeautifulSoup(solution_html, 'html.parser')
        
        # Extract answers from solution table
        answer_table = solution_soup.find('table', class_='table-answer')
        if not answer_table:
            answer_table = solution_soup.find('table', class_='table-bordered')
        
        if answer_table:
            for row in answer_table.find_all('tr'):
                for cell in row.find_all('td'):
                    text = cell.get_text(strip=True)
                    match = re.match(r'^(\d+)[\.:\s]+(.+)$', text)
                    if match:
                        q_idx = int(match.group(1))
                        answer = match.group(2).strip()
                        answers[q_idx] = answer
                        logger.info(f"  Extracted Q{q_idx}: {answer}")
        
        # Extract transcript
        exam_review = solution_soup.find('div', class_='exam-review')
        if exam_review:
            transcript = exam_review.get_text(separator='\n', strip=True)
    
    # Apply answers to questions
    for q in questions:
        q_idx = q.get('idx')
        if q_idx in answers:
            q['correct_answer'] = answers[q_idx]
    
    # Extract YouTube audio URL - multiple patterns for robustness
    audio_url = extract_audio_url(soup)
    
    # Also try from solution page
    if not audio_url and solution_html:
        audio_url = extract_audio_url(solution_soup)
    
    # Detect exam type from URL or audio presence
    exam_type = 'reading'
    if '/listening/' in url or audio_url:
        exam_type = 'listening'
    
    # Extract thumbnail/cover image
    image_url = extract_image_url(soup, url)
    
    return {
        "url": url,
        "title": title,
        "passage": passage,
        "questions": questions,
        "answers": answers,
        "transcript": transcript,
        "audio_url": audio_url,
        "image_url": image_url,  # Thumbnail/cover image
        "exam_type": exam_type,
        "content_images": extract_content_images(soup, url)
    }




def apply_question_type_hints(questions: list, hints: dict) -> list:
    """
    Apply user-provided type hints to questions.
    
    Args:
        questions: List of extracted questions
        hints: Dict mapping question ranges to types, e.g. {"Q1-2": "MCQ_MULTIPLE", "Q3-7": "SUMMARY_COMPLETION"}
    
    Returns:
        Updated questions list with corrected types
    """
    if not hints:
        return questions
    
    # Parse hints into individual question mappings
    q_type_map = {}
    for q_range, q_type in hints.items():
        # Parse range like "Q1-2" or "1-2" or "Q5"
        range_str = q_range.upper().replace('Q', '').strip()
        if '-' in range_str:
            start, end = range_str.split('-')
            for i in range(int(start), int(end) + 1):
                q_type_map[i] = q_type.upper()
        else:
            q_type_map[int(range_str)] = q_type.upper()
    
    # Apply type overrides
    for q in questions:
        idx = q.get('idx', 0)
        if idx in q_type_map:
            old_type = q.get('type', '')
            new_type = q_type_map[idx]
            if old_type != new_type:
                logger.info(f"Q{idx}: Type override {old_type} -> {new_type} (from hints)")
                q['type'] = new_type
    
    return questions


def extract(source: str, item_id: str, hints: dict = None) -> Optional[dict]:
    """
    Extract structured data from raw HTML.
    Uses OLD CRAWLER extraction functions.
    """
    raw = load_raw(source, item_id)
    if not raw:
        return None
    
    logger.info(f"Extracting: {source}/{item_id}")
    
    url = raw['metadata'].get('url', '')
    html = raw['html']
    
    if source == 'ielts-mentor':
        extracted = extract_ielts_mentor(html, url)
    elif source == 'ielts-writing':
        extracted = extract_ielts_writing(html, url)
    elif source == 'mini-ielts':
        solution_html = raw.get('metadata', {}).get('solution_html', '')
        extracted = extract_mini_ielts(html, url, solution_html)
    else:
        logger.error(f"Unknown source: {source}")
        return None
    
    # Add metadata
    extracted['source'] = source
    extracted['item_id'] = item_id
    extracted['url'] = url
    
    # Add raw text for enhanced parsing (from cleaned file if exists)
    cleaned_path = Path(__file__).parent.parent.parent / "data" / "cleaned" / source / f"{item_id}.txt"
    if cleaned_path.exists():
        extracted['_raw_text'] = cleaned_path.read_text(encoding='utf-8')
        logger.info(f"Added _raw_text from cleaned file ({len(extracted['_raw_text'])} chars)")
    
    # Add raw HTML for answer extraction (cleaned text may strip answers)
    extracted['_raw_html'] = html
    
    # Apply user-provided type hints if any
    if hints and 'questions' in extracted:
        extracted['questions'] = apply_question_type_hints(extracted['questions'], hints)
        logger.info(f"Applied {len(hints)} type hints to questions")
    
    return extracted


def save_extracted(data: dict) -> Optional[Path]:
    """Save extracted data to disk."""
    source = data['source']
    item_id = data['item_id']
    
    source_dir = EXTRACTED_DIR / source
    source_dir.mkdir(parents=True, exist_ok=True)
    
    output_path = source_dir / f"{item_id}.json"
    output_path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding='utf-8')
    
    logger.info(f"Saved extracted: {output_path}")
    return output_path


def extract_and_save(source: str, item_id: str, hints: dict = None) -> Optional[dict]:
    """Extract data and save to disk. Returns extracted data."""
    data = extract(source, item_id, hints=hints)
    if data:
        save_extracted(data)
    return data


# CLI
if __name__ == "__main__":
    import sys
    if len(sys.argv) < 3:
        print("Usage: python extract.py <source> <item_id>")
        sys.exit(1)
    
    source, item_id = sys.argv[1], sys.argv[2]
    result = extract_and_save(source, item_id)
    if result:
        print(f"✓ Extracted: {len(result.get('questions', []))} questions")
    else:
        print("✗ Extraction failed")
        sys.exit(1)


def extract_content_images(soup, url: str = '') -> dict:
    """
    Smart extraction of content images with classification.
    
    Returns:
        {
            "passage_images": [url1, url2, ...],  # Images in passage text
            "question_images": {
                "11-13": [url1, url2, ...],  # MCQ options images
                "5-8": [url1, ...],  # Diagram label images
            },
            "diagram_images": [url, ...],  # Diagrams, flowcharts
        }
    """
    import re
    result = {
        "passage_images": [],
        "question_images": {},
        "diagram_images": [],
        "all_images": []
    }
    
    if not soup:
        return result
    
    # Skip patterns for non-content images
    skip_patterns = [
        'icon', 'logo', 'avatar', 'emoji', 'highlight', 'favicon',
        'Dictionary', 'remove_format', 'Images/', 'google', 'facebook', 'twitter', 'linkedin',
        'wp-includes', 'plugins/', 'button', 'loading', 'spinner'
    ]
    
    # Find all content images
    all_imgs = []
    for img in soup.find_all('img'):
        src = img.get('src') or img.get('data-src') or ''
        if not src:
            continue
        
        # Skip non-content images
        if any(skip in src.lower() for skip in skip_patterns):
            continue
        
        # Make absolute URL
        if src.startswith('//'):
            src = 'https:' + src
        elif src.startswith('/') and url:
            from urllib.parse import urlparse
            parsed = urlparse(url)
            src = f"{parsed.scheme}://{parsed.netloc}{src}"
        
        # Get context (parent elements)
        context = {
            'url': src,
            'alt': img.get('alt', ''),
            'parent_text': '',
            'question_range': None
        }
        
        # Check parent for question context
        parent = img.parent
        for _ in range(5):  # Check up to 5 levels
            if not parent:
                break
            parent_text = parent.get_text(strip=True, separator=' ')[:200]
            context['parent_text'] = parent_text
            
            # Try to detect question range (e.g., "Questions 11-13", "Q5-8")
            q_match = re.search(r'[Qq]uestions?\s*(\d+)[-–to]+\s*(\d+)', parent_text)
            if q_match:
                context['question_range'] = f"{q_match.group(1)}-{q_match.group(2)}"
                break
            
            # Single question match
            q_single = re.search(r'[Qq]uestion\s*(\d+)', parent_text)
            if q_single:
                context['question_range'] = q_single.group(1)
                break
            
            parent = parent.parent
        
        all_imgs.append(context)
    
    result['all_images'] = [img['url'] for img in all_imgs]
    
    # Classify images
    for img in all_imgs:
        url = img['url']
        alt = img['alt'].lower()
        q_range = img['question_range']
        
        # Check if it's a diagram/flowchart
        is_diagram = any(kw in alt for kw in ['diagram', 'flowchart', 'chart', 'process', 'map'])
        is_diagram = is_diagram or any(kw in url.lower() for kw in ['diagram', 'flowchart', 'process'])
        
        if q_range:
            # Image associated with specific questions
            if q_range not in result['question_images']:
                result['question_images'][q_range] = []
            result['question_images'][q_range].append(url)
        elif is_diagram:
            result['diagram_images'].append(url)
        else:
            # General passage image
            result['passage_images'].append(url)
    
    return result
