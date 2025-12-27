#!/usr/bin/env python3
"""
IELTS Exam Data Crawler - ielts-writing.info
=============================================
Crawls IELTS reading exams from ielts-writing.info and exports to SQL.

Usage:
    python crawler-ieltswriting.py [URL]
    
Example:
    python crawler-ieltswriting.py https://www.ielts-writing.info/EXAM/ielts_reading/1186/

STANDARDIZED QUESTION FORMATS (v5.0) - LOCKED
==============================================
⚠️ DO NOT MODIFY BACKEND OR FRONTEND - ONLY DATA/SCRIPT CHANGES ALLOWED

1. YES_NO_NOT_GIVEN / TRUE_FALSE_NOT_GIVEN:
   - HTML: <p class="inline-question"> + <span data-answer='YES'>
   - Options: 3 choices (YES/NO/NOT GIVEN), one IsCorrect=true
   - MatchPairs: NULL

2. MULTIPLE_CHOICE_SINGLE:
   - HTML: <div class="mchq" data-answer="D"> (single letter)
   - Options: A-D with "A. Text" format, one IsCorrect=true
   - MatchPairs: NULL

3. MULTIPLE_CHOICE_MULTIPLE: ⭐
   - Detection: "Choose TWO/THREE/FOUR" in prompt OR comma in data-answer (B,C,D,G)
   - HTML: <div class="mchq" data-answer="B,C,D,G">
   - Options: A-G with "A. Text" format, MULTIPLE IsCorrect=true
   - MatchPairs: NULL

4. MATCHING_HEADING:
   - HTML: <p class="inline-question"> + <div class="lows-headers">
   - Options: roman numerals "i. Full heading text"
   - MatchPairs: {"paragraph-a-q1": ["iii", "iii. Full text"]} (index 0=grading, 1=display)

5. MATCHING_FEATURES:
   - HTML: <span data-items='A / B / C' data-answer='C'>
   - MatchPairs: {"feature-q6": ["C. FULL OPTION TEXT"]} ⚠️ NOT JUST "C"

6. MATCHING_INFORMATION: ⭐ (LOCKED)
   - HTML: <p class="sq"> + <span data-answer="E"> (single letter A-J)
   - Answer: single letter representing paragraph
   - BlankAcceptTexts: {"blank-q5": ["E"]}
   - MatchPairs: NULL

7. SUMMARY_COMPLETION: ⭐ (LOCKED FORMAT)
   - HTML: <span data-answer="text answer"> in <p class="sq">
   - Spans are EMPTY in raw HTML (no dots)
   - Skip if answer is YES/NO/NOT GIVEN/TRUE/FALSE or single letter
   
   CRAWLER RULES:
   1. Clone parent element
   2. Compare data-answer to find CURRENT span → replace with _______
   3. Replace OTHER spans with (...)
   4. Add instruction header before content
   5. Truncate to 800 chars (ensure all blanks included)
   
   PROMPTMD FORMAT (REQUIRED):
   "Questions (...) - (...) Complete the notes below. Choose ONE WORD AND/OR A NUMBER 
   from the passage for each answer. [Content with _______ for current, (...) for others]"
   
   EXPLANATIONMD (FIXED):
   "Use NO MORE THAN THREE WORDS from the passage to complete the blank."
   
   BLANKACCEPTTEXTS: {"blank-qN": ["answer"]}

INDEXING PIPELINE: ⭐
====================
1. Extract ALL questions (dropdown, MC, span completion)
2. Sort by HTML position - ensure correct order in exam
3. Reassign Idx from 1 - unique and sequential

Example (Bài #30):
  Q1-4: SUMMARY_COMPLETION (first in HTML)
  Q5-9: MATCHING_INFORMATION
  Q10-13: YES_NO_NOT_GIVEN (last in HTML)

CAPITALIZATION:
===============
- PromptMd MUST have first letter capitalized
- Options format: "A. Option text" (letter + dot + space + text)
"""

import requests
from bs4 import BeautifulSoup
import json
import re
import uuid
import logging
from pathlib import Path
from datetime import datetime
from typing import Any

# Configuration
TARGET_URL = "https://www.ielts-writing.info/EXAM/ielts_reading/1224/"
OUTPUT_DIR = Path(__file__).parent
SEEDS_DIR = Path(__file__).parent.parent.parent / "deploy" / "seeds"

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Headers to avoid being blocked
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
}

# Known answers for specific exams (since answers require JS click to reveal)
# Format: {exam_id: {question_num: answer}}
KNOWN_ANSWERS = {
    "1224": {
        1: "YES",
        2: "YES", 
        3: "NO",
        4: "NOT GIVEN",
        5: "NO",
        6: "D",  # Action to protect fish stocks is urgently needed
        7: "C",  # Based on predictions which were inaccurate
        8: "A",  # The means of avoiding worst outcomes needs to be prioritised
        9: "B",  # controls
        10: "F", # fishing techniques
        11: "D", # fish catches
        12: "I", # the land
        13: "H", # marine reserves
        14: "C", # failure
    }
}


def fetch_page(url: str) -> BeautifulSoup:
    """Fetch and parse a page."""
    response = requests.get(url, headers=HEADERS, timeout=30)
    response.raise_for_status()
    return BeautifulSoup(response.text, 'html.parser')


