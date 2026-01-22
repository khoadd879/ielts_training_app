#!/usr/bin/env python3
"""
IELTS Exam Data Crawler - ielts-mentor.com
=============================================
Crawls IELTS reading exams from ielts-mentor.com and exports to SQL.

Usage:
    python crawler-ieltsmentor.py [URL]
    
Example:
    python crawler-ieltsmentor.py https://www.ielts-mentor.com/reading-sample/gt-reading/3719-evening-courses-and-the-bike-foundry

STANDARDIZED QUESTION FORMATS (v9.0) - LOCKED
==============================================
⚠️ DO NOT MODIFY BACKEND OR FRONTEND - ONLY DATA/SCRIPT CHANGES ALLOWED

Follows same output format as crawler-ieltswriting.py.
See .agent/workflows/ielts-data-format.md for complete rules.

IELTS-MENTOR SPECIFIC:
======================
- Passages are plain text (not interactive HTML)
- Answers are in text format: "Answer: 1. C 2. E 3. D 4. B..."
- Questions detected by numbered patterns in text

SUPPORTED QUESTION TYPES:
1. MATCHING_INFORMATION (A-F): "For which course are the following statements true?"
2. TRUE_FALSE_NOT_GIVEN: "TRUE/FALSE/NOT GIVEN"
3. YES_NO_NOT_GIVEN: "YES/NO/NOT GIVEN"
4. SENTENCE_COMPLETION: "Complete the sentences below"
5. SUMMARY_COMPLETION: Fill-in-the-blank
6. MULTIPLE_CHOICE_SINGLE: Single answer multiple choice
7. MATCHING_HEADING: Match paragraphs to headings
"""

import requests
from bs4 import BeautifulSoup
import json
import re
import uuid
import logging
from pathlib import Path
from datetime import datetime
from typing import Any, Optional

# Configuration
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


def fetch_page(url: str) -> BeautifulSoup:
    """Fetch and parse a page."""
    response = requests.get(url, headers=HEADERS, timeout=30)
    response.raise_for_status()
    return BeautifulSoup(response.text, 'html.parser')


def extract_title(soup: BeautifulSoup) -> str:
    """Extract exam title from page."""
    # Use page title first - it's most reliable
    title_tag = soup.find('title')
    if title_tag:
        title = title_tag.get_text(strip=True)
        # Clean up common patterns
        title = re.sub(r'\s*-\s*IELTS Mentor.*$', '', title)
        title = title.replace('GT Reading Test ', 'GT Reading ').strip()
        title = title.replace('&amp;', '&')
        return title
    
    # Fallback: Try h2 headings
    h2_tags = soup.find_all('h2')
    for h2 in h2_tags:
        text = h2.get_text(strip=True)
        if 'Mock Test' in text or 'Reading' in text:
            return text.replace('General Training Reading ', '').strip()
    
    return "IELTS Reading Test"


def extract_exam_id(url: str) -> str:
    """Extract exam ID from URL."""
    # URL format: .../3719-evening-courses-and-the-bike-foundry
    match = re.search(r'/(\d+)-', url)
    if match:
        return match.group(1)
    return str(uuid.uuid4())[:8]


