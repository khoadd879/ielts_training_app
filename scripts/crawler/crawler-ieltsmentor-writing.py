#!/usr/bin/env python3
"""
IELTS Writing Task 1 Crawler - ielts-mentor.com
===============================================
Crawls IELTS GT Writing Task 1 content from ielts-mentor.com.

Usage:
    # Single task page
    python crawler-ieltsmentor-writing.py <URL>
    
    # List all tasks from listing page
    python crawler-ieltsmentor-writing.py --list [--start N]
    
    # Batch crawl multiple pages
    python crawler-ieltsmentor-writing.py --batch --pages 5

Example:
    python crawler-ieltsmentor-writing.py "https://www.ielts-mentor.com/writing-sample/gt-writing-task-1/4135-letter-to-your-friend..."
"""

import re
import json
import logging
import sys
from pathlib import Path
from datetime import datetime
from urllib.parse import urljoin, urlparse
import requests
from bs4 import BeautifulSoup

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Paths
SCRIPT_DIR = Path(__file__).parent
DATA_DIR = SCRIPT_DIR.parent / "data"
OUTPUT_DIR = DATA_DIR / "output" / "ielts-mentor-writing"
NORMALIZED_DIR = DATA_DIR / "normalized" / "ielts-mentor-writing"
SEEDS_DIR = Path("/home/khoa/RiderProjects/Project_Langfens_Microservice/deploy/seeds")

# Create directories
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
NORMALIZED_DIR.mkdir(parents=True, exist_ok=True)
SEEDS_DIR.mkdir(parents=True, exist_ok=True)

# Base URL
BASE_URL = "https://www.ielts-mentor.com"
LISTING_URL = f"{BASE_URL}/writing-sample/gt-writing-task-1"

# Headers
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
}


def fetch_page(url: str) -> BeautifulSoup:
    """Fetch and parse a page."""
    logger.info(f"Fetching: {url}")
    response = requests.get(url, headers=HEADERS, timeout=30)
    response.raise_for_status()
    return BeautifulSoup(response.text, 'html.parser')


def extract_task_links(soup: BeautifulSoup) -> list[dict]:
    """Extract task links from listing page."""
    tasks = []
    
    # Find table with task links
    table = soup.find('table')
    if not table:
        logger.warning("No table found on listing page")
        return tasks
    
    for row in table.find_all('tr'):
        cells = row.find_all('td')
        if len(cells) >= 1:
            link = cells[0].find('a')
            if link and link.get('href'):
                href = link.get('href')
                if '/writing-sample/gt-writing-task-1/' in href:
                    full_url = urljoin(BASE_URL, href)
                    title = link.get_text(strip=True)
                    
                    # Extract ID from URL
                    match = re.search(r'/(\d+)-', href)
                    task_id = match.group(1) if match else None
                    
                    tasks.append({
                        'id': task_id,
                        'title': title,
                        'url': full_url
                    })
    
    logger.info(f"Found {len(tasks)} tasks on page")
    return tasks


def fetch_listing_page(start: int = 0) -> list[dict]:
    """Fetch task links from listing page with pagination."""
    url = f"{LISTING_URL}?start={start}" if start > 0 else LISTING_URL
    soup = fetch_page(url)
    return extract_task_links(soup)


def extract_prompt(soup: BeautifulSoup) -> str:
    """Extract writing prompt from task page."""
    # Try different selectors
    article = soup.find('article', class_='item-page') or soup.find('article') or soup.find('div', class_='item-page')
    if not article:
        # Fallback to body
        article = soup.find('body')
    if not article:
        return ""
    
    # Get all text before "Model Answer"
    full_text = article.get_text(separator='\n', strip=True)
    
    # Find the prompt section
    # Usually starts with "You should spend about 20 minutes"
    prompt_start = full_text.find("You should spend")
    if prompt_start == -1:
        # Try alternative pattern
        prompt_start = full_text.find("IELTS Letter Writing")
        if prompt_start != -1:
            prompt_start = full_text.find("You should", prompt_start)
    
    # Find end of prompt (before Model Answer)
    model_answer_pos = full_text.find("Model Answer")
    if model_answer_pos == -1:
        model_answer_pos = full_text.find("Sample Answer")
    
    if prompt_start != -1 and model_answer_pos != -1:
        prompt = full_text[prompt_start:model_answer_pos].strip()
    elif prompt_start != -1:
        # Take up to 2000 chars if no model answer found
        prompt = full_text[prompt_start:prompt_start + 2000].strip()
    else:
        prompt = ""
    
    # Clean up the prompt
    prompt = re.sub(r'\n{3,}', '\n\n', prompt)
    prompt = prompt.strip()
    
    return prompt