def extract_passage(soup: BeautifulSoup, base_url: str) -> dict:
    """Extract passage content from the reading paper link."""
    # Find reading paper link
    reading_link = soup.find('a', class_='reading-link')
    if not reading_link:
        # Try finding by text
        reading_link = soup.find('a', string=re.compile(r'Reading paper', re.I))
    
    passage_text = ""
    passage_title = ""
    
    if reading_link:
        passage_url = reading_link.get('href', '')
        if not passage_url.startswith('http'):
            # Relative URL - construct full URL
            from urllib.parse import urljoin
            passage_url = urljoin(base_url, passage_url)
        
        try:
            logger.info(f"Fetching passage from: {passage_url}")
            passage_soup = fetch_page(passage_url)
            
            # Extract title
            title_elem = passage_soup.find('h1') or passage_soup.find('h2')
            if title_elem:
                passage_title = title_elem.get_text(strip=True)
            
            # Extract passage text - usually in body or main content
            body = passage_soup.find('body')
            if body:
                # Remove scripts and styles
                for tag in body.find_all(['script', 'style', 'nav', 'header', 'footer']):
                    tag.decompose()
                passage_text = body.get_text(separator='\n', strip=True)
                
                # Clean up noise patterns
                noise_patterns = [
                    r'^×\s*$',                           # Close button
                    r'^×$',                              # Just X
                    r'^SHARE THIS PAGE.*$',              # Share section
                    r'^CONTACT US.*$',                   # Contact section
                    r'^IELTS QUESTIONS.*$',              # Navigation
                    r'^LIFE IN THE UK TEST.*$',          # Navigation
                    r'^The reading, writing and listening practice tests.*$',  # Disclaimer
                    r'^While using this site.*$',        # Cookie notice
                    r'^Dear readers,.*$',                # Domain message
                    r'^This is to inform you.*$',        # Domain message
                    r'^Our old domain.*$',               # Domain message
                    r'^We look forward to.*$',           # Domain message
                    r'^OK, I understand.*$',             # Button
                    r'^https?://www\.ielts.*$',          # URL lines
                ]
                for pattern in noise_patterns:
                    passage_text = re.sub(pattern, '', passage_text, flags=re.MULTILINE | re.IGNORECASE)
                
                # Remove multiple newlines
                passage_text = re.sub(r'\n{3,}', '\n\n', passage_text)
                passage_text = passage_text.strip()
                
        except Exception as e:
            logger.warning(f"Failed to fetch passage: {e}")
    
    return {
        'title': passage_title,
        'text': passage_text
    }


def extract_exam_title(soup: BeautifulSoup) -> str:
    """Extract exam title from page."""
    # Try h1 first
    h1 = soup.find('h1')
    if h1:
        return h1.get_text(strip=True)
    
    # Try title tag
    title = soup.find('title')
    if title:
        text = title.get_text(strip=True)
        # Clean up title
        text = re.sub(r'\s*\|\s*IELTS.*$', '', text)
        return text
    
    return "IELTS Reading Test"


def extract_word_list(soup: BeautifulSoup) -> dict:
    """Extract word list/word bank from .lows-2 container.
    
    Returns dict like {'A': 'action', 'B': 'controls', ...}
    """
    word_list = {}
    
    # Find the word list container (div with class lows-2)
    word_container = soup.find('div', class_='lows-2')
    
    if word_container:
        # Each child div contains: <span class="lows-l">A</span> word
        for item in word_container.find_all('div', recursive=False):
            letter_span = item.find('span', class_='lows-l')
            if letter_span:
                letter = letter_span.get_text(strip=True).upper()
                # Get the word (text after the span)
                word = item.get_text(strip=True)
                # Remove the letter from the word
                word = word.replace(letter, '', 1).strip()
                word_list[letter] = word
    
    # If no word list found, return empty dict
    return word_list


def extract_heading_list(soup: BeautifulSoup) -> list[dict]:
    """Extract heading list from .lows-headers container.
    
    Returns list like [{'value': 'i', 'label': 'i. Shielding the earth...'}, ...]
    """
    headings = []
    
    # Find heading list container (div with class lows-headers)
    heading_container = soup.find('div', class_='lows-headers')
    
    if heading_container:
        # Each child div contains: <span>i</span><span>Heading title</span>
        for item in heading_container.find_all('div', recursive=False):
            spans = item.find_all('span')
            if len(spans) >= 2:
                numeral = spans[0].get_text(strip=True).lower()
                title = spans[1].get_text(strip=True)
                if numeral and title:
                    headings.append({
                        'value': numeral,
                        'label': f"{numeral}. {title}",
                        'is_correct': False  # Will be set per question
                    })
            elif len(spans) == 1:
                # Single span with numeral only
                numeral = spans[0].get_text(strip=True).lower()
                if re.match(r'^[ivxlcdm]+$', numeral):  # Roman numeral
                    # Get text after span
                    text = item.get_text(strip=True)
                    text = text.replace(numeral, '', 1).strip()
                    if text:
                        headings.append({
                            'value': numeral,
                            'label': f"{numeral}. {text}",
                            'is_correct': False
                        })
    
    return headings