def extract_passages(soup: BeautifulSoup) -> list[dict]:
    """Extract reading passages from the page using direct text extraction.
    
    Strategy:
    1. Find <p> tags with <strong> children starting with A-F letters
    2. Extract ONLY direct text content (avoid nested element text)
    3. Also find other substantial paragraphs
    """
    from bs4 import NavigableString
    
    # Find article content
    article = soup.find('article') or soup.find('div', class_='item-page')
    if not article:
        article = soup
    
    passages = []
    section_headers = []
    
    def get_direct_text(elem):
        """Get only direct text content from element, not from nested <p> tags."""
        parts = []
        for child in elem.children:
            if isinstance(child, NavigableString):
                parts.append(str(child))
            elif child.name in ['strong', 'span', 'em', 'b', 'i', 'a', 'br']:
                parts.append(child.get_text())
            # Explicitly skip nested <p>, <div>, etc.
        return re.sub(r'\s+', ' ', ''.join(parts)).strip()
    
    # Find section headers (h2 tags)
    for h2 in article.find_all('h2'):
        text = h2.get_text(strip=True)
        if text and len(text) < 100 and 'question' not in text.lower():
            if not any(kw in text.lower() for kw in ['gt reading', 'general training', 'mock test', 'section 1', 'section 2', 'section 3']):
                section_headers.append(text)
    
    # Find A-F letter paragraphs
    for p_tag in article.find_all('p'):
        strong = p_tag.find('strong', recursive=False)
        if strong:
            strong_text = strong.get_text(strip=True)
            # Check for A-F pattern
            if re.match(r'^[A-F]\s+', strong_text) or re.match(r'^[A-F]$', strong_text):
                direct_text = get_direct_text(p_tag)
                if len(direct_text) > 50:
                    passages.append(direct_text)
                    continue
        
        # Also check for substantial paragraphs without letter headers
        # but only direct text, not from nested elements
        direct_text = get_direct_text(p_tag)
        if len(direct_text) > 150:
            # Skip noise patterns
            noise_keywords = [
                'question', 'answer', 'write your', 'boxes', 'last updated',
                'written by', 'hits:', 'general training', 'gt reading',
                'mock test', 'rating', 'show/', 'hide', 'click the button',
                'ielts mentor', 'read the text below', 'you should spend',
            ]
            # Also skip question content patterns
            is_question_content = (
                re.match(r'^\d+\.\s+\w+.*\s+A\.\s', direct_text) or  # "35. Boris... A. option"
                re.search(r'\d+\s+…+', direct_text) or  # "38 ………" (summary completion blank)
                re.match(r'^The\s+\w+\s+Sea\s+was\s+created', direct_text)  # Summary completion starter
            )
            if not any(kw in direct_text.lower() for kw in noise_keywords) and not is_question_content:
                passages.append(direct_text)
    
    # Combine passages
    if passages:
        # Add section headers if found
        if section_headers and len(section_headers) <= 3:
            header_text = ' & '.join(section_headers)
            combined = f"# {header_text}\n\n" + '\n\n'.join(passages)
        else:
            combined = '\n\n'.join(passages)
    else:
        # Fallback: get text before first Questions or question content
        full_text = article.get_text(separator='\n', strip=True)
        
        # Find earliest cutoff point from various patterns
        # Note: "Questions X" can appear before passage as header, so use other patterns
        cutoff_patterns = [
            r'Choose the correct letter',  # MC question instructions
            r'Choose the correct answer',  # Alternative MC instruction
            r'\d+\.\s+\w+.*?\s+that\s+\n\s*A\.',  # "35. Boris... that\nA." pattern
            r'Write the correct letter',  # Another instruction pattern
            r'Complete the.*?below',  # Summary completion instruction
        ]
        
        # Also find content patterns to ensure we don't cut too early
        # Find position of paragraph G ending (look for text patterns)
        para_g_match = re.search(r"ecosystem\.'?", full_text)
        min_cutoff = para_g_match.end() if para_g_match else 5000  # At least after paragraph G
        
        cutoff_pos = len(full_text)
        for pattern in cutoff_patterns:
            match = re.search(pattern, full_text)
            if match and match.start() > min_cutoff and match.start() < cutoff_pos:
                cutoff_pos = match.start()
        
        # If no pattern matched after paragraph G, use paragraph G ending
        if cutoff_pos == len(full_text) and para_g_match:
            cutoff_pos = para_g_match.end()
        
        combined = full_text[:cutoff_pos].strip()
        
        # Split paragraphs A-G by inserting line breaks
        # Pattern: "X [A-Z][a-z]" where X is letter A-G followed by uppercase word
        combined = re.sub(r'([.!?])\s*([A-G])\s+([A-Z][a-z])', r'\1\n\n**\2** \3', combined)
        # Also handle start of passage
        combined = re.sub(r'^([A-G])\s+([A-Z][a-z])', r'**\1** \2', combined)
    
    # Final cleanup
    combined = re.sub(r'\n{3,}', '\n\n', combined)
    combined = combined.strip()
    
    return [{'text': combined}]


def extract_heading_options(soup: BeautifulSoup) -> list[dict]:
    """Extract heading options from 'List of Headings' section.
    
    Returns list like [{'value': 'i', 'label': 'i. Plans for more marine protected areas'}, ...]
    """
    options = []
    
    article = soup.find('article') or soup.find('div', class_='item-page') or soup
    full_text = article.get_text()
    
    # Look for "List of Headings" section
    heading_match = re.search(r'List of Headings(.+?)(?=\d+\.\s*(?:Section|Paragraph)|Questions?\s+\d+)', full_text, re.DOTALL | re.IGNORECASE)
    
    if heading_match:
        headings_text = heading_match.group(1)
        # Split into lines and parse each
        lines = [l.strip() for l in headings_text.split('\n') if l.strip()]
        
        for line in lines:
            # Match roman numeral at start of line (i, ii, iii, iv, v, vi, vii, viii, ix, x)
            m = re.match(r'^(i{1,3}|iv|v|vi{1,3}|vii{1,2}|ix|x)\.\s*(.+)', line, re.IGNORECASE)
            if m:
                numeral = m.group(1).lower().strip()
                text = m.group(2).strip()
                if text and len(text) > 3:
                    options.append({
                        'value': numeral,
                        'label': f"{numeral}. {text}",
                        'is_correct': False
                    })
    
    return options