def extract_model_answers(soup: BeautifulSoup) -> list[str]:
    """Extract model answers from task page."""
    answers = []
    article = soup.find('article', class_='item-page') or soup.find('article') or soup.find('div', class_='item-page')
    if not article:
        article = soup.find('body')
    if not article:
        return answers
    
    full_text = article.get_text(separator='\n', strip=True)
    
    # Split by "Model Answer" or "Sample Answer" patterns
    patterns = [
        r'Model Answer\s*\d*:?\s*',
        r'Sample Answer\s*\d*:?\s*',
        r'\*\*Model Answer\s*\d*:?\*\*',
    ]
    
    combined_pattern = '|'.join(patterns)
    parts = re.split(combined_pattern, full_text, flags=re.IGNORECASE)
    
    # Skip the first part (it's the prompt)
    for i, part in enumerate(parts[1:], 1):
        answer = part.strip()
        
        # Clean up: remove navigation and footer content
        noise_patterns = [
            r'Next Writing Task.*$',
            r'Previous Writing Task.*$',
            r'Share this page.*$',
            r'Last modified:.*$',
            r'Written by.*$',
            r'Hits:.*$',
            r'Related IELTS.*$',
        ]
        for pattern in noise_patterns:
            answer = re.sub(pattern, '', answer, flags=re.IGNORECASE | re.DOTALL)
        
        answer = re.sub(r'\n{3,}', '\n\n', answer)
        answer = answer.strip()
        
        if len(answer) > 100:  # Only include substantial answers
            answers.append(answer)
    
    return answers


def extract_title(soup: BeautifulSoup, url: str = "") -> str:
    """Extract page title from URL slug (most reliable for ielts-mentor.com)."""
    # Primary: extract from URL (most reliable)
    if url:
        match = re.search(r'/\d+-(.+?)(?:\?|$)', url)
        if match:
            slug = match.group(1)
            # Convert slug to title
            title = slug.replace('-', ' ').title()
            # Truncate if too long
            if len(title) > 100:
                title = title[:100] + '...'
            return title
    
    # Fallback to <title> tag
    title_tag = soup.find('title')
    if title_tag:
        text = title_tag.get_text(strip=True)
        # Remove site name suffix
        text = re.sub(r'\s*[-|]\s*IELTS Mentor.*$', '', text, flags=re.IGNORECASE)
        if text and len(text) > 10:
            return text
    
    return "IELTS GT Writing Task 1"


def extract_task_id(url: str) -> str:
    """Extract task ID from URL."""
    match = re.search(r'/(\d+)-([a-z0-9-]+)', url)
    if match:
        return f"{match.group(1)}-{match.group(2)[:50]}"
    
    # Fallback: use path hash
    path = urlparse(url).path
    return re.sub(r'[^a-z0-9]+', '-', path.lower()).strip('-')[:60]


def fetch_task_page(url: str) -> dict:
    """Fetch and extract content from a single task page."""
    soup = fetch_page(url)
    
    title = extract_title(soup, url)
    prompt = extract_prompt(soup)
    model_answers = extract_model_answers(soup)
    task_id = extract_task_id(url)
    
    return {
        'id': task_id,
        'url': url,
        'title': title,
        'prompt': prompt,
        'model_answers': model_answers,
    }


def generate_normalized_json(data: dict) -> dict:
    """Generate normalized JSON in exam schema format."""
    task_id = data['id']
    title = data['title']
    prompt = data['prompt']
    model_answers = data['model_answers']
    
    # Create slug
    slug = f"ielts-mentor-writing-{task_id}"
    
    return {
        'id': task_id,
        'source': 'ielts-mentor-writing',
        'url': data['url'],
        'slug': slug,
        'title': title,
        'type': 'WRITING_TASK_1',
        'category': 'IELTS_WRITING',
        'level': 'B2',
        'durationMin': 20,
        'sections': [{
            'idx': 1,
            'title': 'GT Writing Task 1',
            'passage_md': None,
            'instruction_md': 'You should spend about 20 minutes on this task.',
            'questions': [{
                'idx': 1,
                'type': 'ESSAY',
                'prompt_md': prompt,
                'model_answers': model_answers,
                'correct_answers': [],
                'options': [],
                'matchPairs': None,
            }]
        }]
    }


def escape_sql(text: str) -> str:
    """Escape text for SQL."""
    if not text:
        return ""
    return text.replace("'", "''").replace("\\", "\\\\").replace("\n", "\\n")