def extract_phrase_list(soup: BeautifulSoup) -> list[dict]:
    """Extract phrase list from 'List of Phrases' container.
    
    Returns list like [{'value': 'A', 'label': 'A. work in groups...'}, ...]
    """
    phrases = []
    
    # Find container with "List of Phrases" text
    phrase_header = soup.find(string=re.compile(r'List of Phrases', re.IGNORECASE))
    if not phrase_header:
        return phrases
    
    # Get grandparent container (the phrase list is usually 2 levels up)
    container = phrase_header.find_parent(['div', 'table'])
    if container:
        container = container.find_parent(['div', 'table']) or container
    if not container:
        return phrases
    
    # Extract phrases from divs that contain letter + phrase pattern
    for item in container.find_all('div'):
        spans = item.find_all('span', recursive=False)
        if len(spans) >= 2:
            letter = spans[0].get_text(strip=True).upper()
            text = spans[1].get_text(strip=True)
            if letter and len(letter) == 1 and letter.isalpha() and text and len(text) > 5:
                # Avoid duplicates
                if not any(p['value'] == letter for p in phrases):
                    phrases.append({
                        'value': letter,
                        'label': f"{letter}. {text}",
                        'is_correct': False
                    })
    
    return phrases


def extract_questions(soup: BeautifulSoup) -> list[dict]:
    """Extract all questions from the page using ielts-writing.info HTML structure."""
    questions = []
    
    # Get all spans with data-answer in order of appearance
    all_spans = soup.find_all('span', attrs={'data-answer': True})
    
    # Track which spans we've processed
    processed_spans = set()
    
    # Pattern 1: Extract YES/NO/NOT GIVEN from inline-question paragraphs
    dropdown_questions = extract_dropdown_questions(soup)
    for q in dropdown_questions:
        questions.append(q)
    
    # Track processed answers to avoid duplicates
    processed_answers = set()
    for q in dropdown_questions:
        if q.get('correct_answer'):
            processed_answers.add(q['correct_answer'].lower())
    
    # Pattern 2: Multiple choice questions from .mchq divs
    mc_questions = extract_mchq_questions(soup, start_idx=1)  # Will be renumbered later
    questions.extend(mc_questions)
    
    # Pattern 3: Summary Completion from span elements with data-answer (fill-in-blank text)
    # Pass processed_answers to avoid duplicates
    # Use high start_idx (1000) so they sort to end initially, then reassign
    span_questions = extract_span_completion(soup, start_idx=1000, processed_answers=processed_answers)
    questions.extend(span_questions)
    
    # Now sort all questions by their HTML position and reassign Idx
    # For each question, find its position in the original soup
    html_str = str(soup)
    
    def get_html_position(q):
        answer = q.get('correct_answer', '')
        
        # Try to find exact data-answer attribute first
        if answer:
            # For answers with special chars, escape them
            escaped_answer = answer.replace('"', '&quot;')
            patterns = [
                f'data-answer="{answer}"',
                f"data-answer='{answer}'",
                f'data-answer="{escaped_answer}"',
            ]
            for pattern in patterns:
                pos = html_str.find(pattern)
                if pos != -1:
                    return pos
        
        # Fallback: try to find prompt text
        prompt = q.get('prompt', '')[:50]
        if prompt:
            pos = html_str.find(prompt[:30])
            if pos != -1:
                return pos
        
        return 999999  # Default to end if not found
    
    # Sort by original idx from HTML (extracted from <strong> tags)
    # This preserves the original question order as it appears on the page
    questions.sort(key=lambda q: (q.get('idx', 999), get_html_position(q)))
    
    # Reassign Idx from 1 to ensure sequential numbering
    for i, q in enumerate(questions):
        q['idx'] = i + 1
    
    return questions