def extract_question_texts(soup: BeautifulSoup) -> dict[int, str]:
    """Extract individual question texts from HTML.
    
    Returns dict like {1: 'After taking this course, participants will be able to teach...', ...}
    """
    question_texts = {}
    
    article = soup.find('article') or soup.find('div', class_='item-page') or soup
    
    # Find all <strong>N.</strong> patterns followed by text
    # HTML format: <strong>1.</strong> Question text<br />
    strong_tags = article.find_all('strong')
    
    for strong in strong_tags:
        text = strong.get_text(strip=True)
        
        # Pattern 1: "22." with dot (e.g., <strong>22.</strong> Text)
        match = re.match(r'^(\d+)\.$', text)
        
        # Pattern 2: Just number (e.g., <strong>22</strong> in fill-in-blank context)
        if not match:
            match = re.match(r'^(\d+)$', text)
        
        if match:
            q_num = int(match.group(1))
            
            # Get context: for fill-in-blank questions, extract sentence with blank
            parent = strong.find_parent(['p', 'div'])
            if parent:
                # Check siblings ONLY for blank markers (not entire parent)
                # Get text of siblings until br or next strong
                sibling_text = ""
                for sibling in strong.next_siblings:
                    if hasattr(sibling, 'name'):
                        if sibling.name in ['br', 'strong', 'p']:
                            break
                        sibling_text += sibling.get_text(strip=True)
                    else:
                        sibling_text += str(sibling).strip()
                    if len(sibling_text) > 100:
                        break
                
                has_blank = '…' in sibling_text or '...' in sibling_text or '___' in sibling_text
                
                has_dot = text.endswith('.')  # Pattern: <strong>15.</strong> vs <strong>22</strong>
                
                if has_blank:
                    if has_dot:
                        # Pattern 1: <strong>15.</strong> Text with ……… more text<br />
                        # Get text after strong tag until br/strong
                        next_text = ""
                        for sibling in strong.next_siblings:
                            if hasattr(sibling, 'name'):
                                if sibling.name == 'br':
                                    break
                                if sibling.name == 'strong':
                                    break
                                next_text += sibling.get_text(strip=True)
                            else:
                                next_text += str(sibling).strip()
                            if len(next_text) > 200:
                                break
                        q_text = next_text
                    else:
                        # Pattern 2: <strong>38</strong> ……… text after
                        # Number is in mid-sentence, just get _______ + text after blank to period
                        # DON'T include prev_text as it may contain OTHER blanks
                        
                        # Get text after strong tag until next strong
                        next_text = ""
                        for sibling in strong.next_siblings:
                            if hasattr(sibling, 'name'):
                                if sibling.name in ['br', 'strong', 'p']:
                                    break
                                next_text += sibling.get_text(strip=True)
                            else:
                                next_text += str(sibling).strip()
                            if len(next_text) > 200:
                                break
                        
                        # Extract text after blank marker up to first period
                        # Blank marker can be: …….., &hellip;, etc.
                        # After split, strip leading dots and spaces
                        parts = re.split(r'[…\u2026]+', next_text, maxsplit=1)
                        if len(parts) > 1:
                            after_blank = parts[1].strip()
                            # Strip leading dots and spaces (blank markers often end with ..)
                            after_blank = after_blank.lstrip('. ')
                            # Find first period for sentence end
                            period_idx = after_blank.find('.')
                            if period_idx > 0:
                                after_blank = after_blank[:period_idx+1]
                            next_text_clean = after_blank.strip()
                        else:
                            next_text_clean = next_text.strip()
                        
                        q_text = "_______ " + next_text_clean
                    
                    # Clean and normalize
                    q_text = re.sub(r'\s+', ' ', q_text).strip()
                    q_text = q_text.replace('\xa0', ' ').strip()
                    
                    # Remove noise - truncate at Answer:, Click, Show/, Rating, etc.
                    noise_cutoffs = ['Answer:', 'Click', 'Show/', 'Rating', 'IELTS', 'GT Reading']
                    for noise in noise_cutoffs:
                        if noise in q_text:
                            q_text = q_text.split(noise)[0].strip()
                    
                    # Replace any remaining blank markers with _______
                    q_text = re.sub(r'[\u2026…]+', '_______', q_text)
                    q_text = re.sub(r'\.{3,}', '_______', q_text)
                    q_text = re.sub(r'_{2,}', '_______', q_text)
                    
                    # Limit length
                    if len(q_text) > 200:
                        q_text = q_text[:200].rsplit(' ', 1)[0] + '...'
                    
                    if q_text and len(q_text) > 10 and '_______' in q_text:
                        question_texts[q_num] = q_text
                    continue
            
            # Standard extraction for non-fill-in-blank questions
            next_text = ""
            section_letter = None  # For MATCHING_HEADING pattern
            
            for sibling in strong.next_siblings:
                if hasattr(sibling, 'name'):
                    if sibling.name in ['br', 'p', 'div']:
                        break
                    if sibling.name == 'strong':
                        # Check if this is a Section letter (A, B, C, D, E, F, G)
                        strong_text = sibling.get_text(strip=True)
                        if len(strong_text) == 1 and strong_text.isalpha() and strong_text.isupper():
                            section_letter = strong_text
                        break
                    next_text += sibling.get_text(strip=True)
                else:
                    next_text += str(sibling).strip()
                # Stop if text is getting too long
                if len(next_text) > 300:
                    break
            
            # Clean the text
            next_text = re.sub(r'\s+', ' ', next_text).strip()
            next_text = next_text.replace('\xa0', ' ').strip()
            
            # Check if this is MATCHING_HEADING pattern: "Section A", "Section B"...
            if section_letter and 'section' in next_text.lower():
                # Format as "Section A", "Section B"...
                question_texts[q_num] = f"Section {section_letter}"
                continue
            
            # Normalize blank markers to ___
            next_text = re.sub(r'[\u2026…]+', '___', next_text)
            next_text = re.sub(r'\.{2,}', '___', next_text)
            
            # Remove noise patterns
            noise_patterns = [
                r'Answer:.*$',
                r'Click the button.*$',
                r'Questions?\s+\d+.*$',
                r'Show/\s*Hide.*$',
                r'Rating.*$',
                r'GT Reading.*$',
                r'IELTS.*$',
            ]
            for pattern in noise_patterns:
                next_text = re.sub(pattern, '', next_text, flags=re.IGNORECASE).strip()
            
            # Limit length (max 200 chars for question text)
            if len(next_text) > 200:
                next_text = next_text[:200].rsplit(' ', 1)[0] + '...'
            
            if next_text and len(next_text) > 3 and len(next_text) < 250:
                question_texts[q_num] = next_text
    
    return question_texts


