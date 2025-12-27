#!/usr/bin/env python3
"""
IELTS Exam Data Crawler
=======================
A modular script to crawl IELTS exam data from mini-ielts.com and export to SQL.

Phases:
    1. Extraction (Crawler) - Crawl raw HTML data using requests + BeautifulSoup
    2. Transformation (Normalization) - Clean and transform to schema format
    3. Validation - Validate against JSON schema
    4. Loading (SQL Export) - Generate PostgreSQL INSERT statements
"""

import json
import logging
import re
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any

import requests
from bs4 import BeautifulSoup
import jsonschema

# =============================================================================
# CONFIGURATION
# =============================================================================

TARGET_URL = "https://mini-ielts.com/1516/reading/the-importance-of-law"

# Auto-derive answer URL from target URL (pattern: /{id}/view-solution/reading/{slug})
# Example: https://mini-ielts.com/1518/reading/slug -> https://mini-ielts.com/1518/view-solution/reading/slug
def _derive_answer_url(target_url: str) -> str:
    """Derive the solution/answer URL from the target exam URL."""
    # Pattern: /1518/reading/slug -> /1518/view-solution/reading/slug
    import re
    match = re.match(r'(https://mini-ielts\.com/\d+)/reading/(.+)', target_url)
    if match:
        return f"{match.group(1)}/view-solution/reading/{match.group(2)}"
    return ""

ANSWER_URL = _derive_answer_url(TARGET_URL)  # Set to "" to skip auto-scraping

SCHEMA_FILE = Path(__file__).parent / "exam-import.schema.json"
OUTPUT_DIR = Path(__file__).parent
REPO_ROOT = Path(__file__).parent.parent.parent  # scripts/crawler -> scripts -> repo root

# Output files
RAW_DATA_FILE = OUTPUT_DIR / "raw_data.json"
NORMALIZED_FILE = OUTPUT_DIR / "normalized_exam.json"
SQL_FILE = REPO_ROOT / "deploy" / "seeds" / "seed_exam_australian_parrots.sql"
ERROR_LOG_FILE = OUTPUT_DIR / "error.log"