def extract_dropdown_questions(soup: BeautifulSoup) -> list[dict]:
    """Extract YES/NO/NOT GIVEN and Summary Completion questions."""
    questions = []
    
    # Pattern 1: YES/NO/NOT GIVEN from p.inline-question
    inline_questions = soup.find_all('p', class_='inline-question')
    for p in inline_questions:
        # Find span with data-answer attribute
        answer_span = p.find('span', attrs={'data-answer': True})
        if not answer_span:
            continue
        
        correct_answer = answer_span.get('data-answer', '').strip().upper()
        
        # Get question text from paragraph
        prompt = p.get_text(separator=' ', strip=True)
        prompt = re.sub(r'\s+', ' ', prompt)
        
        # Extract question number from <strong> tag or text
        q_num = 0
        strong = p.find('strong')
        if strong:
            num_text = strong.get_text(strip=True)
            if num_text.isdigit():
                q_num = int(num_text)
        
        if q_num == 0:
            # Try to find from text
            num_match = re.match(r'^(\d+)', prompt)
            if num_match:
                q_num = int(num_match.group(1))
        
        # Clean prompt - remove number at start
        prompt = re.sub(r'^\d+\s*', '', prompt)
        
        # Skip example questions (data-readonly=true)
        if answer_span.get('data-readonly') == 'true':
            continue
        
        # Check for data-items attribute (MATCHING_FEATURES with options)
        data_items = answer_span.get('data-items', '')
        
        # Determine type based on correct answer format and data-items
        if correct_answer in ['YES', 'NO', 'NOT GIVEN']:
            q_type = 'YES_NO_NOT_GIVEN'
            options = [
                {'label': 'YES', 'value': 'YES', 'is_correct': correct_answer == 'YES'},
                {'label': 'NO', 'value': 'NO', 'is_correct': correct_answer == 'NO'},
                {'label': 'NOT GIVEN', 'value': 'NOT GIVEN', 'is_correct': correct_answer == 'NOT GIVEN'},
            ]
        elif correct_answer in ['TRUE', 'FALSE']:
            q_type = 'TRUE_FALSE_NOT_GIVEN'
            options = [
                {'label': 'TRUE', 'value': 'TRUE', 'is_correct': correct_answer == 'TRUE'},
                {'label': 'FALSE', 'value': 'FALSE', 'is_correct': correct_answer == 'FALSE'},
                {'label': 'NOT GIVEN', 'value': 'NOT GIVEN', 'is_correct': correct_answer == 'NOT GIVEN'},
            ]
        elif data_items:
            # MATCHING_FEATURES with options like "A / B / C"
            q_type = 'MATCHING_FEATURES'
            item_list = [i.strip() for i in data_items.split('/')]
            options = [
                {'label': item, 'value': item, 'is_correct': item == correct_answer}
                for item in item_list
            ]
        elif re.match(r'^(i{1,3}|iv|v|vi{1,3}|ix|x)$', correct_answer.lower()):
            # MATCHING_HEADING with roman numerals (i, ii, iii, iv, v, vi, vii, viii, ix, x)
            # Only treat as heading if we can find heading list on page
            heading_list = extract_heading_list(soup)
            if heading_list:
                q_type = 'MATCHING_HEADING'
                correct_lower = correct_answer.lower()
                options = [
                    {'label': h['label'], 'value': h['value'], 'is_correct': h['value'] == correct_lower}
                    for h in heading_list
                ]
            else:
                # No heading list found, treat as MATCHING_INFORMATION
                q_type = 'MATCHING_INFORMATION'
                options = []
        elif len(correct_answer) == 1 and correct_answer.isalpha():
            # Single letter answer (A-Z)
            # Check if there's a phrase list - if so, it's MATCHING_FEATURES
            phrase_list = extract_phrase_list(soup)
            if phrase_list and correct_answer.upper() in [p['value'] for p in phrase_list]:
                q_type = 'MATCHING_FEATURES'
                options = [
                    {'label': p['label'], 'value': p['value'], 'is_correct': p['value'] == correct_answer.upper()}
                    for p in phrase_list
                ]
            else:
                # No phrase list found, treat as MATCHING_INFORMATION
                q_type = 'MATCHING_INFORMATION'
                options = []
        else:
            continue  # Skip unknown types
        
        if q_num > 0:
            # Capitalize first letter of prompt
            clean_prompt = prompt[:500] if prompt else f"Question {q_num}"
            if clean_prompt and len(clean_prompt) > 0:
                clean_prompt = clean_prompt[0].upper() + clean_prompt[1:]
            
            questions.append({
                'idx': q_num,
                'type': q_type,
                'prompt': clean_prompt,
                'options': options,
                'correct_answer': correct_answer
            })
    
    
    return questions


def extract_mchq_questions(soup: BeautifulSoup, start_idx: int = 7) -> list[dict]:
    """Extract multiple choice questions from .mchq containers."""
    questions = []
    
    # Find all .mchq divs (Multiple Choice Question containers)
    mchq_divs = soup.find_all('div', class_='mchq', attrs={'data-answer': True})
    
    for idx, div in enumerate(mchq_divs):
        correct_answer = div.get('data-answer', '').strip().upper()
        
        # Find question stem - first look INSIDE the div, then look for preceding sibling
        prompt = ""
        q_num = start_idx + idx # Initial assignment, will be overwritten if found in HTML
        
        # First try to find question inside div (p.inline-question)
        inner_question = div.find('p', class_='inline-question')
        if inner_question:
            text = inner_question.get_text(strip=True)
            # Extract just the question part (after the number)
            match = re.match(r'^(\d+)\s*(.+)', text)
            if match:
                q_num = int(match.group(1))  # Use actual question number from HTML
                prompt = match.group(2)
            else:
                prompt = text
        else:
            # Fallback: look for preceding sibling
            prev = div.find_previous_sibling(['p', 'h4'])
            if prev:
                text = prev.get_text(strip=True)
                match = re.match(r'^(\d+)\s*(.+)', text)
                if match:
                    q_num = int(match.group(1))
                    prompt = match.group(2)
                else:
                    prompt = text
        
        # Detect MULTIPLE_CHOICE_MULTIPLE by checking:
        # 1. Prompt contains "Choose TWO/THREE/FOUR/FIVE" 
        # 2. data-answer contains comma (multiple answers like "B,C,D,G")
        is_multiple = bool(re.search(r'Choose\s*(TWO|THREE|FOUR|FIVE|SIX)', prompt, re.IGNORECASE)) or ',' in correct_answer
        
        # If prompt is still empty or too short, use a generic one
        if len(prompt) < 10:
            prompt = f"Choose the correct answer for question {q_num}."
        
        # Extract options from .custom-control-label elements
        options = []
        option_labels = div.find_all('label', class_='custom-control-label')
        
        # Parse correct answers (may be multiple like "B,C,D,G")
        correct_answers = [a.strip().upper() for a in correct_answer.split(',')]
        
        for label in option_labels:
            # Get the full option text
            opt_text = label.get_text(strip=True)
            
            # Extract option letter (A, B, C, D, etc.)
            radio_input = label.find_previous_sibling('input', {'type': ['radio', 'checkbox']})
            opt_value = radio_input.get('value', '').upper() if radio_input else ''
            
            # Clean up option text - add space after letter if missing
            # Pattern: "AThe means..." -> "A. The means..."
            cleaned_text = re.sub(r'^([A-G])([A-Z])', r'\1. \2', opt_text)
            
            if not opt_value:
                # Try to extract from label text
                letter_match = re.match(r'^([A-G])[\.\s]', cleaned_text)
                if letter_match:
                    opt_value = letter_match.group(1)
            
            is_correct = opt_value in correct_answers
            
            options.append({
                'label': cleaned_text,
                'value': opt_value,
                'is_correct': is_correct
            })
        
        # Capitalize first letter of prompt
        clean_prompt = prompt[:500] if prompt else f"Question {q_num}"
        if clean_prompt and len(clean_prompt) > 0:
            clean_prompt = clean_prompt[0].upper() + clean_prompt[1:]
        
        q_type = 'MULTIPLE_CHOICE_MULTIPLE' if is_multiple else 'MULTIPLE_CHOICE_SINGLE'
        
        questions.append({
            'idx': q_num,
            'type': q_type,
            'prompt': clean_prompt,
            'options': options,
            'correct_answer': correct_answer
        })
    
    return questions