def extract_answers(soup: BeautifulSoup) -> dict[int, str]:
    """Extract answers from div#spoiler, blockquote, or 'Answer: 1. C 2. E...' format."""
    answers = {}
    
    # Try to find div#spoiler first (hidden answers section)
    spoiler = soup.find('div', id='spoiler')
    if spoiler:
        spoiler_text = spoiler.get_text(separator=' ', strip=True)
        # Pattern: number + dot + answer (letter or TRUE/FALSE/NOT GIVEN)
        patterns = re.findall(r'(\d+)\.\s*([A-Z]+(?:\s+GIVEN)?)', spoiler_text, re.IGNORECASE)
        for num_str, ans in patterns:
            num = int(num_str)
            answers[num] = ans.strip().upper()
        if answers:
            return answers
    
    # Try blockquote (common format)
    blockquote = soup.find('blockquote')
    if blockquote:
        bq_text = blockquote.get_text(separator=' ', strip=True)
        # Pattern 1: "28. E, 29. H, 30. C"
        for match in re.finditer(r'(\d+)\.\s*([A-Z]|TRUE|FALSE|NOT GIVEN|[^,]{2,40})(?:,|$)', bq_text, re.IGNORECASE):
            num = int(match.group(1))
            ans = match.group(2).strip()
            if ans.upper() in ['TRUE', 'FALSE', 'NOT GIVEN', 'YES', 'NO']:
                ans = ans.upper()
            elif len(ans) == 1 and ans.isalpha():
                ans = ans.upper()
            if num not in answers:
                answers[num] = ans
        if answers:
            return answers
    
    # Fallback: search in full page text
    article = soup.find('article') or soup.find('div', class_='item-page') or soup
    full_text = article.get_text()
    
    # Look for answer pattern after "Answer:"
    answer_match = re.search(r'Answer:\s*(.+?)(?=Show|Hide|\n\s*\n|\Z)', full_text, re.DOTALL)
    if answer_match:
        answer_text = answer_match.group(1)
        
        # Parse: "1. C 2. E 3. D" or "1. TRUE 2. FALSE 3. NOT GIVEN"
        for match in re.finditer(r'(\d+)\.\s*([A-Z]+(?:\s+GIVEN)?)', answer_text, re.IGNORECASE):
            num = int(match.group(1))
            if num not in answers:
                answers[num] = match.group(2).strip().upper()
        
        # Also parse text answers: "15. senior" or "19. 3 years ago"
        for match in re.finditer(r'(\d+)\.\s*([a-zA-Z][^.\n]{1,40}?)(?=\n|\d+\.|$)', answer_text):
            num = int(match.group(1))
            ans = match.group(2).strip()
            if num not in answers and len(ans) > 1:
                answers[num] = ans
    
    # Also check for slash patterns: "21. 3 months // three months"
    full_html = str(soup)
    for match in re.finditer(r'(\d+)\.\s*([^/\n<]{2,30})\s*//\s*([^\n<]{2,30})', full_html):
        num = int(match.group(1))
        if num not in answers:
            answers[num] = match.group(2).strip()
    
    return answers


def detect_question_type(text: str) -> str:
    """Detect question type from instruction text."""
    text_lower = text.lower()
    
    if 'true' in text_lower and 'false' in text_lower and 'not given' in text_lower:
        return 'TRUE_FALSE_NOT_GIVEN'
    
    if 'yes' in text_lower and 'no' in text_lower and 'not given' in text_lower:
        return 'YES_NO_NOT_GIVEN'
    
    # Check for MULTIPLE_CHOICE first: look for "A. option text" "B. option text" pattern
    # This indicates full MC options with text, not just paragraph letters
    mc_options_pattern = re.findall(r'\n\s*([A-D])\.\s+[A-Za-z]', text)
    if len(mc_options_pattern) >= 3:  # At least 3 A/B/C/D options with text
        return 'MULTIPLE_CHOICE_SINGLE'
    
    # Check MATCHING_HEADING before MATCHING_INFORMATION (heading takes priority)
    if 'heading' in text_lower or ('match' in text_lower and 'paragraph' in text_lower):
        return 'MATCHING_HEADING'
    
    if 'which' in text_lower and ('letter' in text_lower or 'a-' in text_lower):
        return 'MATCHING_INFORMATION'
    
    if 'complete' in text_lower and ('sentence' in text_lower or 'notes' in text_lower or 'summary' in text_lower):
        return 'SUMMARY_COMPLETION'
    
    if 'choose' in text_lower and ('correct' in text_lower or 'best' in text_lower):
        return 'MULTIPLE_CHOICE_SINGLE'
    
    # Default
    return 'MATCHING_INFORMATION'


def extract_mc_options_from_text(text: str, correct_answer: str) -> list[dict]:
    """Extract multiple choice options from question text.
    
    Looks for patterns like:
    A. marine ecosystems will completely break down.
    B. insufficient attention is being paid to fish numbers.
    """
    options = []
    
    # Pattern: "A. option text" with newline or at start
    # Capture letter and full text until next option or end
    pattern = r'(?:^|\n)\s*([A-D])\.\s+([^\n]+?)(?=\n\s*[A-D]\.|$)'
    matches = re.findall(pattern, text, re.MULTILINE | re.DOTALL)
    
    if matches:
        for letter, option_text in matches:
            is_correct = letter.upper() == correct_answer.upper()
            options.append({
                'value': letter.upper(),
                'label': f"{letter.upper()}. {option_text.strip()}",
                'is_correct': is_correct
            })
    
    return options