def generate_sql(data: dict) -> str:
    """Generate SQL insert statements for writing-service database."""
    normalized = generate_normalized_json(data)
    
    task_id = normalized['id']
    title = escape_sql(normalized['title'])
    prompt = escape_sql(normalized['sections'][0]['questions'][0]['prompt_md'])
    model_answers = normalized['sections'][0]['questions'][0]['model_answers']
    
    # Convert model answers to JSONB
    model_answers_json = json.dumps(model_answers, ensure_ascii=False)
    model_answers_sql = escape_sql(model_answers_json)
    
    # ExamType: 0=TOEIC, 1=WRITING_TASK1, 2=WRITING_TASK2
    exam_type = 1  # WRITING_TASK1
    
    sql = f"""-- ============================================
-- IELTS Writing Task 1 Data Import (writing-service)
-- Generated: {datetime.now().isoformat()}
-- Source: ielts-mentor.com
-- Title: {normalized['title']}
-- ============================================

BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Cleanup existing data with same title
DELETE FROM "writing_exams" WHERE "Title" = E'{title}';

-- Insert into writing_exams table
INSERT INTO "writing_exams" (
  "Id",
  "Title", 
  "TaskText",
  "ExamType",
  "Level",
  "Tags",
  "ModelAnswers",
  "CreatedAt",
  "CreatedBy"
)
VALUES (
  gen_random_uuid(),
  E'{title}',
  E'{prompt}',
  {exam_type},
  'B2',
  'ielts,letter,task1,gt',
  E'{model_answers_sql}'::jsonb,
  now(),
  '00000000-0000-0000-0000-000000000000'
);

COMMIT;
"""
    return sql


def process_task(url: str) -> dict:
    """Process a single task URL."""
    data = fetch_task_page(url)
    
    if not data['prompt']:
        logger.error(f"No prompt extracted from {url}")
        return None
    
    logger.info(f"Extracted: {data['title']}")
    logger.info(f"  Prompt: {len(data['prompt'])} chars")
    logger.info(f"  Model Answers: {len(data['model_answers'])}")
    
    # Generate normalized JSON
    normalized = generate_normalized_json(data)
    
    # Save normalized JSON
    json_path = NORMALIZED_DIR / f"{data['id']}.json"
    json_path.write_text(json.dumps(normalized, indent=2, ensure_ascii=False))
    logger.info(f"Saved JSON: {json_path}")
    
    # Generate and save SQL
    sql = generate_sql(data)
    sql_path = SEEDS_DIR / f"seed_exam_{normalized['slug']}.sql"
    sql_path.write_text(sql)
    logger.info(f"Saved SQL: {sql_path}")
    
    return normalized


def main():
    """Main entry point."""
    if len(sys.argv) < 2:
        print(__doc__)
        return
    
    arg = sys.argv[1]
    
    if arg == '--list':
        # List tasks from listing page
        start = 0
        if '--start' in sys.argv:
            idx = sys.argv.index('--start')
            start = int(sys.argv[idx + 1]) if len(sys.argv) > idx + 1 else 0
        
        tasks = fetch_listing_page(start)
        print(f"\n{'=' * 60}")
        print(f"Found {len(tasks)} tasks (start={start})")
        print('=' * 60)
        for task in tasks:
            print(f"  [{task['id']}] {task['title']}")
            print(f"      {task['url']}")
        
    elif arg == '--batch':
        # Batch crawl multiple pages
        pages = 1
        if '--pages' in sys.argv:
            idx = sys.argv.index('--pages')
            pages = int(sys.argv[idx + 1]) if len(sys.argv) > idx + 1 else 1
        
        all_tasks = []
        for page in range(pages):
            start = page * 20
            tasks = fetch_listing_page(start)
            all_tasks.extend(tasks)
            logger.info(f"Page {page + 1}: {len(tasks)} tasks")
        
        logger.info(f"Total: {len(all_tasks)} tasks collected")
        
        # Process each task
        for i, task in enumerate(all_tasks):
            logger.info(f"\n[{i + 1}/{len(all_tasks)}] Processing: {task['title']}")
            try:
                process_task(task['url'])
            except Exception as e:
                logger.error(f"Failed to process {task['url']}: {e}")
    
    else:
        # Single task URL
        url = arg
        if not url.startswith('http'):
            url = f"https://www.ielts-mentor.com{url}"
        
        result = process_task(url)
        if result:
            print(f"\n✓ Successfully processed: {result['title']}")
            print(f"  Slug: {result['slug']}")
            print(f"  Questions: {len(result['sections'][0]['questions'])}")


if __name__ == "__main__":
    main()