def extract_span_completion(soup: BeautifulSoup, start_idx: int, processed_answers: set = None) -> list[dict]:
    """Extract Summary Completion questions from span elements with data-answer.
    
    These are fill-in-the-blank questions where the blank is represented as:
    <span data-answer="regular income">..........</span>
    """
    if processed_answers is None:
        processed_answers = set()
    
    questions = []
    
    # Find all spans with data-answer that contain placeholder dots (not dropdowns)
    # These are typically in summary completion sections
    spans = soup.find_all('span', attrs={'data-answer': True})
    
    q_num = start_idx
    for span in spans:
        answer = span.get('data-answer', '').strip()
        
        # Skip if already processed by dropdown extractor
        if answer.lower() in processed_answers:
            continue
        
        # Skip if already processed as dropdown (YES/NO/NOT GIVEN, etc.)
        # These are characterized by having dropdown/select inside
        if span.find('select') or span.find('input'):
            continue
        
        # Skip YES/NO/NOT GIVEN/TRUE/FALSE answers (already handled by dropdown extractor)
        if answer.upper() in ['YES', 'NO', 'NOT GIVEN', 'TRUE', 'FALSE']:
            continue
        
        # Skip if answer looks like multiple choice (single letters or comma-separated)
        if re.match(r'^[A-G](,[A-G])*$', answer.upper()):
            continue
        
        # Skip if answer looks like a letter/roman numeral (handled by other extractors)
        if re.match(r'^[A-Za-z]$', answer) or re.match(r'^(i|ii|iii|iv|v|vi|vii|viii|ix|x)$', answer.lower()):
            continue
        
        # This is a text completion (fill-in-blank) question
        if len(answer) > 1:  # Skip single characters
            # Get surrounding context for the prompt
            # First try to find the closest paragraph
            parent = span.find_parent('p')
            if not parent:
                parent = span.find_parent(['td', 'li'])  # Try table cell or list item
            if not parent:
                parent = span.find_parent('div')  # Last resort: div
            
            if parent:
                # Special handling for table cells (td)
                if parent.name == 'td':
                    # Get table header as context
                    table = span.find_parent('table')
                    if table:
                        th = table.find('th')
                        table_context = th.get_text(strip=True) if th else "Complete the table"
                        
                        # Get row context (first td in the row if exists and different from current)
                        row = span.find_parent('tr')
                        row_prefix = ""
                        if row:
                            # Get all tds in row
                            all_tds = row.find_all('td')
                            if len(all_tds) > 1:
                                # There's a row header (first td)
                                first_td = all_tds[0]
                                if first_td != parent:
                                    row_prefix = f"{first_td.get_text(strip=True)} - "
                        
                        # Get cell content and append blank (span is empty placeholder)
                        cell_text = parent.get_text(strip=True)
                        # Cell text typically is like "1)" so we append blank
                        context_with_blanks = f"{table_context}: {row_prefix}{cell_text} _______"
                    else:
                        cell_text = parent.get_text(strip=True)
                        context_with_blanks = f"Complete: {cell_text} _______"
                else:
                    # Non-table cell: use existing logic
                    # Clone parent to manipulate
                    from copy import copy
                    parent_copy = BeautifulSoup(str(parent), 'html.parser')
                    
                    # Get raw text to check if we need cleanup
                    raw_text = parent_copy.get_text(separator=' ', strip=True)
                    
                    # Check if parent contains too much noise (Reading Tips, etc.)
                    needs_cleanup = (
                        len(raw_text) > 400 or 
                        'Reading Tip' in raw_text or 
                        'IELTS Reading Sample' in raw_text or
                        'Reading paper for this section' in raw_text
                    )
                    
                    if needs_cleanup:
                        # Extract only the specific sentence/row with the blank
                        # Remove everything before "Reading paper for this section"
                        if 'Reading paper for this section' in raw_text:
                            parts = raw_text.split('Reading paper for this section')
                            if len(parts) > 1:
                                raw_text = parts[1].strip()
                        
                        # Remove Reading Tip content
                        if 'Reading Tip' in raw_text:
                            parts = raw_text.split('Reading Tip')
                            raw_text = parts[0].strip() if parts else raw_text
                        
                        # Now replace answer in raw_text with blank marker
                        if answer in raw_text:
                            context_with_blanks = raw_text.replace(answer, '_______', 1)[:400]
                        else:
                            # Fallback - just use cleaned text with blank at end
                            context_with_blanks = f"{raw_text[:300]} _______"
                    else:
                        # Parent is reasonably sized, use normal logic
                        # Find all spans with data-answer in the copy
                        all_spans_in_parent = parent_copy.find_all('span', attrs={'data-answer': True})
                        
                        # The current span's answer - use this to identify which blank to mark as _______
                        current_answer = answer
                        
                        # Replace spans with markers
                        for span_in_copy in all_spans_in_parent:
                            span_answer = span_in_copy.get('data-answer', '')
                            if span_answer.upper() in ['YES', 'NO', 'NOT GIVEN', 'TRUE', 'FALSE']:
                                continue
                            if len(span_answer) <= 1:
                                continue
                            
                            if span_answer == current_answer:
                                span_in_copy.replace_with('_______')
                            else:
                                span_in_copy.replace_with('(...)')
                        
                        context_with_blanks = parent_copy.get_text(separator=' ', strip=True)[:400]
            else:
                context_with_blanks = f"Complete the blank _______"
            
            # Add instruction header (IELTS standard format)
            instruction_header = f"Questions (...) - (...) Complete the notes below. Choose ONE WORD AND/OR A NUMBER from the passage for each answer. Write your answers in boxes (...) - (...) on your answer sheet."
            prompt = f"{instruction_header}\n\n{context_with_blanks}"
            
            questions.append({
                'idx': q_num,
                'type': 'SUMMARY_COMPLETION',
                'prompt': prompt,
                'options': [],
                'correct_answer': answer,
                'blank_accepts': [answer]  # Accept texts for this blank
            })
            q_num += 1
    
    return questions