def infer_type_from_answer(answer: str) -> str:
    """Infer question type from the answer value."""
    if not answer:
        return None
    
    answer_upper = answer.upper().strip()
    
    # TRUE/FALSE/NOT GIVEN answers → TRUE_FALSE_NOT_GIVEN
    if answer_upper in ['TRUE', 'FALSE', 'NOT GIVEN']:
        return 'TRUE_FALSE_NOT_GIVEN'
    
    # YES/NO/NOT GIVEN answers → YES_NO_NOT_GIVEN
    if answer_upper in ['YES', 'NO']:
        return 'YES_NO_NOT_GIVEN'
    
    # Roman numerals (i, ii, iii, iv, v, vi, vii, viii, ix, x) → MATCHING_HEADING
    if re.match(r'^(i{1,3}|iv|vi{0,3}|ix|x)$', answer.lower()):
        return 'MATCHING_HEADING'
    
    # Single letter A-J → MATCHING_INFORMATION
    if len(answer) == 1 and answer.isalpha():
        return 'MATCHING_INFORMATION'
    
    # Text words (not single letter, not T/F/NG/Y/N) → SUMMARY_COMPLETION
    # These are fill-in-the-blank answers like "GLACIERS", "CONTRIBUTION"
    if len(answer) > 2 and answer.isalpha():
        return 'SUMMARY_COMPLETION'
    
    return None