# Logging configuration
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(ERROR_LOG_FILE, mode='w', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Known answer keys for popular IELTS exams
# These are verified answers that can be used when crawling specific exams
# For MULTIPLE_CHOICE_MULTIPLE, use list of correct options
KNOWN_ANSWERS = {
    "william-gilbert-and-magnetism": {
        1: "v", 2: "i", 3: "vi", 4: "x", 5: "ix", 6: "iv", 7: "ii",  # Matching Headings
        8: "TRUE", 9: "TRUE", 10: "NOT GIVEN",  # True/False/Not Given
        11: ["C", "D", "E"]  # Multiple Choice Multiple - Choose THREE
    },
    "australian-parrots": {
        # Add answers when found - for now extraction will leave these blank
    }
}


# =============================================================================
# PHASE 0: SCRAPE ANSWERS FROM SOLUTION PAGE (OPTIONAL)
# =============================================================================

def scrape_answers_from_solution(answer_url: str) -> dict[int, str]:
    """
    Scrape correct answers from the solution/answer page.
    
    Parses HTML for patterns like "Answer: TRUE" or "8 Answer: symbols"
    
    Args:
        answer_url: URL to the solution page
        
    Returns:
        Dictionary mapping question index (1-based) to answer string
    """
    if not answer_url:
        return {}
    
    logger.info(f"Phase 0: Scraping answers from {answer_url}")
    answers = {}
    
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        response = requests.get(answer_url, headers=headers, timeout=30)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        html_text = response.text
        
        import re
        
        # Strategy: Find all "Answer: VALUE" patterns in HTML order
        # This works because answers appear sequentially in the solution page
        
        # Pattern for all answer types: Answer: TRUE/FALSE/NOT GIVEN or Answer: word/number
        all_answers_pattern = r'Answer:\s*([A-Za-z0-9\s]+?)(?=<|Answer:|$)'
        matches = re.findall(all_answers_pattern, html_text, re.IGNORECASE)
        
        if matches:
            q_idx = 1
            for raw_answer in matches:
                answer = raw_answer.strip()
                
                # Clean up and normalize
                if not answer:
                    continue
                    
                # Handle TRUE/FALSE/NOT GIVEN
                upper = answer.upper()
                if upper.startswith('TRUE'):
                    answer = 'TRUE'
                elif upper.startswith('FALSE'):
                    answer = 'FALSE'
                elif 'NOT' in upper and 'GIVEN' in upper:
                    answer = 'NOT GIVEN'
                else:
                    # For completion answers, take only first word
                    first_word = answer.split()[0] if answer.split() else answer
                    answer = first_word
                
                answers[q_idx] = answer
                logger.info(f"  Found Q{q_idx}: {answer}")
                q_idx += 1
        
        logger.info(f"Phase 0 complete: Scraped {len(answers)} answers")
        
    except Exception as e:
        logger.warning(f"Failed to scrape answers: {e}")
    
    return answers


def _extract_audio_url(soup: BeautifulSoup) -> str | None:
    """Extract YouTube audio URL from iframe for listening exams.
    
    Returns the full embed URL or None if not found.
    """
    # Look for YouTube iframe
    iframe = soup.find('iframe', src=re.compile(r'youtube\.com/embed'))
    if iframe:
        src = iframe.get('src', '')
        # Clean up the URL (remove query params like enablejsapi)
        if 'youtube.com/embed/' in src:
            video_id = src.split('youtube.com/embed/')[1].split('?')[0]
            return f"https://www.youtube.com/embed/{video_id}"
    return None


def _detect_exam_type(url: str) -> str:
    """Detect if exam is reading or listening from URL."""
    if '/listening/' in url:
        return 'listening'
    return 'reading'


# =============================================================================
# PHASE 1: EXTRACTION (CRAWLER)
# =============================================================================

def extract_data(url: str) -> dict[str, Any]:
    """
    Phase 1: Crawl raw HTML data from the target URL.
    
    Uses requests + BeautifulSoup for extraction since the page
    doesn't require JavaScript rendering.
    
    Args:
        url: Target URL to crawl
        
    Returns:
        Dictionary containing raw extracted data
    """
    logger.info(f"Phase 1: Starting extraction from {url}")
    
    try:
        # Send HTTP request with appropriate headers
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Extract question type info from meta description
        meta_question_types = _extract_meta_question_types(soup)
        
        # Extract exam title
        title = _extract_title(soup)
        
        # Extract reading passage
        passage = _extract_passage(soup)
        
        # Extract questions (grouped by type) - pass meta info for type detection
        questions = _extract_questions(soup, meta_question_types)
        
        # Build answer key: scrape from solution page + merge with KNOWN_ANSWERS
        slug = url.split('/')[-1] if '/' in url else url
        
        # Start with scraped answers from solution page
        answer_key: dict[int, Any] = {}
        if ANSWER_URL:
            answer_key = scrape_answers_from_solution(ANSWER_URL)
        
        # Merge with KNOWN_ANSWERS (KNOWN_ANSWERS takes priority for already-verified answers)
        if slug in KNOWN_ANSWERS:
            for q_idx, ans in KNOWN_ANSWERS[slug].items():
                if q_idx not in answer_key:
                    answer_key[q_idx] = ans
                    logger.info(f"Using KNOWN_ANSWERS for Q{q_idx}: {ans}")
        
        # Apply answers to questions
        for q in questions:
            q_idx = q.get('idx')
            if q_idx in answer_key:
                correct_ans = answer_key[q_idx]
                q['correct_answer'] = correct_ans
                logger.info(f"Applied answer for Q{q_idx}: {correct_ans}")
                
                # Mark correct options based on question type
                q_type = q.get('type', '')
                if q.get('options'):
                    if q_type in ('MULTIPLE_CHOICE_SINGLE', 'TRUE_FALSE_NOT_GIVEN', 'YES_NO_NOT_GIVEN'):
                        # Single correct answer
                        for opt in q['options']:
                            if opt.get('label', '').upper() == str(correct_ans).upper():
                                opt['is_correct'] = True
                                logger.info(f"  Marked option {opt.get('label')} as correct")
                    elif q_type == 'MULTIPLE_CHOICE_MULTIPLE' and isinstance(correct_ans, list):
                        # Multiple correct answers (list)
                        correct_set = {ans.upper() for ans in correct_ans}
                        for opt in q['options']:
                            if opt.get('label', '').upper() in correct_set:
                                opt['is_correct'] = True
                                logger.info(f"  Marked option {opt.get('label')} as correct")
                
                # For completion questions, store accepted text
                if q_type in ('SUMMARY_COMPLETION', 'NOTE_COMPLETION', 'TABLE_COMPLETION', 'SHORT_ANSWER') and isinstance(correct_ans, str):
                    if 'blankAcceptTexts' not in q:
                        q['blankAcceptTexts'] = {}
                    # For single-blank questions, use blank_1 as the default
                    blank_id = q.get('blank_id', 'blank_1')
                    q['blankAcceptTexts'][blank_id] = [correct_ans.strip()]
        
        # Detect exam type (reading vs listening) and extract audio if listening
        exam_type = _detect_exam_type(url)
        audio_url = _extract_audio_url(soup) if exam_type == 'listening' else None
        
        raw_data = {
            "url": url,
            "crawled_at": datetime.now().isoformat(),
            "title": title,
            "exam_type": exam_type,
            "audio_url": audio_url,
            "passage": passage,
            "questions": questions
        }
        
        # Save raw data to file
        with open(RAW_DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(raw_data, f, indent=2, ensure_ascii=False)
        
        logger.info(f"Phase 1 complete: Extracted {len(questions)} questions, type={exam_type}")
        if audio_url:
            logger.info(f"  Audio URL: {audio_url}")
        return raw_data
        
    except requests.RequestException as e:
        logger.error(f"Failed to fetch URL: {e}")
        raise


def _extract_meta_question_types(soup: BeautifulSoup) -> dict:
    """Extract question type counts from meta description.
    
    Returns a dict like:
    {
        'matching_headings': 6,
        'true_false_not_given': 3,
        'multiple_choice': 4,
        ...
    }
    """
    meta_types = {}
    
    # Find og:description meta tag
    meta = soup.find('meta', {'property': 'og:description'})
    if not meta:
        return meta_types
    
    content = meta.get('content', '')
    
    # Parse patterns like "6 questions are Matching Headings form"
    type_patterns = [
        (r'(\d+)\s*questions?\s*are\s*Matching\s*Headings?\s*form', 'MATCHING_HEADING'),
        (r'(\d+)\s*questions?\s*are\s*TRUE-FALSE-NOT\s*GIVEN\s*form', 'TRUE_FALSE_NOT_GIVEN'),
        (r'(\d+)\s*questions?\s*are\s*YES-NO-NOT\s*GIVEN\s*form', 'YES_NO_NOT_GIVEN'),
        (r'(\d+)\s*questions?\s*are\s*Multiple\s*Choice\s*form', 'MULTIPLE_CHOICE_SINGLE'),
        (r'(\d+)\s*questions?\s*are\s*Sentence\s*Completion\s*form', 'SENTENCE_COMPLETION'),
        (r'(\d+)\s*questions?\s*are\s*Summary.*?form', 'SUMMARY_COMPLETION'),
        (r'(\d+)\s*questions?\s*are\s*Matching\s*Information\s*form', 'MATCHING_INFORMATION'),
    ]
    
    for pattern, q_type in type_patterns:
        match = re.search(pattern, content, re.IGNORECASE)
        if match:
            count = int(match.group(1))
            meta_types[q_type] = count
    
    return meta_types


def _extract_title(soup: BeautifulSoup) -> str:
    """Extract the exam title from the page."""
    title_elem = soup.select_one('h1.title, h2.passage-title, .reading-title')
    if title_elem:
        return title_elem.get_text(strip=True)
    
    title_tag = soup.find('title')
    if title_tag:
        title_text = title_tag.get_text(strip=True)
        return re.sub(r'\s*-\s*IELTS.*$', '', title_text)
    
    return "Australian parrots and their adaptation to habitat change"


def _extract_passage(soup: BeautifulSoup) -> list[dict]:
    """Extract the reading passage paragraphs from HTML.
    
    Looks for passage content in the 'reading-text' or similar container.
    Falls back to default passage if extraction fails.
    """
    passage = []
    
    # Try to find the main passage container
    # mini-ielts.com uses 'reading-text' or similar divs
    passage_container = soup.find('div', class_='reading-text')
    if not passage_container:
        passage_container = soup.find('div', id='reading-text')
    if not passage_container:
        # Try to find by content area
        passage_container = soup.find('div', class_='passage-content')
    
    if passage_container:
        # Get paragraphs from the passage container
        paragraphs = passage_container.find_all(['p', 'div'], recursive=False)
        if not paragraphs:
            paragraphs = passage_container.find_all('p')
        
        for para in paragraphs:
            # Use separator=' ' to ensure spaces between inline elements
            text = para.get_text(separator=' ', strip=True)
            # Clean up multiple spaces
            text = re.sub(r'\s+', ' ', text).strip()
            if text and len(text) > 50:  # Skip short/empty paragraphs
                passage.append({"text": text})
        
        if passage:
            logger.info(f"Extracted {len(passage)} passage paragraphs from HTML")
            return passage
    
    # Fallback: Try to get all text from article content
    article = soup.find('article') or soup.find('div', class_='content')
    if article:
        paragraphs = article.find_all('p')
        for para in paragraphs:
            text = para.get_text(separator=' ', strip=True)
            text = re.sub(r'\s+', ' ', text).strip()
            # Skip if it looks like a question
            if text and len(text) > 100 and not text.startswith('Question'):
                passage.append({"text": text})
        
        if passage:
            logger.info(f"Extracted {len(passage)} paragraphs from article")
            return passage
    
    # Last resort: just get the page title text as single paragraph
    title = soup.find('h1') or soup.find('h2')
    if title:
        passage.append({"text": f"Reading Passage: {title.get_text(strip=True)}"})
    
    logger.warning("Could not extract passage from HTML, returning minimal content")
    return passage if passage else [{"text": "Passage content could not be extracted."}]


def _get_default_passage() -> list[dict]:
    """Return the default passage content (hardcoded from analyzed content)."""
    return [
        {"label": "A", "text": "Parrots are found across the tropic and in all southern hemisphere continents except Antarctica, but nowhere do they display such a richness of diversity and form as in Australia. One-sixth of the world's 345 parrot species are found there, and Australia has long been renowned for the number and variety of its parrots."},
        {"label": "B", "text": "In the 16th century, the German cartographer Mercator made a world map that included a place, somewhere near present-day Australia, that he named Terra Psittacorum – the Land of Parrots – and the first European settlers in Australia often referred to the country as Parrot Land. In 1865, the celebrated British naturalist and wildlife artist John Gould said: \"No group of birds gives Australia so tropical and benign an air as the numerous species of this great family by which it is tenanted.\""},
        {"label": "C", "text": "Parrots are descendants of an ancient line. Due to their great diversity, and since most species inhabit Africa, Australia and South America, it seems almost certain that parrots originated millions of years ago on the ancient southern continent of Gondwana, before it broke up into the separate southern hemisphere continents we know today. Much of Gondwana comprised vast rainforests intersected by huge slow-flowing rivers and expansive lakes, but by eight million years ago, great changes were underway. The center of the continent of Australia had begun to dry out, and the rainforests that once covered it gradually contracted to the continental margins, where, to a limited extent, they still exist today."},
        {"label": "D", "text": "The creatures that remained in those shrinking rainforests had to adapt to the drier conditions or face extinction. Reacting to these desperate circumstances, the parrot family, typically found in jungles in other parts of the world, has populated some of Australia's harshest environments. The parrots spread from ancestral forests through eucalypt woodlands to colonise the central deserts of Australia, and as a consequence they diversified into a wide range of species with adaptations that reflect the many changes animals and plants had to make to survive in these areas."},
        {"label": "E", "text": "These evolutionary pressures helped mould keratin, the substance from which beaks are made into a range of tools capable of gathering the new food types favored by various species of parrot. The size of a parrot's short, blunt beak and the length of that beak's curved upper section are related to the type of food each species eats. Some have comparatively long beaks that are perfect for extracting seeds from fruit; others have broader and stronger beaks that are designed for cracking hard seeds."},
        {"label": "F", "text": "Differently shaped beaks are not the only adaptations that have been made during the developing relationship between parrots and their food plants. Like all of Australia's many honey eating birds, the rainbow-coloured lorikeets and the flowers on which they feed have long co-evolved with features such as the shape and colour of the flowers adapted to the bird's particular needs. For example, red is the most attractive colour to birds, and thus flowers which depend on birds for pollination are more often red, and lorikeets' tongues have bristles which help them to collect as much pollen as possible."},
        {"label": "G", "text": "Today, most of Australia's parrots inhabit woodland and open forest, and their numbers decline towards both deserts and wetter areas. The majority are nomadic to some degree, moving around to take advantage of feeding and breeding places. Two of the dry country parrots, the pink and grey galah and the pink, white and yellow corella have expanded their ranges in recent years. They are among the species that have adapted well to the changes brought about by European settlement. Forest clearing created grasslands where galahs and corellas thrive."},
        {"label": "H", "text": "But other parrot species did not fare so well when their environments were altered. The clearing of large areas of rainforest is probably responsible for the disappearance of the double-eyed fig parrot, and numbers of ground parrots declined when a great part of their habitat was destroyed by the draining of coastal swamps. Even some parrot species that benefited from forest clearing at first are now confronted by a shortage of nesting sites due to further man-made changes."},
        {"label": "I", "text": "New conditions also sometimes favour an incoming species over one that originally inhabited the area. For example, after farmers cleared large areas of forest on Kangaroo Island off the coast of South Australia, the island was colonised by galahs. They were soon going down holes and destroying black cockatoo eggs in order to take the hole for their own use. Their success precipitated a partial collapse in the black cockatoo population when the later lost the struggle for scarce nesting hollows."},
        {"label": "J", "text": "There may be no final answer to ensuring an equitable balance between parrot species. Nest box programmes help ease the shortage of nesting sites in some places, but there are not enough, they are expensive and they are not an adequate substitute for large, old trees, such as the habitat they represent and nectar, pollen and seeds they provide. Competition between parrots for nest sites is a result of the changes we humans have made to the Earth. We are the most widespread and dangerous competitors that parrots have ever had to face, but we also have the knowledge and skill to maintain the wonderfully rich diversity of Australia's parrots. All we need is the will to do so."}
    ]


def _extract_list_of_headings(soup: BeautifulSoup) -> list[dict]:
    """Extract List of Headings from the page for MATCHING_HEADING questions.
    
    Returns list like:
    [
        {'label': 'i', 'text': 'Early years of Gilbert'},
        {'label': 'ii', 'text': 'What was new about his scientific research method'},
        ...
    ]
    """
    headings = []
    
    # Look for "List of Headings" table
    heading_table = None
    for p in soup.find_all('p'):
        if 'List of Headings' in p.get_text():
            # Find the next table
            heading_table = p.find_next('table')
            break
    
    if not heading_table:
        return headings
    
    # Extract headings from table rows
    for row in heading_table.find_all('tr'):
        cells = row.find_all('td')
        if len(cells) >= 2:
            label_cell = cells[0].get_text(strip=True).rstrip('.')
            text_cell = cells[1].get_text(strip=True)
            if label_cell and text_cell:
                headings.append({
                    'label': label_cell,
                    'text': text_cell,
                    'is_correct': False
                })
    
    return headings


def _get_better_explanation(q_type: str, prompt: str = "", para_letter: str = "") -> str:
    """Generate better explanation based on question type."""
    explanations = {
        'MATCHING_HEADING': f"Read Paragraph {para_letter} carefully and identify its main idea. Match it with the most suitable heading from the list.",
        'MATCHING_INFORMATION': f"Scan paragraphs A-J to find where this specific information is mentioned. Look for keywords related to the statement.",
        'TRUE_FALSE_NOT_GIVEN': "Compare this statement with the passage. TRUE if it matches exactly, FALSE if it contradicts, NOT GIVEN if the information is not in the passage.",
        'YES_NO_NOT_GIVEN': "Does the writer's view agree with this statement? YES if the writer agrees, NO if the writer disagrees, NOT GIVEN if the writer's opinion is not stated.",
        'MULTIPLE_CHOICE_SINGLE': "Read the question carefully and choose the answer that best matches the information in the passage.",
        'SUMMARY_COMPLETION': "Use NO MORE THAN THREE WORDS from the passage to complete the blank. The answer must fit grammatically.",
        'SENTENCE_COMPLETION': "Complete the sentence using words from the passage. Make sure the completed sentence is grammatically correct."
    }
    return explanations.get(q_type, "Answer the question based on the passage.")


def _extract_sentence_around_blank(text: str, target_idx: int, all_idxs: list[int]) -> str:
    """Extract individual sentence/bullet containing the target blank.
    
    For notes/summary completion with multiple blanks, this extracts just the 
    sentence containing the target blank number.
    
    Args:
        text: Full paragraph text
        target_idx: The question index we want to extract
        all_idxs: List of all question indices in this paragraph
    
    Returns:
        Individual sentence with _______ for the blank
    """
    import re
    
    # Try to split by common bullet/sentence patterns
    # Pattern: look for text between question numbers
    sorted_idxs = sorted(all_idxs)
    target_pos = sorted_idxs.index(target_idx)
    
    # Define boundaries
    start_pattern = rf'\b{target_idx}\b'
    
    # Find start position of this blank
    match = re.search(start_pattern, text)
    if not match:
        return text  # Fallback to full text
    
    blank_pos = match.start()
    
    # Look backwards for sentence start (capital letter after . or beginning)
    sentence_start = 0
    for i in range(blank_pos - 1, -1, -1):
        if text[i] in '.!?\n' and i + 1 < len(text):
            # Check if next char is space then capital
            remaining = text[i+1:blank_pos].lstrip()
            if remaining and (remaining[0].isupper() or remaining[0].isdigit()):
                sentence_start = i + 1
                break
        # Also break at other question numbers
        for other_idx in sorted_idxs:
            if other_idx != target_idx:
                check_pattern = rf'\b{other_idx}\b'
                check_match = re.search(check_pattern, text[max(0, i-2):i+3])
                if check_match:
                    sentence_start = i + len(str(other_idx)) + 1
                    break
    
    # Look forward for sentence end
    sentence_end = len(text)
    for i in range(blank_pos + len(str(target_idx)), len(text)):
        if text[i] in '.!?\n':
            # Check if this is the end of our sentence
            sentence_end = i + 1
            break
        # Also break at other question numbers
        for other_idx in sorted_idxs:
            if other_idx != target_idx and other_idx > target_idx:
                check_pattern = rf'\b{other_idx}\b'
                check_match = re.search(check_pattern, text[i:i+5])
                if check_match:
                    sentence_end = i
                    break
    
    # Extract sentence and replace blank number with placeholder
    sentence = text[sentence_start:sentence_end].strip()
    sentence = re.sub(rf'\b{target_idx}\b', '_______', sentence)
    
    # Clean up any remaining question numbers
    for other_idx in all_idxs:
        if other_idx != target_idx:
            sentence = re.sub(rf'\b{other_idx}\b', '', sentence)
    
    # Clean up extra spaces
    sentence = re.sub(r'\s+', ' ', sentence).strip()
    
    return sentence


def _extract_questions(soup: BeautifulSoup, meta_question_types: dict = None) -> list[dict]:
    """Extract all questions from the page by detecting type from HTML.
    
    Args:
        soup: BeautifulSoup object of the page
        meta_question_types: Dict of question types from meta description, e.g. {'MATCHING_HEADING': 6}
    """
    questions = []
    meta_question_types = meta_question_types or {}
    
    # Calculate question index ranges based on meta types
    # This helps assign correct types based on position
    type_ranges = _calculate_type_ranges(meta_question_types)
    
    # Extract List of Headings for MATCHING_HEADING questions
    list_of_headings = _extract_list_of_headings(soup)
    
    # Find all select elements (most question types use selects)
    selects = soup.select("select[id^='q']")
    
    for select in selects:
        q_id = select.get('id', '')
        if not q_id.startswith('q'):
            continue
            
        try:
            q_idx = int(q_id[1:])
        except ValueError:
            continue
        
        options = [opt.get('value', '').strip() for opt in select.find_all('option') if opt.get('value', '').strip()]
        
        # Detect question type from options AND meta type info
        q_type, q_data = _detect_type_from_options(options, select, q_idx, type_ranges, list_of_headings)
        
        if q_data:
            questions.append(q_data)
    
    # Find radio button questions (MULTIPLE_CHOICE_SINGLE)
    radio_groups = {}
    radios = soup.select("input[type='radio'][name^='q']")
    for radio in radios:
        name = radio.get('name', '')
        if name not in radio_groups:
            radio_groups[name] = []
        
        value = radio.get('value', '')
        parent = radio.find_parent('p') or radio.find_parent('div')
        if parent:
            text = parent.get_text(strip=True)
            # Remove leading letter (A B C D)
            text = re.sub(r'^[A-D]\s*', '', text).strip()
            radio_groups[name].append({
                'label': value,
                'text': text,
                'is_correct': False
            })
    
    for name, opts in radio_groups.items():
        try:
            q_idx = int(name[1:])
        except ValueError:
            continue
        
        # Find the question prompt from preceding paragraph
        # Look for paragraph containing "7." or "Q7" etc.
        prompt_text = f"Question {q_idx}"
        
        # Find the first radio button for this question to locate the prompt paragraph
        first_radio = soup.find('input', {'type': 'radio', 'name': name})
        if first_radio:
            # Go up to parent and find previous sibling paragraphs
            parent_p = first_radio.find_parent('p')
            if parent_p:
                prev_p = parent_p.find_previous_sibling('p')
                if prev_p:
                    text = prev_p.get_text(strip=True)
                    # Extract prompt - remove leading number and dots
                    text = re.sub(r'^\d+[\.\s]+', '', text).strip()
                    if text and len(text) > 10:
                        prompt_text = text
        
        questions.append({
            'idx': q_idx,
            'type': 'MULTIPLE_CHOICE_SINGLE',
            'prompt': prompt_text,
            'explanation': "Choose the correct answer.",
            'options': opts
        })
    
    # Find text input questions (SUMMARY_COMPLETION, FORM_COMPLETION)
    text_inputs = soup.select("input[type='text'][id^='q']")
    
    # Group text inputs by parent paragraph
    parent_inputs = {}
    for inp in text_inputs:
        q_id = inp.get('id', '')
        if not q_id.startswith('q'):
            continue
        
        try:
            q_idx = int(q_id[1:])
        except ValueError:
            continue
        
        # Skip if already processed
        if any(q['idx'] == q_idx for q in questions):
            continue
        
        # Find parent element - try li first (common in mini-ielts notes), then p, then div
        parent = inp.find_parent('li') or inp.find_parent('p') or inp.find_parent('div')
        if parent:
            parent_id = id(parent)
            if parent_id not in parent_inputs:
                parent_inputs[parent_id] = {'parent': parent, 'inputs': []}
            parent_inputs[parent_id]['inputs'].append((q_idx, inp))
    
    # Process each parent paragraph
    for parent_id, data in parent_inputs.items():
        parent = data['parent']
        inputs = sorted(data['inputs'], key=lambda x: x[0])
        
        if len(inputs) == 1:
            # Single blank - use parent text as prompt
            q_idx = inputs[0][0]
            
            # Remove the question number (usually in <b> tag) and input element
            # Clone parent to avoid modifying original
            parent_copy = BeautifulSoup(str(parent), 'html.parser')
            for b in parent_copy.find_all('b'):
                b_text = b.get_text(strip=True)
                if b_text.isdigit():
                    b.decompose()
            for inp_tag in parent_copy.find_all('input'):
                inp_tag.replace_with(' _______ ')
            
            prompt_text = parent_copy.get_text(separator=' ', strip=True)
            # Clean up extra spaces
            prompt_text = re.sub(r'\s+', ' ', prompt_text).strip()
            
            questions.append({
                'idx': q_idx,
                'type': 'SUMMARY_COMPLETION',
                'prompt': prompt_text or f"Question {q_idx}",
                'correct_answers': [],
                'explanation': _get_better_explanation('SUMMARY_COMPLETION')
            })
        else:
            # Multiple blanks in same paragraph - extract sentence around each blank
            all_text = parent.get_text(separator=' ', strip=True)
            
            for i, (q_idx, inp) in enumerate(inputs):
                # Try to extract individual sentence containing this blank
                # Look for text between question numbers
                prompt_text = _extract_sentence_around_blank(all_text, q_idx, [x[0] for x in inputs])
                
                questions.append({
                    'idx': q_idx,
                    'type': 'SUMMARY_COMPLETION',
                    'prompt': prompt_text.strip() or f"Question {q_idx}",
                    'correct_answers': [],
                    'explanation': _get_better_explanation('SUMMARY_COMPLETION')
                })
    
    # Find checkbox questions (MULTIPLE_CHOICE_MULTIPLE -> split into MULTIPLE_CHOICE_SINGLE)
    checkboxes = soup.select("input[type='checkbox'][name^='q']")
    if checkboxes:
        questions.extend(_extract_checkbox_questions(soup, checkboxes, len(questions)))
    
    # Sort by idx
    questions.sort(key=lambda x: x.get('idx', 0))
    
    return questions


def _calculate_type_ranges(meta_question_types: dict) -> dict:
    """Calculate question index ranges for each type based on meta description.
    
    Returns a dict mapping question idx to expected type.
    E.g., {1: 'MATCHING_HEADING', 2: 'MATCHING_HEADING', ..., 7: 'MULTIPLE_CHOICE_SINGLE'}
    """
    idx_to_type = {}
    current_idx = 1
    
    # Order types as they typically appear in IELTS tests
    type_order = [
        'MATCHING_HEADING', 'MATCHING_INFORMATION', 
        'TRUE_FALSE_NOT_GIVEN', 'YES_NO_NOT_GIVEN',
        'MULTIPLE_CHOICE_SINGLE', 'SENTENCE_COMPLETION', 'SUMMARY_COMPLETION'
    ]
    
    for q_type in type_order:
        if q_type in meta_question_types:
            count = meta_question_types[q_type]
            for i in range(count):
                idx_to_type[current_idx] = q_type
                current_idx += 1
    
    return idx_to_type


def _detect_type_from_options(options: list[str], select, q_idx: int, type_ranges: dict = None, list_of_headings: list = None) -> tuple[str, dict]:
    """Detect question type from select options.
    
    Args:
        options: List of option values from select element
        select: BeautifulSoup select element
        q_idx: Question index
        type_ranges: Optional dict mapping question idx to expected type
        list_of_headings: Optional list of heading options for MATCHING_HEADING
    """
    type_ranges = type_ranges or {}
    list_of_headings = list_of_headings or []
    
    # Get the prompt text - look for text AFTER the select element
    prompt_text = ""
    
    # Method 1: Find sibling spans (most reliable for MATCHING questions)
    # There may be multiple spans - first one is often just spaces, second has content
    sibling_spans = select.find_next_siblings('span')
    for span in sibling_spans:
        text = span.get_text(strip=True)
        if text and len(text) > 5:  # Skip empty or very short spans
            prompt_text = text
            break
    
    # Method 2: If no sibling span, try parent and clean up
    if not prompt_text:
        parent = select.find_parent('p') or select.find_parent('span') or select.find_parent('div')
        if parent:
            # Get all text from parent
            full_text = parent.get_text(strip=True)
            # Remove leading number
            prompt_text = re.sub(r'^\d+\s*', '', full_text).strip()
            # Remove roman numerals that appear as select options
            prompt_text = re.sub(r'^(i{1,3}|iv|v|vi{0,3}|ix|x)+\s*', '', prompt_text, flags=re.IGNORECASE).strip()
            # Remove TRUE/FALSE/NOT GIVEN options text (multiple times)
            for _ in range(3):
                prompt_text = re.sub(r'^(TRUE|FALSE|NOT GIVEN)\s*', '', prompt_text, flags=re.IGNORECASE).strip()
            # Only remove A-J if they appear as a contiguous block at start (not "An" or "Example")
            # This regex only matches if it's EXACTLY single letters A-J followed by space or non-letter
            if re.match(r'^[A-J](?![a-z])', prompt_text):
                prompt_text = re.sub(r'^[A-J]+\s*', '', prompt_text).strip()
    
    # HTML-based detection (more accurate than meta description)
    
    # Check for roman numerals (i, ii, iii... x) -> MATCHING_HEADING
    roman_pattern = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x']
    if all(opt.lower() in roman_pattern for opt in options if opt):
        # This is MATCHING_HEADING - extract just the paragraph letter
        para_match = re.search(r'Paragraph\s*([A-Z])', prompt_text, re.IGNORECASE)
        para_letter = para_match.group(1) if para_match else chr(64 + q_idx)
        return 'MATCHING_HEADING', {
            'idx': q_idx,
            'type': 'MATCHING_HEADING',
            'prompt': f"Paragraph {para_letter}",
            'correct_answer': '',
            'explanation': _get_better_explanation('MATCHING_HEADING', para_letter=para_letter),
            'options': list_of_headings if list_of_headings else []
        }
    
    # Check for TRUE/FALSE/NOT GIVEN
    if set(opt.upper() for opt in options) == {'TRUE', 'FALSE', 'NOT GIVEN'}:
        return 'TRUE_FALSE_NOT_GIVEN', {
            'idx': q_idx,
            'type': 'TRUE_FALSE_NOT_GIVEN',
            'prompt': prompt_text or f"Statement {q_idx}",
            'correct_answer': '',
            'explanation': _get_better_explanation('TRUE_FALSE_NOT_GIVEN')
        }
    
    # Check for YES/NO/NOT GIVEN
    if set(opt.upper() for opt in options) == {'YES', 'NO', 'NOT GIVEN'}:
        return 'YES_NO_NOT_GIVEN', {
            'idx': q_idx,
            'type': 'YES_NO_NOT_GIVEN',
            'prompt': prompt_text or f"Statement {q_idx}",
            'correct_answer': '',
            'explanation': _get_better_explanation('YES_NO_NOT_GIVEN')
        }
    
    # Check for paragraph letters (A-J) -> MATCHING_INFORMATION
    paragraph_pattern = [chr(65+i) for i in range(10)]  # A-J
    if all(opt.upper() in paragraph_pattern for opt in options if opt):
        # Use prompt_text directly - don't strip A-J since prompt_text 
        # was already extracted from sibling span which has clean text
        return 'MATCHING_INFORMATION', {
            'idx': q_idx,
            'type': 'MATCHING_INFORMATION',
            'prompt': prompt_text or f"Question {q_idx}",
            'correct_answer': '',
            'explanation': _get_better_explanation('MATCHING_INFORMATION')
        }
    
    # Check for Multiple Choice (A, B, C, D options with text)
    if len(options) >= 3:
        return 'MULTIPLE_CHOICE_SINGLE', {
            'idx': q_idx,
            'type': 'MULTIPLE_CHOICE_SINGLE',
            'prompt': prompt_text or f"Question {q_idx}",
            'explanation': _get_better_explanation('MULTIPLE_CHOICE_SINGLE'),
            'options': [{'label': chr(65+i), 'text': opt, 'is_correct': False} for i, opt in enumerate(options)]
        }
    
    # Default
    return 'SUMMARY_COMPLETION', {
        'idx': q_idx,
        'type': 'SUMMARY_COMPLETION',
        'prompt': prompt_text or f"Question {q_idx}",
        'correct_answers': [],
        'explanation': f"Complete the blank."
    }


def _extract_checkbox_questions(soup: BeautifulSoup, checkboxes, start_idx: int) -> list[dict]:
    """Extract multiple choice multiple (checkbox) questions.
    
    For "Choose TWO letters" with 5 options (A-E), this creates 2 separate questions
    that share the same options.
    
    Logic:
    - If instruction says "Choose TWO" → each checkbox group creates 2 questions
    - If instruction says "Choose THREE" → each checkbox group creates 3 questions
    - Checkbox name "q11" → creates Q11, Q12 for Choose TWO
    - Checkbox name "q13" → creates Q13, Q14 for Choose TWO
    """
    questions = []
    
    # Group checkboxes by name
    checkbox_groups = {}
    for cb in checkboxes:
        name = cb.get('name', '')
        if name not in checkbox_groups:
            checkbox_groups[name] = []
        
        parent = cb.find_parent('p') or cb.find_parent('div')
        if parent:
            text = parent.get_text(strip=True)
            # Extract option letter and text
            match = re.search(r'([A-F])\s*(.+)', text)
            if match:
                checkbox_groups[name].append({
                    'label': match.group(1),
                    'text': match.group(2).strip(),
                    'is_correct': False
                })
    
    # Find instruction to determine num_to_choose
    num_to_choose = 2  # Default
    for p in soup.find_all('p'):
        text = p.get_text()
        if 'Choose THREE' in text:
            num_to_choose = 3
            break
        elif 'Choose TWO' in text:
            num_to_choose = 2
            break
    
    # Create questions for each checkbox group
    # For "q11" with Choose TWO → creates Q11 and Q12
    # For "q13" with Choose TWO → creates Q13 and Q14
    for name, opts in checkbox_groups.items():
        if not opts:
            continue
            
        # Extract base idx from name like "q11"
        idx_match = re.match(r'q(\d+)', name)
        if not idx_match:
            continue
        base_idx = int(idx_match.group(1))
        
        # Create 'num_to_choose' questions starting from base_idx
        for offset in range(num_to_choose):
            q_idx = base_idx + offset
            questions.append({
                'idx': q_idx,
                'type': 'MULTIPLE_CHOICE_MULTIPLE',
                'prompt': f"Choose {num_to_choose} correct options.",
                'explanation': f"Select {num_to_choose} correct options. Order doesn't matter.",
                'options': [dict(o) for o in opts],  # Copy options
                'num_to_choose': num_to_choose
            })
    
    return questions


# =============================================================================
# PHASE 2: TRANSFORMATION (NORMALIZATION)
# =============================================================================

def normalize_data(raw_data: dict[str, Any]) -> dict[str, Any]:
    """
    Phase 2: Clean and transform raw data to match the schema format.
    """
    logger.info("Phase 2: Starting data normalization")
    
    exam_id = str(uuid.uuid4())
    section_id = str(uuid.uuid4())
    
    # Get title from raw data
    title = _clean_text(raw_data.get("title", "Reading Practice Test"))
    
    passage_md = _create_passage_markdown(raw_data.get("passage", []))
    
    normalized = {
        "schemaVersion": "1.0.0",
        "exams": [
            {
                "id": exam_id,
                "slug": _create_slug(title),
                "title": title,
                "descriptionMd": f"IELTS Reading Practice Test: {title}",
                "category": "IELTS",
                "level": "B2",
                "status": "PUBLISHED",
                "durationMin": 20,
                "sections": [
                    {
                        "id": section_id,
                        "idx": 1,
                        "title": f"Reading Passage - {title}",
                        "instructionsMd": passage_md,
                        "audioUrl": None,
                        "transcriptMd": None,
                        "questions": _normalize_questions(raw_data.get("questions", []), section_id)
                    }
                ]
            }
        ]
    }
    
    with open(NORMALIZED_FILE, 'w', encoding='utf-8') as f:
        json.dump(normalized, f, indent=2, ensure_ascii=False)
    
    logger.info(f"Phase 2 complete: Normalized {len(normalized['exams'][0]['sections'][0]['questions'])} questions")
    return normalized


def _clean_text(text: str) -> str:
    """Clean and normalize text content."""
    if not text:
        return ""
    text = re.sub(r'\s+', ' ', text)
    text = text.strip()
    return text


def _create_slug(title: str) -> str:
    """Create a URL-friendly slug from title with ielts-reading- prefix.
    
    The frontend uses detectSkillFromSlug() which checks if slug contains 'reading'.
    Without this prefix, exams won't appear in the reading practice list.
    """
    slug = title.lower()
    slug = re.sub(r'[^a-z0-9]+', '-', slug)
    slug = slug.strip('-')
    slug = slug[:100]  # Leave room for prefix
    # Add prefix so frontend can detect skill from slug
    return f"ielts-reading-{slug}" if slug else "ielts-reading-william-gilbert-and-magnetism"


def _create_passage_markdown(paragraphs: list[dict]) -> str:
    """Create Markdown formatted passage from paragraphs with option list."""
    if not paragraphs:
        return ""
    
    lines = []
    for idx, p in enumerate(paragraphs, 1):
        label = p.get("label", "")
        text = _clean_text(p.get("text", ""))
        
        if not text:
            continue
            
        if label:
            # Labeled paragraph (e.g., Paragraph A, Paragraph B)
            lines.append(f"**Paragraph {label}**  \n{text}\n")
        else:
            # Unlabeled paragraph - just add the text
            lines.append(f"{text}\n")
    
    return "\n".join(lines)


def _normalize_questions(questions: list[dict], section_id: str) -> list[dict]:
    """Normalize all questions to schema format."""
    normalized_questions = []
    
    for q in questions:
        question_id = str(uuid.uuid4())
        q_type = q.get("type", "MULTIPLE_CHOICE_SINGLE")
        
        normalized_q = {
            "id": question_id,
            "idx": q.get("idx", 1),
            "type": q_type,
            "skill": "READING",
            "difficulty": 2,
            "promptMd": _clean_text(q.get("prompt", "")),
            "explanationMd": q.get("explanation"),
            "options": [],
            "blankAcceptTexts": {},
            "blankAcceptRegex": {},
            "matchPairs": {},
            "orderCorrects": [],
            "shortAnswerAcceptTexts": [],
            "shortAnswerAcceptRegex": []
        }
        
        # Handle question type specific data
        if q_type == "TRUE_FALSE_NOT_GIVEN":
            # Auto-generate True/False/Not Given options
            correct_answer = q.get("correct_answer", "").upper()
            normalized_q["options"] = [
                {"id": str(uuid.uuid4()), "idx": 1, "contentMd": "True", "isCorrect": correct_answer == "TRUE"},
                {"id": str(uuid.uuid4()), "idx": 2, "contentMd": "False", "isCorrect": correct_answer == "FALSE"},
                {"id": str(uuid.uuid4()), "idx": 3, "contentMd": "Not Given", "isCorrect": correct_answer == "NOT GIVEN"}
            ]
            
        elif q_type == "YES_NO_NOT_GIVEN":
            # Auto-generate Yes/No/Not Given options
            correct_answer = q.get("correct_answer", "").upper()
            normalized_q["options"] = [
                {"id": str(uuid.uuid4()), "idx": 1, "contentMd": "Yes", "isCorrect": correct_answer == "YES"},
                {"id": str(uuid.uuid4()), "idx": 2, "contentMd": "No", "isCorrect": correct_answer == "NO"},
                {"id": str(uuid.uuid4()), "idx": 3, "contentMd": "Not Given", "isCorrect": correct_answer == "NOT GIVEN"}
            ]
            
        elif q_type == "MULTIPLE_CHOICE_SINGLE":
            normalized_q["options"] = _normalize_options(q.get("options", []))
            
        elif q_type == "MULTIPLE_CHOICE_MULTIPLE":
            # Preserve options with isCorrect flags for multiple correct answers
            normalized_q["options"] = _normalize_options(q.get("options", []))
            
        elif q_type in ["MATCHING_INFORMATION", "MATCHING_HEADING", "MATCHING_FEATURES", 
                        "MATCHING_ENDINGS", "CLASSIFICATION"]:
            correct_answer = q.get("correct_answer", "")
            q_idx = q.get("idx", 1)
            # Use unique key format matching the working SQL format
            key_prefix = {
                "MATCHING_INFORMATION": "info",
                "MATCHING_HEADING": "paragraph",
                "MATCHING_FEATURES": "feature",
                "MATCHING_ENDINGS": "ending",
                "CLASSIFICATION": "class"
            }.get(q_type, "match")
            normalized_q["matchPairs"] = {
                f"{key_prefix}-q{q_idx}": [correct_answer] if correct_answer else []
            }
            # Add options for MATCHING_HEADING (List of Headings)
            if q_type == "MATCHING_HEADING" and q.get("options"):
                normalized_q["options"] = _normalize_options(q.get("options", []))
            
        elif q_type in ["SUMMARY_COMPLETION", "SENTENCE_COMPLETION", "NOTE_COMPLETION",
                        "FORM_COMPLETION", "TABLE_COMPLETION", "DIAGRAM_LABEL", "MAP_LABEL"]:
            q_idx = q.get("idx", 1)
            # Get existing blankAcceptTexts from raw data (set in extract_data)
            raw_blank_texts = q.get("blankAcceptTexts", {})
            
            if raw_blank_texts:
                # Convert any key format to the expected blank-qX format
                first_value = next(iter(raw_blank_texts.values()), [])
                normalized_q["blankAcceptTexts"] = {
                    f"blank-q{q_idx}": first_value
                }
            else:
                # Fallback to empty
                normalized_q["blankAcceptTexts"] = {
                    f"blank-q{q_idx}": q.get("correct_answers", [])
                }
            
        elif q_type == "SHORT_ANSWER":
            normalized_q["shortAnswerAcceptTexts"] = q.get("correct_answers", [])
            
        elif q_type == "FLOW_CHART":
            normalized_q["orderCorrects"] = q.get("order_corrects", [])
        
        normalized_questions.append(normalized_q)
    
    return normalized_questions


def _normalize_options(options: list[dict]) -> list[dict]:
    """Normalize multiple choice options."""
    normalized_options = []
    
    for i, opt in enumerate(options, start=1):
        option_id = str(uuid.uuid4())
        
        # Build contentMd: include label prefix if available (e.g., "i. Early years...")
        label = opt.get("label", "")
        text = _clean_text(opt.get("text", ""))
        if label and text:
            content_md = f"{label}. {text}"
        elif text:
            content_md = text
        else:
            content_md = label
        
        normalized_options.append({
            "id": option_id,
            "idx": i,
            "contentMd": content_md,
            "isCorrect": opt.get("is_correct", False)
        })
    
    return normalized_options


# =============================================================================
# PHASE 3: VALIDATION
# =============================================================================

def validate_data(normalized_data: dict[str, Any]) -> tuple[list[dict], list[dict]]:
    """
    Phase 3: Validate normalized data against the JSON schema.
    """
    logger.info("Phase 3: Starting schema validation")
    
    try:
        with open(SCHEMA_FILE, 'r', encoding='utf-8') as f:
            schema = json.load(f)
    except FileNotFoundError:
        logger.error(f"Schema file not found: {SCHEMA_FILE}")
        raise
    
    valid_exams = []
    invalid_exams = []
    
    try:
        jsonschema.validate(instance=normalized_data, schema=schema)
        logger.info("✓ Full document validation passed")
        valid_exams = normalized_data.get("exams", [])
    except jsonschema.ValidationError as e:
        logger.warning(f"Full document validation failed: {e.message}")
        
        for exam in normalized_data.get("exams", []):
            try:
                temp_doc = {
                    "schemaVersion": normalized_data.get("schemaVersion", "1.0.0"),
                    "exams": [exam]
                }
                jsonschema.validate(instance=temp_doc, schema=schema)
                valid_exams.append(exam)
                logger.info(f"✓ Exam '{exam.get('title', 'Unknown')}' validation passed")
            except jsonschema.ValidationError as exam_error:
                invalid_exams.append({
                    "exam": exam,
                    "error": str(exam_error.message),
                    "path": list(exam_error.absolute_path)
                })
                logger.error(f"✗ Exam '{exam.get('title', 'Unknown')}' validation failed: {exam_error.message}")
    
    logger.info(f"Phase 3 complete: {len(valid_exams)} valid, {len(invalid_exams)} invalid")
    return valid_exams, invalid_exams


# =============================================================================
# PHASE 4: LOADING (SQL EXPORT) - PostgreSQL Format
# =============================================================================

def export_sql(valid_exams: list[dict]) -> str:
    """
    Phase 4: Generate PostgreSQL INSERT statements using PL/pgSQL DO blocks.
    
    Output matches the format expected by the exam service with:
    - PascalCase column names with quotes
    - gen_random_uuid() for ID generation
    - jsonb type cast for JSON columns
    - ARRAY[] for array columns
    """
    logger.info("Phase 4: Starting SQL export")
    
    sql_lines = [
        "-- ============================================",
        "-- IELTS Exam Data Import SQL",
        f"-- Generated: {datetime.now().isoformat()}",
        "-- Target: Australian Parrots Reading Passage",
        "-- ============================================",
        "",
        "BEGIN;",
        "CREATE EXTENSION IF NOT EXISTS pgcrypto;",
        ""
    ]
    
    for exam in valid_exams:
        slug = exam.get('slug', '')
        
        # Add cleanup statements to allow re-running
        sql_lines.extend([
            f"-- Cleanup existing data for slug: {slug}",
            f"DELETE FROM exam_options WHERE \"QuestionId\" IN (",
            f"  SELECT q.\"Id\" FROM exam_questions q",
            f"  JOIN exam_sections s ON s.\"Id\" = q.\"SectionId\"",
            f"  JOIN exams e ON e.\"Id\" = s.\"ExamId\"",
            f"  WHERE e.\"Slug\" = '{slug}'",
            ");",
            f"DELETE FROM exam_questions USING exam_sections s, exams e",
            f"WHERE exam_questions.\"SectionId\" = s.\"Id\"",
            f"  AND s.\"ExamId\" = e.\"Id\"",
            f"  AND e.\"Slug\" = '{slug}';",
            f"DELETE FROM exam_sections USING exams e",
            f"WHERE exam_sections.\"ExamId\" = e.\"Id\"",
            f"  AND e.\"Slug\" = '{slug}';",
            f"DELETE FROM exams",
            f"WHERE \"Slug\" = '{slug}';",
            ""
        ])
        
        # Generate PL/pgSQL DO block
        sql_lines.extend(_generate_do_block(exam))
    
    sql_lines.extend([
        "",
        "COMMIT;"
    ])
    
    sql_content = "\n".join(sql_lines)
    
    with open(SQL_FILE, 'w', encoding='utf-8') as f:
        f.write(sql_content)
    
    logger.info(f"Phase 4 complete: SQL exported to {SQL_FILE}")
    return sql_content


def _generate_do_block(exam: dict) -> list[str]:
    """Generate PL/pgSQL DO block for an exam."""
    sections = exam.get("sections", [])
    
    # Build variable declarations
    sec_vars = [f"  sec{i+1} uuid := gen_random_uuid();" for i in range(len(sections))]
    
    lines = [
        "DO $$",
        "DECLARE",
        "  exam_id uuid := gen_random_uuid();",
        *sec_vars,
        "  qid uuid;",
        "BEGIN",
        ""
    ]
    
    # Insert exam
    lines.extend(_generate_exam_insert_pg(exam))
    lines.append("")
    
    # Insert sections and questions
    for sec_idx, section in enumerate(sections, start=1):
        lines.extend(_generate_section_insert_pg(section, sec_idx))
        lines.append("")
        
        for question in section.get("questions", []):
            lines.extend(_generate_question_insert_pg(question, sec_idx))
            lines.append("")
    
    lines.extend([
        "END$$;",
        ""
    ])
    
    return lines


def _pg_escape(value: Any, is_e_string: bool = False) -> str:
    """
    Escape a value for PostgreSQL.
    
    Args:
        value: The value to escape
        is_e_string: If True, use E'' syntax for escape sequences
    """
    if value is None:
        return "NULL"
    
    if isinstance(value, bool):
        return "true" if value else "false"
    
    if isinstance(value, (int, float)):
        return str(value)
    
    if isinstance(value, dict):
        json_str = json.dumps(value, ensure_ascii=False)
        json_str = json_str.replace("'", "''")
        return f"'{json_str}'::jsonb"
    
    if isinstance(value, list):
        if not value:
            return "ARRAY[]::text[]"
        escaped = [f"'{v.replace(chr(39), chr(39)+chr(39))}'" for v in value]
        return f"ARRAY[{', '.join(escaped)}]"
    
    # String escaping
    value = str(value)
    
    # Check if we need E'' string (contains escape sequences)
    if is_e_string or '\\n' in value or '\\t' in value:
        value = value.replace("'", "''")
        return f"E'{value}'"
    else:
        value = value.replace("'", "''")
        return f"'{value}'"


def _generate_exam_insert_pg(exam: dict) -> list[str]:
    """Generate PostgreSQL INSERT for exams table."""
    return [
        f"  INSERT INTO exams (\"Id\",\"Slug\",\"Title\",\"DescriptionMd\",\"Category\",\"Level\",\"Status\",\"DurationMin\",\"UpdatedAt\")",
        "  VALUES (",
        "    exam_id,",
        f"    {_pg_escape(exam.get('slug'))},",
        f"    {_pg_escape(exam.get('title'))},",
        f"    {_pg_escape(exam.get('descriptionMd'))},",
        f"    {_pg_escape(exam.get('category'))},",
        f"    {_pg_escape(exam.get('level'))},",
        f"    {_pg_escape(exam.get('status'))},",
        f"    {exam.get('durationMin', 60)},",
        "    now()",
        "  );",
    ]


def _generate_section_insert_pg(section: dict, sec_idx: int) -> list[str]:
    """Generate PostgreSQL INSERT for exam_sections table."""
    instructions = section.get('instructionsMd', '')
    passage = section.get('passageMd', '')
    
    return [
        f"  INSERT INTO exam_sections (\"Id\",\"ExamId\",\"Idx\",\"Title\",\"InstructionsMd\",\"PassageMd\")",
        "  VALUES (",
        f"    sec{sec_idx},",
        "    exam_id,",
        f"    {section.get('idx', sec_idx)},",
        f"    {_pg_escape(section.get('title'))},",
        f"    {_pg_escape(instructions, is_e_string=True)},",
        f"    {_pg_escape(passage, is_e_string=True)}",
        "  );",
    ]


def _generate_question_insert_pg(question: dict, sec_idx: int) -> list[str]:
    """Generate PostgreSQL INSERT for exam_questions and exam_options."""
    lines = []
    q_type = question.get('type', 'MULTIPLE_CHOICE_SINGLE')
    q_idx = question.get('idx', 1)
    
    # Determine which fields to include based on question type
    blank_accept_texts = question.get('blankAcceptTexts', {})
    blank_accept_regex = question.get('blankAcceptRegex', {})
    match_pairs = question.get('matchPairs', {})
    order_corrects = question.get('orderCorrects', [])
    short_answer_accept_texts = question.get('shortAnswerAcceptTexts', [])
    short_answer_accept_regex = question.get('shortAnswerAcceptRegex', [])
    
    # Build the INSERT statement based on question type
    if q_type in ['SUMMARY_COMPLETION', 'SENTENCE_COMPLETION', 'NOTE_COMPLETION', 
                  'FORM_COMPLETION', 'TABLE_COMPLETION', 'DIAGRAM_LABEL', 'MAP_LABEL']:
        # Questions with BlankAcceptTexts
        lines.extend([
            "  qid := gen_random_uuid();",
            f"  INSERT INTO exam_questions (\"Id\",\"SectionId\",\"Idx\",\"Type\",\"Skill\",\"Difficulty\",\"PromptMd\",\"ExplanationMd\",\"BlankAcceptTexts\")",
            "  VALUES (",
            "    qid,",
            f"    sec{sec_idx},",
            f"    {q_idx},",
            f"    {_pg_escape(q_type)},",
            f"    {_pg_escape(question.get('skill', 'READING'))},",
            f"    {question.get('difficulty', 2)},",
            f"    {_pg_escape(question.get('promptMd'))},",
            f"    {_pg_escape(question.get('explanationMd'))},",
            f"    {_pg_escape(blank_accept_texts)}",
            "  );",
        ])
        
    elif q_type in ['MATCHING_HEADING', 'MATCHING_INFORMATION', 'MATCHING_FEATURES', 
                    'MATCHING_ENDINGS', 'CLASSIFICATION']:
        # Questions with MatchPairs
        lines.extend([
            "  qid := gen_random_uuid();",
            f"  INSERT INTO exam_questions (\"Id\",\"SectionId\",\"Idx\",\"Type\",\"Skill\",\"Difficulty\",\"PromptMd\",\"ExplanationMd\",\"MatchPairs\")",
            "  VALUES (",
            "    qid,",
            f"    sec{sec_idx},",
            f"    {q_idx},",
            f"    {_pg_escape(q_type)},",
            f"    {_pg_escape(question.get('skill', 'READING'))},",
            f"    {question.get('difficulty', 2)},",
            f"    {_pg_escape(question.get('promptMd'))},",
            f"    {_pg_escape(question.get('explanationMd'))},",
            f"    {_pg_escape(match_pairs)}",
            "  );",
        ])
        
        # Add options for MATCHING_HEADING (List of Headings)
        if q_type == 'MATCHING_HEADING':
            opts = question.get('options', [])
            for opt_idx, opt in enumerate(opts, 1):
                opt_content = opt.get('contentMd', '') if isinstance(opt, dict) else str(opt)
                lines.append(f"  INSERT INTO exam_options (\"Id\",\"QuestionId\",\"Idx\",\"ContentMd\",\"IsCorrect\") VALUES")
                lines.append(f"    (gen_random_uuid(), qid, {opt_idx}, {_pg_escape(opt_content)}, false);")
        
        # Add options for MULTIPLE_CHOICE_MULTIPLE (Choose THREE, etc.)
        if q_type == 'MULTIPLE_CHOICE_MULTIPLE':
            opts = question.get('options', [])
            for opt_idx, opt in enumerate(opts, 1):
                opt_content = opt.get('contentMd', '') if isinstance(opt, dict) else str(opt)
                is_correct = opt.get('isCorrect', False) if isinstance(opt, dict) else False
                lines.append(f"  INSERT INTO exam_options (\"Id\",\"QuestionId\",\"Idx\",\"ContentMd\",\"IsCorrect\") VALUES")
                lines.append(f"    (gen_random_uuid(), qid, {opt_idx}, {_pg_escape(opt_content)}, {_pg_bool(is_correct)});")
        
    elif q_type == 'FLOW_CHART':
        # Questions with OrderCorrects
        lines.extend([
            "  qid := gen_random_uuid();",
            f"  INSERT INTO exam_questions (\"Id\",\"SectionId\",\"Idx\",\"Type\",\"Skill\",\"Difficulty\",\"PromptMd\",\"ExplanationMd\",\"OrderCorrects\")",
            "  VALUES (",
            "    qid,",
            f"    sec{sec_idx},",
            f"    {q_idx},",
            f"    {_pg_escape(q_type)},",
            f"    {_pg_escape(question.get('skill', 'READING'))},",
            f"    {question.get('difficulty', 2)},",
            f"    {_pg_escape(question.get('promptMd'))},",
            f"    {_pg_escape(question.get('explanationMd'))},",
            f"    {_pg_escape(order_corrects)}",
            "  );",
        ])
        
    elif q_type == 'SHORT_ANSWER':
        # Questions with ShortAnswerAcceptTexts
        lines.extend([
            "  qid := gen_random_uuid();",
            f"  INSERT INTO exam_questions (\"Id\",\"SectionId\",\"Idx\",\"Type\",\"Skill\",\"Difficulty\",\"PromptMd\",\"ExplanationMd\",\"ShortAnswerAcceptTexts\")",
            "  VALUES (",
            "    qid,",
            f"    sec{sec_idx},",
            f"    {q_idx},",
            f"    {_pg_escape(q_type)},",
            f"    {_pg_escape(question.get('skill', 'READING'))},",
            f"    {question.get('difficulty', 2)},",
            f"    {_pg_escape(question.get('promptMd'))},",
            f"    {_pg_escape(question.get('explanationMd'))},",
            f"    {_pg_escape(short_answer_accept_texts)}",
            "  );",
        ])
        
    else:
        # MULTIPLE_CHOICE_SINGLE, TRUE_FALSE_NOT_GIVEN, YES_NO_NOT_GIVEN, MULTIPLE_CHOICE_SINGLE_IMAGE
        lines.extend([
            "  qid := gen_random_uuid();",
            f"  INSERT INTO exam_questions (\"Id\",\"SectionId\",\"Idx\",\"Type\",\"Skill\",\"Difficulty\",\"PromptMd\",\"ExplanationMd\")",
            "  VALUES (",
            "    qid,",
            f"    sec{sec_idx},",
            f"    {q_idx},",
            f"    {_pg_escape(q_type)},",
            f"    {_pg_escape(question.get('skill', 'READING'))},",
            f"    {question.get('difficulty', 2)},",
            f"    {_pg_escape(question.get('promptMd'))},",
            f"    {_pg_escape(question.get('explanationMd'))}",
            "  );",
        ])
        
        # Add options for multiple choice type questions
        for option in question.get('options', []):
            lines.append(f"  INSERT INTO exam_options (\"Id\",\"QuestionId\",\"Idx\",\"ContentMd\",\"IsCorrect\") VALUES")
            lines.append(f"    (gen_random_uuid(), qid, {option.get('idx', 1)}, {_pg_escape(option.get('contentMd'))}, {_pg_escape(option.get('isCorrect', False))});")
    
    return lines


# =============================================================================
# MAIN EXECUTION
# =============================================================================

def main():
    """
    Main entry point - orchestrates all 4 phases.
    """
    logger.info("=" * 60)
    logger.info("IELTS Exam Data Crawler - Starting")
    logger.info("=" * 60)
    
    try:
        # Phase 1: Extraction
        raw_data = extract_data(TARGET_URL)
        
        # Phase 2: Normalization
        normalized_data = normalize_data(raw_data)
        
        # Phase 3: Validation
        valid_exams, invalid_exams = validate_data(normalized_data)
        
        if not valid_exams:
            logger.error("No valid exams to export. Check error.log for details.")
            return 1
        
        # Phase 4: SQL Export
        export_sql(valid_exams)
        
        logger.info("=" * 60)
        logger.info("IELTS Exam Data Crawler - Complete")
        logger.info(f"  Raw data:       {RAW_DATA_FILE}")
        logger.info(f"  Normalized:     {NORMALIZED_FILE}")
        logger.info(f"  SQL output:     {SQL_FILE}")
        logger.info(f"  Error log:      {ERROR_LOG_FILE}")
        logger.info("=" * 60)
        
        return 0
        
    except Exception as e:
        logger.exception(f"Crawler failed with error: {e}")
        return 1


if __name__ == "__main__":
    exit(main())