def generate_exam_json(data: dict) -> dict:
    """Generate exam data in exam-import.schema.json format.
    
    This is the standardized JSON format for validation and review.
    """
    import uuid as uuid_module
    
    title = data.get('title', 'IELTS Reading Test')
    slug = re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')
    slug = f"ielts-reading-{slug}"
    
    passage = data.get('passage', {})
    raw_questions = data.get('questions', [])
    
    # Transform questions to schema format
    schema_questions = []
    for q in raw_questions:
        q_type = q.get('type', 'MULTIPLE_CHOICE_SINGLE')
        q_idx = q.get('idx', 1)
        prompt = q.get('prompt', '')
        correct = q.get('correct_answer', '')
        options = q.get('options', [])
        
        # Build schema question
        schema_q = {
            "id": str(uuid_module.uuid4()),
            "idx": q_idx,
            "type": q_type,
            "skill": "READING",
            "difficulty": 2,
            "promptMd": prompt,
            "explanationMd": None,
            "options": [],
            "blankAcceptTexts": {},
            "blankAcceptRegex": {},
            "matchPairs": {},
            "orderCorrects": [],
            "shortAnswerAcceptTexts": [],
            "shortAnswerAcceptRegex": []
        }
        
        # Handle different question types
        if q_type in ['SUMMARY_COMPLETION', 'NOTE_COMPLETION', 'TABLE_COMPLETION', 'SENTENCE_COMPLETION', 'FORM_COMPLETION']:
            if correct:
                blank_key = f"blank-q{q_idx}"
                # Handle multiple answers separated by /
                answers = [a.strip() for a in str(correct).split('/')]
                schema_q["blankAcceptTexts"] = {blank_key: answers}
        
        elif q_type.startswith('MATCHING_'):
            if correct:
                match_key = f"match-q{q_idx}"
                # For MATCHING_HEADING: include both value and full label
                if q_type == 'MATCHING_HEADING':
                    correct_value = correct.lower()
                    full_label = correct_value
                    for opt in options:
                        if opt.get('value', '').lower() == correct_value:
                            full_label = opt.get('label', correct_value)
                            break
                    schema_q["matchPairs"] = {match_key: [correct_value, full_label]}
                else:
                    # For other MATCHING_* types
                    correct_value = correct.upper() if q_type == 'MATCHING_FEATURES' else correct.lower()
                    schema_q["matchPairs"] = {match_key: [correct_value]}
        
        elif q_type in ['MULTIPLE_CHOICE_SINGLE', 'MULTIPLE_CHOICE_MULTIPLE']:
            for i, opt in enumerate(options, 1):
                is_correct = opt.get('is_correct', False)
                if not is_correct and correct:
                    # Check if this option matches correct answer
                    is_correct = opt.get('value') == correct or opt.get('label', '').startswith(correct)
                
                schema_q["options"].append({
                    "id": str(uuid_module.uuid4()),
                    "idx": i,
                    "contentMd": opt.get('label', ''),
                    "isCorrect": is_correct
                })
        
        # TRUE_FALSE_NOT_GIVEN and YES_NO_NOT_GIVEN don't need special handling
        # (they use matchPairs or options depending on frontend implementation)
        
        schema_questions.append(schema_q)
    
    # Build full exam structure
    exam_json = {
        "schemaVersion": "1.0.0",
        "exams": [{
            "id": str(uuid_module.uuid4()),
            "slug": slug,
            "title": title,
            "descriptionMd": f"IELTS Reading Practice: {title}",
            "category": "IELTS",
            "level": "B2",
            "status": "PUBLISHED",
            "durationMin": 20,
            "sections": [{
                "id": str(uuid_module.uuid4()),
                "idx": 1,
                "title": f"Reading Passage - {title}",
                "instructionsMd": passage.get('text', ''),
                "audioUrl": None,
                "transcriptMd": None,
                "questions": schema_questions
            }]
        }]
    }
    
    return exam_json