def extract_questions(soup: BeautifulSoup, answers: dict[int, str], 
                       question_texts: dict[int, str] = None, 
                       heading_options: list[dict] = None) -> list[dict]:
    """Extract questions from page content."""
    questions = []
    
    if question_texts is None:
        question_texts = {}
    if heading_options is None:
        heading_options = []
    
    article = soup.find('article') or soup.find('div', class_='item-page') or soup
    full_text = article.get_text()
    
    # Find question sections
    # Pattern: "Questions X-Y" or "Questions X - Y"
    question_sections = re.findall(
        r'Questions?\s+(\d+)\s*[-–]\s*(\d+).*?(?=Questions?\s+\d+\s*[-–]|\Z)',
        full_text,
        re.DOTALL | re.IGNORECASE
    )
    
    # Also find the text around these patterns
    section_matches = list(re.finditer(
        r'(Questions?\s+(\d+)\s*[-–]\s*(\d+).*?)(?=Questions?\s+\d+\s*[-–]|Answer:|Click the button|\Z)',
        full_text,
        re.DOTALL | re.IGNORECASE
    ))
    
    # Sort sections by range size (smaller ranges first) to prioritize specific sections
    # E.g., Q35-37 (3 questions) should be processed before Q28-40 (13 questions)
    section_matches = sorted(section_matches, key=lambda m: int(m.group(3)) - int(m.group(2)))
    
    # Track processed question numbers to avoid duplicates
    processed_question_nums = set()
    
    for match in section_matches:
        section_text = match.group(1)
        start_q = int(match.group(2))
        end_q = int(match.group(3))
        
        # Detect question type for this section
        q_type = detect_question_type(section_text)
        
        # Extract individual question prompts
        # Look for numbered patterns: "1. Question text" or just after question numbers
        q_patterns = re.findall(
            r'(?:^|\n)\s*(\d+)[\.\)]\s*(.+?)(?=\n\s*\d+[\.\)]|\Z)',
            section_text,
            re.DOTALL
        )
        
        # If no individual questions found, create from range
        if not q_patterns:
            for q_num in range(start_q, end_q + 1):
                # Skip if already processed by a more specific section
                if q_num in processed_question_nums:
                    continue
                
                answer = answers.get(q_num, '')
                
                # Get detailed question text if available
                q_text = question_texts.get(q_num, '')
                
                # Override type based on answer if available
                # BUT: if detect_question_type found MULTIPLE_CHOICE (from A./B./C. pattern), keep it
                inferred_type = infer_type_from_answer(answer)
                if q_type == 'MULTIPLE_CHOICE_SINGLE':
                    actual_type = q_type  # Keep MC type detected from A./B./C./D. pattern
                else:
                    actual_type = inferred_type if inferred_type else q_type
                
                # Build prompt based on type and available text
                # Build prompt based on type - following ielts-writing.info format
                # MATCHING_HEADING: just "Section A" or "Paragraph B" (very short)
                # TRUE_FALSE_NOT_GIVEN: just the statement (no instruction)
                # SUMMARY_COMPLETION: sentence with _______ for blank
                
                if actual_type == 'TRUE_FALSE_NOT_GIVEN':
                    # Just the statement, no instruction (frontend handles it)
                    prompt = q_text if q_text else f"Statement {q_num}"
                elif actual_type == 'YES_NO_NOT_GIVEN':
                    # Just the statement
                    prompt = q_text if q_text else f"Statement {q_num}"
                elif actual_type == 'MATCHING_HEADING':
                    # Just "Section A" or question text if available
                    prompt = q_text if q_text else f"Section {q_num}"
                elif actual_type == 'MATCHING_INFORMATION':
                    # Just the statement/question
                    prompt = q_text if q_text else f"Question {q_num}"
                elif actual_type == 'SUMMARY_COMPLETION':
                    # Sentence with blank (_______ or ...)
                    if q_text:
                        # If text doesn't have blank marker, add one
                        if '_______' not in q_text and '...' not in q_text:
                            prompt = f"{q_text} _______"
                        else:
                            prompt = q_text
                    else:
                        prompt = f"Complete the blank. _______ Question {q_num}"
                else:
                    prompt = q_text if q_text else f"Question {q_num}"
                
                # Get options for this question type
                if actual_type == 'MATCHING_HEADING' and heading_options:
                    # Use heading_options with correct answer marked
                    opts = []
                    for opt in heading_options:
                        opts.append({
                            'value': opt['value'],
                            'label': opt['label'],
                            'is_correct': answer.lower() == opt['value'].lower()
                        })
                    options = opts
                elif actual_type == 'MULTIPLE_CHOICE_SINGLE':
                    # Extract options from question-specific text, not entire section
                    # Find text for this specific question (between q_num and next q_num)
                    next_q = q_num + 1
                    q_pattern = rf'{q_num}\.\s*(.*?)(?={next_q}\.|Questions?\s+\d|$)'
                    q_match = re.search(q_pattern, section_text, re.DOTALL)
                    if q_match:
                        q_specific_text = q_match.group(1)
                        mc_opts = extract_mc_options_from_text(q_specific_text, answer)
                    else:
                        mc_opts = extract_mc_options_from_text(section_text, answer)[:4]  # Fallback: limit to 4
                    if mc_opts:
                        options = mc_opts
                    else:
                        options = get_options_for_type(actual_type, answer)
                else:
                    options = get_options_for_type(actual_type, answer)
                
                questions.append({
                    'idx': q_num,
                    'type': actual_type,
                    'prompt': prompt,
                    'correct_answer': answer,
                    'options': options
                })
                processed_question_nums.add(q_num)
        else:
            for num_str, q_text in q_patterns:
                q_num = int(num_str)
                if start_q <= q_num <= end_q:
                    # Skip if already processed by a more specific section
                    if q_num in processed_question_nums:
                        continue
                    
                    answer = answers.get(q_num, '')
                    # Clean question text
                    q_text = re.sub(r'\s+', ' ', q_text.strip())
                    
                    # For MATCHING_HEADING, q_text should just be "Section X"
                    # The regex may capture trailing passage text, so we truncate
                    if q_type == 'MATCHING_HEADING':
                        section_match = re.match(r'^(Section\s+[A-Z])', q_text, re.IGNORECASE)
                        if section_match:
                            q_text = section_match.group(1)
                    
                    # Override type based on answer if available
                    # BUT: if detect_question_type found MULTIPLE_CHOICE (from A./B./C. pattern), keep it
                    inferred_type = infer_type_from_answer(answer)
                    if q_type == 'MULTIPLE_CHOICE_SINGLE':
                        actual_type = q_type  # Keep MC type detected from A./B./C./D. pattern
                    else:
                        actual_type = inferred_type if inferred_type else q_type
                    
                    # Add instruction header if not present
                    if actual_type in ['TRUE_FALSE_NOT_GIVEN', 'YES_NO_NOT_GIVEN']:
                        if 'true' not in q_text.lower() and 'agree' not in q_text.lower():
                            instruction = "TRUE if the statement agrees with the information, FALSE if it contradicts, NOT GIVEN if there is no information on this."
                            prompt = f"{instruction}\n\n{q_num}. {q_text}"
                        else:
                            prompt = f"{q_num}. {q_text}"
                    elif actual_type == 'MATCHING_INFORMATION':
                        prompt = f"Write the correct letter, A-F.\n\n{q_num}. {q_text}"
                    else:
                        prompt = f"{q_num}. {q_text}"
                    
                    # Get options for this question type
                    if actual_type == 'MATCHING_HEADING' and heading_options:
                        # Use heading_options with correct answer marked
                        opts = []
                        for opt in heading_options:
                            opts.append({
                                'value': opt['value'],
                                'label': opt['label'],
                                'is_correct': answer.lower() == opt['value'].lower()
                            })
                        options = opts
                    elif actual_type == 'MULTIPLE_CHOICE_SINGLE':
                        # Extract options from question-specific text, not entire section
                        # Find text for this specific question (between q_num and next q_num)
                        next_q = q_num + 1
                        q_pattern = rf'{q_num}\.\s*(.*?)(?={next_q}\.|Questions?\s+\d|$)'
                        q_match = re.search(q_pattern, section_text, re.DOTALL)
                        if q_match:
                            q_specific_text = q_match.group(1)
                            mc_opts = extract_mc_options_from_text(q_specific_text, answer)
                        else:
                            mc_opts = extract_mc_options_from_text(section_text, answer)[:4]  # Fallback: limit to 4
                        if mc_opts:
                            options = mc_opts
                        else:
                            options = get_options_for_type(actual_type, answer)
                    else:
                        options = get_options_for_type(actual_type, answer)
                    
                    questions.append({
                        'idx': q_num,
                        'type': actual_type,
                        'prompt': prompt,
                        'correct_answer': answer,
                        'options': options
                    })
                    processed_question_nums.add(q_num)
    
    # Deduplicate questions by idx (keep first occurrence)
    seen_idx = set()
    unique_questions = []
    for q in questions:
        if q['idx'] not in seen_idx:
            seen_idx.add(q['idx'])
            unique_questions.append(q)
    
    # Sort by question number
    unique_questions.sort(key=lambda q: q['idx'])
    
    return unique_questions


def get_options_for_type(q_type: str, correct_answer: str) -> list[dict]:
    """Get options based on question type."""
    if q_type == 'TRUE_FALSE_NOT_GIVEN':
        return [
            {'value': 'TRUE', 'label': 'TRUE', 'is_correct': correct_answer == 'TRUE'},
            {'value': 'FALSE', 'label': 'FALSE', 'is_correct': correct_answer == 'FALSE'},
            {'value': 'NOT GIVEN', 'label': 'NOT GIVEN', 'is_correct': correct_answer == 'NOT GIVEN'},
        ]
    
    if q_type == 'YES_NO_NOT_GIVEN':
        return [
            {'value': 'YES', 'label': 'YES', 'is_correct': correct_answer == 'YES'},
            {'value': 'NO', 'label': 'NO', 'is_correct': correct_answer == 'NO'},
            {'value': 'NOT GIVEN', 'label': 'NOT GIVEN', 'is_correct': correct_answer == 'NOT GIVEN'},
        ]
    
    if q_type == 'MATCHING_INFORMATION':
        # Options A-F (or more based on passages)
        options = []
        for letter in 'ABCDEF':
            options.append({
                'value': letter,
                'label': letter,
                'is_correct': correct_answer == letter
            })
        return options
    
    # Other types don't have predefined options
    return []