def generate_sql(data: dict) -> str:
    """Generate SQL insert statements."""
    title = data.get('title', 'IELTS Reading Test')
    slug = re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')
    slug = f"ielts-reading-{slug}"
    
    passage = data.get('passage', {})
    questions = data.get('questions', [])
    
    sql_lines = [
        "-- ============================================",
        f"-- IELTS Exam Data Import SQL",
        f"-- Generated: {datetime.now().isoformat()}",
        f"-- Source: ielts-writing.info",
        f"-- Title: {title}",
        "-- ============================================",
        "",
        "BEGIN;",
        "CREATE EXTENSION IF NOT EXISTS pgcrypto;",
        "",
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
        "",
        "DO $$",
        "DECLARE",
        "  exam_id uuid := gen_random_uuid();",
        "  sec1 uuid := gen_random_uuid();",
        "  qid uuid;",
        "BEGIN",
        "",
    ]
    
    # Insert exam
    sql_lines.extend([
        f"  INSERT INTO exams (\"Id\",\"Slug\",\"Title\",\"DescriptionMd\",\"Category\",\"Level\",\"Status\",\"DurationMin\",\"UpdatedAt\")",
        "  VALUES (",
        f"    exam_id,",
        f"    '{slug}',",
        f"    '{escape_sql(title)}',",
        f"    'IELTS Reading Practice Test: {escape_sql(title)}',",
        f"    'IELTS',",
        f"    'B2',",
        f"    'PUBLISHED',",
        f"    20,",
        f"    now()",
        "  );",
        "",
    ])
    
    # Insert section with passage
    passage_text = escape_sql(passage.get('text', '')[:8000])  # Limit length
    sql_lines.extend([
        f"  INSERT INTO exam_sections (\"Id\",\"ExamId\",\"Idx\",\"Title\",\"InstructionsMd\")",
        "  VALUES (",
        f"    sec1,",
        f"    exam_id,",
        f"    1,",
        f"    'Reading Passage - {escape_sql(title)}',",
        f"    E'# Passage\\n\\n{passage_text}'",
        "  );",
        "",
    ])
    
    # Insert questions
    for q in questions:
        q_type = q.get('type', 'SUMMARY_COMPLETION')
        q_prompt = escape_sql(q.get('prompt', ''))
        q_idx = q.get('idx', 1)
        options = q.get('options', [])
        correct = q.get('correct_answer')
        
        if q_type in ['TRUE_FALSE_NOT_GIVEN', 'YES_NO_NOT_GIVEN', 'MULTIPLE_CHOICE_SINGLE', 'MULTIPLE_CHOICE_MULTIPLE', 'MATCHING_HEADING', 'MATCHING_FEATURES', 'MATCHING_INFORMATION']:
            # Build MatchPairs for MATCHING_* types
            match_pairs_sql = 'NULL'
            if q_type == 'MATCHING_HEADING' and correct:
                # Include BOTH roman numeral and full label in acceptedValues
                # - Roman numeral for grading (what user sends)
                # - Full label for display (correctAnswerText)
                correct_value = correct.lower()  # e.g., "iii"
                # Find full label from options
                full_label = correct_value
                for opt in options:
                    if opt.get('value', '').lower() == correct_value or opt.get('is_correct'):
                        full_label = escape_sql(opt.get('label', correct_value))
                        break
                # Format: {"paragraph-a-q1": ["iii", "iii. A new area of academic interest"]} 
                prompt_key = q_prompt.lower().replace(' ', '-') + f"-q{q_idx}"
                match_pairs_sql = f"'{{\"{prompt_key}\": [\"{correct_value}\", \"{full_label}\"]}}'"
            elif q_type == 'MATCHING_FEATURES' and correct:
                # Include BOTH letter value and full label in acceptedValues
                # - Letter value for grading (what user sends: "A", "B", etc.)
                # - Full label for display (correctAnswerText)
                correct_value = correct.upper()  # e.g., "A"
                correct_label = correct_value
                for opt in options:
                    if opt.get('value') == correct_value or opt.get('is_correct'):
                        correct_label = escape_sql(opt.get('label', correct_value))
                        break
                # Format: {"feature-q10": ["A", "A. work in groups..."]}
                prompt_key = f"feature-q{q_idx}"
                match_pairs_sql = f"'{{\"{prompt_key}\": [\"{correct_value}\", \"{correct_label}\"]}}'"
            elif q_type == 'MATCHING_INFORMATION' and correct:
                # MATCHING_INFORMATION: single letter answer (A-J)
                # MatchingHeadingGrader expects MatchPairs format
                correct_value = correct.upper()  # e.g., "A"
                # Include both uppercase and lowercase for case-insensitive matching
                # Format: {"info-q5": ["A", "a"]}
                prompt_key = f"info-q{q_idx}"
                match_pairs_sql = f"'{{\"{prompt_key}\": [\"{correct_value}\", \"{correct_value.lower()}\"]}}'"
            
            sql_lines.extend([
                f"  qid := gen_random_uuid();",
                f"  INSERT INTO exam_questions (\"Id\",\"SectionId\",\"Idx\",\"Type\",\"Skill\",\"Difficulty\",\"PromptMd\",\"ExplanationMd\",\"MatchPairs\")",
                f"  VALUES (",
                f"    qid,",
                f"    sec1,",
                f"    {q_idx},",
                f"    '{q_type}',",
                f"    'READING',",
                f"    2,",
                f"    '{q_prompt}',",
                f"    'Choose the correct answer.',",
                f"    {match_pairs_sql}",
                f"  );",
            ])
            
            for i, opt in enumerate(options):
                is_correct = 'true' if opt.get('is_correct') or opt.get('value') == correct else 'false'
                opt_label = escape_sql(opt.get('label', opt.get('value', '')))
                sql_lines.append(
                    f"  INSERT INTO exam_options (\"Id\",\"QuestionId\",\"Idx\",\"ContentMd\",\"IsCorrect\") VALUES "
                    f"(gen_random_uuid(), qid, {i+1}, '{opt_label}', {is_correct});"
                )
            sql_lines.append("")
            
        else:  # SUMMARY_COMPLETION, MATCHING_INFORMATION
            blank_key = f"blank-q{q_idx}"
            # For single letter answers (A-Z), include both cases
            # This ensures grading works regardless of case user submits
            answers = []
            if correct:
                # Split multiple answer variants (e.g., "outline / an outline / a brief outline" or "social life/academic life")
                if ' / ' in correct:
                    # Multiple variants with " / " separator (space-slash-space)
                    answers = [v.strip() for v in correct.split(' / ')]
                elif '/' in correct and len(correct) > 2:
                    # Multiple variants with "/" separator (no space) - like "social life/academic life"
                    answers = [v.strip() for v in correct.split('/')]
                elif len(correct) == 1 and correct.isalpha():
                    # Single letter - add both uppercase and lowercase
                    answers = [correct.upper(), correct.lower()]
                else:
                    # Single answer
                    answers.append(correct)
            sql_lines.extend([
                f"  qid := gen_random_uuid();",
                f"  INSERT INTO exam_questions (\"Id\",\"SectionId\",\"Idx\",\"Type\",\"Skill\",\"Difficulty\",\"PromptMd\",\"ExplanationMd\",\"BlankAcceptTexts\")",
                f"  VALUES (",
                f"    qid,",
                f"    sec1,",
                f"    {q_idx},",
                f"    '{q_type}',",
                f"    'READING',",
                f"    2,",
                f"    '{q_prompt}',",
                f"    'Use NO MORE THAN THREE WORDS from the passage to complete the blank. The answer must fit grammatically.',",
                f"    '{{\"{blank_key}\": {json.dumps(answers)}}}'::jsonb",
                f"  );",
                "",
            ])
    
    sql_lines.extend([
        "",
        "END$$;",
        "",
        "",
        "COMMIT;",
    ])
    
    return '\n'.join(sql_lines)