def generate_sql(data: dict) -> str:
    """Generate SQL insert statements."""
    title = data.get('title', 'IELTS Reading Test')
    # Create slug from title
    slug = re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')
    slug = f"ielts-mentor-{slug}"
    
    passages = data.get('passages', [])
    questions = data.get('questions', [])
    
    sql_lines = [
        "-- ============================================",
        f"-- IELTS Exam Data Import SQL",
        f"-- Generated: {datetime.now().isoformat()}",
        f"-- Source: ielts-mentor.com",
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
    
    # Get image_url from data if available
    image_url = escape_sql(data.get('image_url', '') or '') if isinstance(data, dict) and data.get('image_url') else ''
    
    # Insert exam
    sql_lines.extend([
        f"  INSERT INTO exams (\"Id\",\"Slug\",\"Title\",\"DescriptionMd\",\"Category\",\"Level\",\"Status\",\"DurationMin\",\"ImageUrl\",\"UpdatedAt\")",
        "  VALUES (",
        f"    exam_id,",
        f"    '{slug}',",
        f"    '{escape_sql(title)}',",
        f"    'IELTS Reading Practice Test from IELTS Mentor',",
        f"    'IELTS',",
        f"    'B2',",
        f"    'PUBLISHED',",
        f"    20,",
        f"    '{image_url}'," if image_url else "    NULL,",
        f"    now()",
        "  );",
        "",
    ])
    
    # Insert section with SEPARATE passage and instructions
    passage_text = escape_sql(passages[0].get('text', '')[:8000]) if passages else ''
    instruction_text = escape_sql(passages[0].get('instruction_md', '')) if passages else ''
    
    # PassageMd = actual reading passage content
    # InstructionsMd = question instructions (e.g. "Choose NO MORE THAN THREE WORDS")
    passage_content = passage_text if passage_text else ''
    
    sql_lines.extend([
        f"  INSERT INTO exam_sections (\"Id\",\"ExamId\",\"Idx\",\"Title\",\"InstructionsMd\",\"PassageMd\")",
        "  VALUES (",
        f"    sec1,",
        f"    exam_id,",
        f"    1,",
        f"    'Reading Passage - {escape_sql(title)}',",
        f"    E'{instruction_text}',",
        f"    E'{passage_content}'",
        "  );",
        "",
    ])
    
    # Insert questions
    for q in questions:
        q_type = q.get('type', 'SUMMARY_COMPLETION')
        q_prompt = escape_sql(q.get('prompt', ''))
        q_idx = q.get('idx', 1)
        options = q.get('options', [])
        correct = q.get('correct_answer', '')
        # Get AI-generated explanation or use default
        explanation = escape_sql(q.get('explanation_md', ''))
        
        if q_type in ['TRUE_FALSE_NOT_GIVEN', 'YES_NO_NOT_GIVEN', 'MULTIPLE_CHOICE_SINGLE', 'MULTIPLE_CHOICE_MULTIPLE', 'MATCHING_HEADING', 'MATCHING_FEATURES', 'MATCHING_INFORMATION']:
            # Build MatchPairs for MATCHING_* types
            match_pairs_sql = 'NULL'
            if q_type == 'MATCHING_INFORMATION' and correct:
                correct_value = correct.upper()
                prompt_key = f"info-q{q_idx}"
                match_pairs_sql = f"'{{\"{prompt_key}\": [\"{correct_value}\", \"{correct_value.lower()}\"]}}'"
            
            if q_type == 'MATCHING_HEADING' and correct:
                # Find the correct heading label from options
                correct_value = correct.lower()  # e.g., "vi"
                correct_label = correct_value  # Default to just the numeral
                for opt in options:
                    opt_label = opt.get('label', '')
                    # Check if this option starts with the correct answer (e.g., "vi. ...")
                    if opt_label.lower().startswith(correct_value + '.') or opt_label.lower().startswith(correct_value + ' '):
                        correct_label = escape_sql(opt_label)
                        break
                # Format: {"section-a-q28": ["vi", "vi. Full heading text"]}
                prompt_lower = q_prompt.lower().replace(' ', '-')  # e.g., "section-a"
                prompt_key = f"{prompt_lower}-q{q_idx}"
                match_pairs_sql = f"'{{\"{prompt_key}\": [\"{correct_value}\", \"{correct_label}\"]}}'"
            
            if q_type == 'MATCHING_FEATURES' and correct:
                correct_value = correct.upper()
                correct_label = correct_value
                for opt in options:
                    if opt.get('value') == correct_value or opt.get('is_correct'):
                        correct_label = escape_sql(opt.get('label', correct_value))
                        break
                prompt_key = f"feature-q{q_idx}"
                match_pairs_sql = f"'{{\"{prompt_key}\": [\"{correct_value}\", \"{correct_label}\"]}}'"
            
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
                f"    E'{explanation}'," if explanation else f"    '',",
                f"    {match_pairs_sql}",
                f"  );",
            ])
            
            # Output options for all types that need dropdown (including MATCHING_HEADING)
            for i, opt in enumerate(options):
                is_correct = 'true' if opt.get('is_correct') or opt.get('isCorrect') else 'false'
                # Read contentMd first (normalized), fallback to label/text (raw)
                opt_content = opt.get('contentMd', '')
                if not opt_content:
                    label = opt.get('label', opt.get('value', ''))
                    text = opt.get('text', '')
                    if text:
                        opt_content = f"{label}. {text}"
                    else:
                        opt_content = label
                opt_content = escape_sql(opt_content)
                sql_lines.append(
                    f"  INSERT INTO exam_options (\"Id\",\"QuestionId\",\"Idx\",\"ContentMd\",\"IsCorrect\") VALUES "
                    f"(gen_random_uuid(), qid, {i+1}, '{opt_content}', {is_correct});"
                )
            sql_lines.append("")
            
        elif q_type == 'SHORT_ANSWER':
            # SHORT_ANSWER uses ShortAnswerAcceptTexts (array of strings)
            answers = []
            if correct:
                if isinstance(correct, list):
                    answers = correct
                elif ' / ' in correct:
                    answers = [v.strip() for v in correct.split(' / ')]
                elif '//' in correct:
                    answers = [v.strip() for v in correct.split('//')]
                else:
                    answers.append(correct)
            answers_sql = 'ARRAY[' + ', '.join([f"'{escape_sql(a)}'" for a in answers]) + ']::text[]' if answers else 'NULL'
            sql_lines.extend([
                f"  qid := gen_random_uuid();",
                f"  INSERT INTO exam_questions (\"Id\",\"SectionId\",\"Idx\",\"Type\",\"Skill\",\"Difficulty\",\"PromptMd\",\"ExplanationMd\",\"ShortAnswerAcceptTexts\")",
                f"  VALUES (",
                f"    qid,",
                f"    sec1,",
                f"    {q_idx},",
                f"    '{q_type}',",
                f"    'READING',",
                f"    2,",
                f"    '{q_prompt}',",
                f"    E'{explanation}'," if explanation else f"    '',",
                f"    {answers_sql}",
                f"  );",
                "",
            ])
            
        else:  # SUMMARY_COMPLETION, SENTENCE_COMPLETION
            blank_key = f"blank-q{q_idx}"
            answers = []
            if correct:
                # Split multiple answer variants
                if ' / ' in correct:
                    answers = [v.strip() for v in correct.split(' / ')]
                elif '/' in correct and len(correct) > 2:
                    answers = [v.strip() for v in correct.split('/')]
                elif len(correct) == 1 and correct.isalpha():
                    answers = [correct.upper(), correct.lower()]
                else:
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
                f"    E'{explanation}'," if explanation else f"    '',",
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
    
    if len(sys.argv) < 2:
        print("Usage: python crawler-ieltsmentor.py [URL]")
        print("Example: python crawler-ieltsmentor.py https://www.ielts-mentor.com/reading-sample/gt-reading/3719-evening-courses-and-the-bike-foundry")
        sys.exit(1)
    
    url = sys.argv[1]
    logger.info(f"Crawling: {url}")
    
    # Fetch page
    soup = fetch_page(url)
    
    # Extract data
    title = extract_title(soup)
    exam_id = extract_exam_id(url)
    logger.info(f"Title: {title}")
    logger.info(f"Exam ID: {exam_id}")
    
    # Extract passages
    passages = extract_passages(soup)
    logger.info(f"Extracted {len(passages)} passage(s)")
    
    # Extract answers first
    answers = extract_answers(soup)
    logger.info(f"Found {len(answers)} answers: {answers}")
    
    # Extract question texts and heading options
    question_texts = extract_question_texts(soup)
    logger.info(f"Found {len(question_texts)} question texts")
    
    heading_options = extract_heading_options(soup)
    if heading_options:
        logger.info(f"Found {len(heading_options)} heading options")
        for opt in heading_options:
            logger.info(f"  {opt['label']}")
    
    # Extract questions
    questions = extract_questions(soup, answers, question_texts, heading_options)
    logger.info(f"Extracted {len(questions)} questions")
    
    if not questions:
        logger.error("No questions extracted!")
        sys.exit(1)
    
    # Log question summary
    for q in questions:
        logger.info(f"  Q{q['idx']}: {q['type']} -> {q['correct_answer']}")
    
    # Generate SQL
    data = {
        'title': title,
        'exam_id': exam_id,
        'passages': passages,
        'questions': questions
    }
    
    sql = generate_sql(data)
    
    # Save SQL file
    # Create slug for filename
    slug = re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')
    output_file = SEEDS_DIR / f"seed_exam_ielts-mentor-{slug}.sql"
    
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(sql)
    
    logger.info(f"Saved SQL to: {output_file}")
    logger.info("=" * 60)


if __name__ == "__main__":
    main()