def escape_sql(text: str) -> str:
    """Escape text for SQL."""
    if not text:
        return ""
    return text.replace("'", "''").replace("\\", "\\\\").replace("\n", "\\n")


def main():
    import sys
    
    url = sys.argv[1] if len(sys.argv) > 1 else TARGET_URL
    
    logger.info("=" * 60)
    logger.info("IELTS Exam Crawler (ielts-writing.info) - Starting")
    logger.info("=" * 60)
    logger.info(f"Target URL: {url}")
    
    # Step 1: Fetch main page
    logger.info("Phase 1: Fetching main page...")
    soup = fetch_page(url)
    
    # Step 2: Extract exam title
    title = extract_exam_title(soup)
    logger.info(f"Exam title: {title}")
    
    # Step 3: Extract passage
    logger.info("Phase 2: Extracting passage...")
    passage = extract_passage(soup, url)
    logger.info(f"Passage title: {passage.get('title', 'N/A')}")
    logger.info(f"Passage length: {len(passage.get('text', ''))} chars")
    
    # Step 4: Extract questions
    logger.info("Phase 3: Extracting questions...")
    questions = extract_questions(soup)
    logger.info(f"Extracted {len(questions)} questions")
    
    for q in questions:
        logger.info(f"  Q{q['idx']}: {q['type']} - {q.get('correct_answer', 'No answer')}")
    
    # Step 5: Build data structure
    data = {
        'title': title,
        'source_url': url,
        'passage': passage,
        'questions': questions
    }
    
    # Step 6: Save raw data
    raw_file = OUTPUT_DIR / "raw_data_ieltswriting.json"
    with open(raw_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    logger.info(f"Raw data saved to: {raw_file}")
    
    # Check for --json flag
    output_json = '--json' in sys.argv
    
    if output_json:
        # Generate validated JSON output
        logger.info("Phase 4: Generating validated JSON...")
        exam_json = generate_exam_json(data)
        
        # Save to output directory
        slug = re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')[:50]
        json_output_dir = OUTPUT_DIR / "output"
        json_output_dir.mkdir(parents=True, exist_ok=True)
        json_file = json_output_dir / f"{slug}.json"
        
        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump(exam_json, f, indent=2, ensure_ascii=False)
        logger.info(f"JSON saved to: {json_file}")
        
        # Run validation
        try:
            from validate_exam import validate_exam_file
            result = validate_exam_file(str(json_file))
            print(result.summary())
        except ImportError:
            logger.warning("validate_exam module not found, skipping validation")
    else:
        # Generate SQL (legacy mode)
        logger.info("Phase 4: Generating SQL...")
        sql = generate_sql(data)
        
        # Step 8: Save SQL
        slug = re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')
        sql_file = SEEDS_DIR / f"seed_exam_{slug[:50]}.sql"
        SEEDS_DIR.mkdir(parents=True, exist_ok=True)
        with open(sql_file, 'w', encoding='utf-8') as f:
            f.write(sql)
        logger.info(f"SQL saved to: {sql_file}")
    
    logger.info("=" * 60)
    logger.info("IELTS Exam Crawler - Complete")
    logger.info("=" * 60)


if __name__ == "__main__":
    main()

