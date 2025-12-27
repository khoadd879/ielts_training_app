#!/usr/bin/env python3
"""
Enhanced Rule-Based Parser for IELTS Exams
Auto-detects question types, extracts prompts, and finds answers from cleaned text.
"""
import re
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
from pathlib import Path


@dataclass
class QuestionGroup:
    """A group of questions with same type."""
    start_idx: int
    end_idx: int
    question_type: str
    instruction: str
    prompts: List[str]
    answers: List[str]


# Question type detection patterns
TYPE_PATTERNS = [
    # TRUE/FALSE/NOT GIVEN
    (r'TRUE\s+if\s+the\s+statement\s+agrees.*FALSE\s+if.*NOT\s+GIVEN', 'TRUE_FALSE_NOT_GIVEN'),
    (r'TRUE.*FALSE.*NOT\s+GIVEN', 'TRUE_FALSE_NOT_GIVEN'),
    (r'write\s+true.*false.*not\s+given', 'TRUE_FALSE_NOT_GIVEN'),
    
    # YES/NO/NOT GIVEN  
    (r'YES\s+if\s+the\s+statement\s+(agrees|reflects).*NO\s+if.*NOT\s+GIVEN', 'YES_NO_NOT_GIVEN'),
    (r'YES.*NO.*NOT\s+GIVEN', 'YES_NO_NOT_GIVEN'),
    (r'write\s+yes.*no.*not\s+given', 'YES_NO_NOT_GIVEN'),
    
    # MATCHING HEADING
    (r'choose\s+the\s+(best|correct|most\s+suitable)\s+heading', 'MATCHING_HEADING'),
    (r'heading.*i[-–].*x', 'MATCHING_HEADING'),
    (r'list\s+of\s+headings', 'MATCHING_HEADING'),
    (r'match.*heading', 'MATCHING_HEADING'),
    
    # MATCHING HEADING (These are "which paragraph contains" questions - answer is A-H)
    (r'which\s+(paragraph|section)\s+(contains|mentions)', 'MATCHING_HEADING'),
    (r'choose.*letter.*A[-–].*[F-J].*paragraph', 'MATCHING_HEADING'),
    (r'write\s+the\s+correct\s+letter.*A[-–].*paragraph', 'MATCHING_HEADING'),
    
    # MATCHING INFORMATION (classify/match statements to categories)
    (r'classify.*following', 'MATCHING_INFORMATION'),
    (r'match.*statement.*paragraph', 'MATCHING_INFORMATION'),
    
    # MATCHING FEATURES
    (r'match.*feature', 'MATCHING_FEATURES'),
    (r'match.*name', 'MATCHING_FEATURES'),
    (r'match.*person', 'MATCHING_FEATURES'),
    
    # MULTIPLE CHOICE (single)
    (r'choose\s+the\s+correct\s+letter.*A,?\s*B,?\s*C\s*(or|,)?\s*D', 'MULTIPLE_CHOICE_SINGLE'),
    (r'choose.*A,?\s*B,?\s*C\s*or\s*D', 'MULTIPLE_CHOICE_SINGLE'),
    (r'circle\s+the\s+correct\s+letter', 'MULTIPLE_CHOICE_SINGLE'),
    
    # MULTIPLE CHOICE (multiple)
    (r'choose\s+(two|three)\s+letters', 'MULTIPLE_CHOICE_MULTIPLE'),
    (r'select\s+(two|three)', 'MULTIPLE_CHOICE_MULTIPLE'),
    
    # DIAGRAM COMPLETION
    (r'label\s+the\s+diagram', 'SUMMARY_COMPLETION'),
    (r'complete\s+the\s+diagram', 'SUMMARY_COMPLETION'),
    (r'diagram\s+below', 'SUMMARY_COMPLETION'),
    
    # NOTE COMPLETION
    (r'complete\s+the\s+notes', 'SUMMARY_COMPLETION'),
    (r'notes\s+below', 'SUMMARY_COMPLETION'),
    
    # TABLE COMPLETION
    (r'complete\s+the\s+table', 'SUMMARY_COMPLETION'),
    (r'table\s+below', 'SUMMARY_COMPLETION'),
    
    # FLOW CHART COMPLETION
    (r'complete\s+the\s+flow.?chart', 'SUMMARY_COMPLETION'),
    (r'flow.?chart\s+below', 'SUMMARY_COMPLETION'),
    
    # SUMMARY/SENTENCE COMPLETION
    (r'complete.*using.*no\s+more\s+than\s+(one|two|three)\s+word', 'SUMMARY_COMPLETION'),
    (r'complete.*sentences?.*no\s+more\s+than', 'SUMMARY_COMPLETION'),
    (r'complete\s+the\s+summary', 'SUMMARY_COMPLETION'),
    (r'fill\s+in\s+the\s+blanks?', 'SUMMARY_COMPLETION'),
    
    # SHORT ANSWER
    (r'answer.*questions.*no\s+more\s+than\s+(one|two|three)\s+word', 'SHORT_ANSWER'),
    (r'(number|date|word).*from\s+(the\s+)?(passage|text)', 'SHORT_ANSWER'),
    (r'complete.*with.*a\s+(number|date)', 'SHORT_ANSWER'),
    (r'write\s+a\s+date', 'SHORT_ANSWER'),
    (r'give\s+the\s+(name|date|year|number)', 'SHORT_ANSWER'),
]


def detect_question_type(instruction: str) -> str:
    """Detect question type from instruction text."""
    instruction_lower = instruction.lower()
    
    for pattern, q_type in TYPE_PATTERNS:
        if re.search(pattern, instruction_lower, re.IGNORECASE | re.DOTALL):
            return q_type
    
    # Default based on keywords
    if 'true' in instruction_lower and 'false' in instruction_lower:
        return 'TRUE_FALSE_NOT_GIVEN'
    if 'yes' in instruction_lower and 'no' in instruction_lower:
        return 'YES_NO_NOT_GIVEN'
    if 'heading' in instruction_lower:
        return 'MATCHING_HEADING'
    # "which paragraph/section contains" → MATCHING_HEADING
    if ('paragraph' in instruction_lower or 'section' in instruction_lower) and 'contains' in instruction_lower:
        return 'MATCHING_HEADING'
    if 'complete' in instruction_lower:
        return 'SUMMARY_COMPLETION'
    
    return 'SHORT_ANSWER'  # Default


def extract_question_range(text: str) -> List[Tuple[int, int, str]]:
    """
    Extract question ranges from text.
    Returns list of (start, end, instruction_text)
    """
    ranges = []
    
    # Pattern: "Questions 1-7" or "Questions 1–7" or "Questions 1 - 7"
    pattern = r'Questions?\s+(\d+)\s*[-–—]\s*(\d+)'
    matches = list(re.finditer(pattern, text, re.IGNORECASE))
    
    for i, match in enumerate(matches):
        start = int(match.group(1))
        end = int(match.group(2))
        
        # Find instruction (text between this match and next question block or answer section)
        start_pos = match.end()
        if i + 1 < len(matches):
            end_pos = matches[i + 1].start()
        else:
            # Find "Answer:" section
            answer_match = re.search(r'\bAnswer\s*:', text[start_pos:], re.IGNORECASE)
            end_pos = start_pos + answer_match.start() if answer_match else len(text)
        
        instruction = text[start_pos:end_pos]
        ranges.append((start, end, instruction.strip()))
    
    return ranges


def extract_prompts_from_text(text: str, start_idx: int, end_idx: int, q_type: str) -> List[str]:
    """Extract individual prompts for questions in range with enhanced patterns."""
    prompts = []
    
    for idx in range(start_idx, end_idx + 1):
        found = False
        
        # Pattern 1: "1. Text here" standard numbered format
        p1 = rf'\b{idx}\.\s+(.+?)(?=\n\s*{idx+1}[\.\s]|\n\s*\d+[\.\s]|Answer|$)'
        m1 = re.search(p1, text, re.DOTALL)
        if m1 and len(m1.group(1).strip()) > 3:
            prompts.append(re.sub(r'\s+', ' ', m1.group(1).strip())[:200])
            found = True
            continue
        
        # Pattern 2: "(1) Text" parentheses format
        p2 = rf'\({idx}\)\s*(.+?)(?=\n|$)'
        m2 = re.search(p2, text)
        if m2 and len(m2.group(1).strip()) > 3:
            prompts.append(re.sub(r'\s+', ' ', m2.group(1).strip())[:200])
            found = True
            continue
        
        # Pattern 3: HTML list item <li>1. text</li>
        p3 = rf'<li[^>]*>\s*{idx}[\.\)]\s*(.+?)</li>'
        m3 = re.search(p3, text, re.IGNORECASE)
        if m3:
            prompt = re.sub(r'<[^>]+>', '', m3.group(1)).strip()
            if len(prompt) > 3:
                prompts.append(prompt[:200])
                found = True
                continue
        
        # Pattern 4: Table cell format
        p4 = rf'<td[^>]*>\s*{idx}\s*</td>\s*<td[^>]*>\s*(.+?)</td>'
        m4 = re.search(p4, text, re.IGNORECASE)
        if m4:
            prompt = re.sub(r'<[^>]+>', '', m4.group(1)).strip()
            if len(prompt) > 3:
                prompts.append(prompt[:200])
                found = True
                continue
        
        # Pattern 5: Inline with blank "...28...... text"
        p5 = rf'{idx}[._]+\s+(.+?)(?=\n|$)'
        m5 = re.search(p5, text)
        if m5 and len(m5.group(1).strip()) > 3:
            prompts.append(re.sub(r'\s+', ' ', m5.group(1).strip())[:200])
            found = True
            continue
        
        # Pattern 6: Question with blank marker
        p6 = rf'{idx}\.\s*([^.]+[._]{{3,}}[^.]*)'
        m6 = re.search(p6, text)
        if m6:
            prompts.append(re.sub(r'\s+', ' ', m6.group(1).strip())[:200])
            found = True
            continue
        
        # Pattern 7: Bold numbered "**28** text"
        p7 = rf'\*\*{idx}\*\*\s*(.+?)(?=\n|\*\*\d+\*\*|$)'
        m7 = re.search(p7, text)
        if m7 and len(m7.group(1).strip()) > 3:
            prompts.append(re.sub(r'\s+', ' ', m7.group(1).strip())[:200])
            found = True
            continue
        
        # Pattern 8: Simple line starting with number
        p8 = rf'^{idx}\s+(.{{10,100}})$'
        m8 = re.search(p8, text, re.MULTILINE)
        if m8:
            prompts.append(m8.group(1).strip()[:200])
            found = True
            continue
        
        # Fallback: use generic prompt
        if not found:
            prompts.append(f"Question {idx}")
    
    return prompts


def extract_answers_from_text(text: str) -> Dict[int, str]:
    """Extract answers from Answer section with improved patterns."""
    answers = {}
    
    # Find answer section
    answer_match = re.search(r'\bAnswer\s*:\s*(.+?)(?=Show|Hide|Prev|Next|$)', text, re.IGNORECASE | re.DOTALL)
    if not answer_match:
        return answers
    
    answer_text = answer_match.group(1)
    
    # Pattern 1: "1. A" or "1. TRUE" or "1. answer text"
    pattern1 = r'(\d+)\.\s*([A-Z][A-Z\s]*?|[A-Za-z][^.\n]{0,50})(?=\n|\s+\d+\.|\Z)'
    for match in re.finditer(pattern1, answer_text):
        idx = int(match.group(1))
        answer = match.group(2).strip()
        if answer and idx not in answers:
            # Clean answer
            answer = re.sub(r'\s+', ' ', answer)
            answer = re.sub(r'\[.*?\]', '', answer).strip()
            # Normalize known values
            if answer.upper() in ['TRUE', 'FALSE', 'NOT GIVEN', 'YES', 'NO']:
                answer = answer.upper()
            elif len(answer) == 1 and answer.isalpha():
                answer = answer.upper()
            answers[idx] = answer
    
    # Pattern 2: "1 A" (without dot) - common format
    pattern2 = r'\b(\d+)\s+([A-Z])\b'
    for match in re.finditer(pattern2, answer_text):
        idx = int(match.group(1))
        if idx not in answers:
            answers[idx] = match.group(2).upper()
    
    # Pattern 3: Grouped answers like "33-36: D, E, F, I"
    pattern3 = r'(\d+)[-–](\d+)\s*:\s*([A-Za-z,\s]+)'
    for match in re.finditer(pattern3, answer_text):
        start = int(match.group(1))
        end = int(match.group(2))
        ans_list = [a.strip().upper() for a in match.group(3).split(',')]
        for i, ans in enumerate(ans_list):
            idx = start + i
            if idx <= end and idx not in answers:
                answers[idx] = ans
    
    # Pattern 4: Line-by-line extraction
    lines = answer_text.strip().split('\n')
    for line in lines:
        line = line.strip()
        # "28. B" or "28 B"
        m = re.match(r'^(\d+)[.\s]+([A-Z]|TRUE|FALSE|NOT GIVEN|YES|NO)\s*$', line, re.IGNORECASE)
        if m:
            idx = int(m.group(1))
            if idx not in answers:
                answers[idx] = m.group(2).upper()
    
    # Pattern 5: Comma-separated answers (common in HTML)
    # Format: "28. E, 29. H, 30. C, 31. B, 32. F, 33. D"
    pattern5 = r'(\d+)\.\s*([A-Z]|TRUE|FALSE|NOT GIVEN|YES|NO|[^,]{1,50})(?:,|$)'
    for match in re.finditer(pattern5, text, re.IGNORECASE):
        idx = int(match.group(1))
        answer = match.group(2).strip()
        if answer and idx not in answers and len(answer) < 60:
            # Normalize
            if answer.upper() in ['TRUE', 'FALSE', 'NOT GIVEN', 'YES', 'NO']:
                answer = answer.upper()
            elif len(answer) == 1 and answer.isalpha():
                answer = answer.upper()
            answers[idx] = answer
    
    # Pattern 6: Answers in blockquote HTML format
    # <blockquote>28. E, 29. H...</blockquote>
    blockquote_match = re.search(r'<blockquote[^>]*>([^<]+)</blockquote>', text, re.IGNORECASE)
    if blockquote_match:
        bq_text = blockquote_match.group(1)
        for match in re.finditer(r'(\d+)\.\s*([A-Z]|[^,]{1,40})', bq_text):
            idx = int(match.group(1))
            answer = match.group(2).strip()
            if answer and idx not in answers:
                if len(answer) == 1 and answer.isalpha():
                    answer = answer.upper()
                answers[idx] = answer
    
    # Pattern 7: Answers in table cells
    # <td>28</td><td>E</td> or <td>E</td> with context
    table_pattern = r'<td[^>]*>\s*(\d+)\s*</td>\s*<td[^>]*>\s*([A-Z]|TRUE|FALSE|NOT GIVEN|YES|NO|[^<]{1,40})\s*</td>'
    for match in re.finditer(table_pattern, text, re.IGNORECASE):
        idx = int(match.group(1))
        answer = match.group(2).strip()
        if answer and idx not in answers:
            if answer.upper() in ['TRUE', 'FALSE', 'NOT GIVEN', 'YES', 'NO']:
                answer = answer.upper()
            elif len(answer) == 1 and answer.isalpha():
                answer = answer.upper()
            answers[idx] = answer
    
    # Pattern 8: Answers with parentheses like "(28) E" or "28) E"
    pattern8 = r'\(?\b(\d+)\)\s*([A-Z]|TRUE|FALSE|NOT GIVEN|YES|NO)\b'
    for match in re.finditer(pattern8, text, re.IGNORECASE):
        idx = int(match.group(1))
        if idx not in answers:
            answers[idx] = match.group(2).upper()
    
    # Pattern 9: Text answers like "15. senior" or "17. disciplinary action"
    # Common in SHORT_ANSWER questions
    pattern9 = r'\b(\d+)\.\s+([a-z][a-z\s\-\']+(?:\([^)]+\))?)'
    for match in re.finditer(pattern9, text):
        idx = int(match.group(1))
        answer = match.group(2).strip()
        # Filter out noise (too long or looks like question)
        if answer and idx not in answers and 1 < len(answer) < 50:
            if not any(noise in answer.lower() for noise in ['question', 'answer', 'write', 'choose', 'complete']):
                answers[idx] = answer
    
    # Pattern 10: Answers in newline format from cleaned text
    # "15 senior\n16 misconduct\n17 disciplinary action"
    pattern10 = r'^(\d+)\s+([a-zA-Z][^\n]{1,40})$'
    for match in re.finditer(pattern10, text, re.MULTILINE):
        idx = int(match.group(1))
        answer = match.group(2).strip()
        if answer and idx not in answers and len(answer) < 50:
            if not any(noise in answer.lower() for noise in ['question', 'answer', 'write', 'choose']):
                # Normalize
                if answer.upper() in ['TRUE', 'FALSE', 'NOT GIVEN', 'YES', 'NO']:
                    answer = answer.upper()
                elif len(answer) == 1 and answer.isalpha():
                    answer = answer.upper()
                answers[idx] = answer
    
    # Pattern 11: Answers with slashes (alternative forms)
    # "21. 3 months // three months" or "23. one twelfth// one-twelfth"
    pattern11 = r'(\d+)\.\s*([^/\n]{2,30})\s*//\s*([^\n]{2,30})'
    for match in re.finditer(pattern11, text):
        idx = int(match.group(1))
        if idx not in answers:
            answer = match.group(2).strip()
            answers[idx] = answer
    
    # Pattern 12: Time/number phrases like "3 years ago" or "5 days"
    pattern12 = r'(\d+)\.\s*(\d+\s+(?:years?|months?|days?|weeks?|hours?|minutes?)(?:\s+ago)?)'
    for match in re.finditer(pattern12, text, re.IGNORECASE):
        idx = int(match.group(1))
        if idx not in answers:
            answers[idx] = match.group(2).strip()
    
    # Pattern 13: Answers in <p> tags like "<p>19. 3 years ago</p>"
    pattern13 = r'<p[^>]*>\s*(\d+)\.\s*([^<]{2,50})</p>'
    for match in re.finditer(pattern13, text, re.IGNORECASE):
        idx = int(match.group(1))
        answer = match.group(2).strip()
        if answer and idx not in answers and len(answer) < 50:
            if not any(noise in answer.lower() for noise in ['question', 'complete', 'write']):
                answers[idx] = answer
    
    # Pattern 14: BR-separated "28. 1638<br />" or "28. answer<br />"
    pattern14 = r'(\d+)\.\s*([^<\n]{2,50})\s*(?:<br\s*/?|$)'
    for match in re.finditer(pattern14, text):
        idx = int(match.group(1))
        answer = match.group(2).strip()
        if answer and idx not in answers and 1 <= idx <= 40 and len(answer) < 50:
            if not any(noise in answer.lower() for noise in ['question', 'answer', 'write', 'choose']):
                answers[idx] = answer
    
    # Pattern 15: Slash-separated with alternative "21. 3 months // three months"
    pattern15 = r'(\d+)\.\s*([^<\n/]{2,40})\s*//'
    for match in re.finditer(pattern15, text):
        idx = int(match.group(1))
        answer = match.group(2).strip()
        if answer and idx not in answers and 1 <= idx <= 40:
            answers[idx] = answer
    
    # Pattern 16: Parenthetical start "(formal) education"
    pattern16 = r'(\d+)\.\s*(\([^)]+\)\s*[a-zA-Z][^<\n]{1,40})'
    for match in re.finditer(pattern16, text):
        idx = int(match.group(1))
        answer = match.group(2).strip()
        if answer and idx not in answers and 1 <= idx <= 40:
            answers[idx] = answer
    
    # Pattern 17: Percentages "25 per cent" or "25%"
    pattern17 = r'(\d+)\.\s*(\d+\s*(?:per\s*cent|percent|%))'
    for match in re.finditer(pattern17, text, re.IGNORECASE):
        idx = int(match.group(1))
        answer = match.group(2).strip()
        if answer and idx not in answers and 1 <= idx <= 40:
            answers[idx] = answer
    
    # Pattern 18: Speed/distance "300 kph" or "5 km"
    pattern18 = r'(\d+)\.\s*(\d+\s*(?:kph|mph|km/h|km|metres?|meters?))'
    for match in re.finditer(pattern18, text, re.IGNORECASE):
        idx = int(match.group(1))
        answer = match.group(2).strip()
        if answer and idx not in answers and 1 <= idx <= 40:
            answers[idx] = answer
    
    # Pattern 19: Years (4-digit numbers) "28. 1638"
    pattern19 = r'(\d+)\.\s*(\d{4})\s*(?:<br|,|\n|$)'
    for match in re.finditer(pattern19, text):
        idx = int(match.group(1))
        answer = match.group(2).strip()
        if answer and idx not in answers and 1 <= idx <= 40:
            answers[idx] = answer
    
    return answers


def parse_cleaned_text(text: str) -> Dict:
    """
    Parse cleaned text and extract structured data.
    Returns dict with exam info, passages, questions, and answers.
    """
    result = {
        'title': '',
        'passages': [],
        'question_groups': [],
        'answers': {},
    }
    
    # Extract title (first non-empty line usually)
    title_match = re.search(r'^(.+?(?:Test|Section|Reading).+?)[\n$]', text, re.IGNORECASE | re.MULTILINE)
    if title_match:
        result['title'] = title_match.group(1).strip()
    
    # Extract question ranges and types
    ranges = extract_question_range(text)
    for start, end, instruction in ranges:
        q_type = detect_question_type(instruction)
        prompts = extract_prompts_from_text(text, start, end, q_type)
        
        result['question_groups'].append({
            'start': start,
            'end': end,
            'type': q_type,
            'instruction': instruction[:200],  # Truncate
            'prompts': prompts,
        })
    
    # Extract answers
    result['answers'] = extract_answers_from_text(text)
    
    return result


def build_options(q_type: str, correct_answer: str = '') -> List[Dict]:
    """Build options list based on question type."""
    if q_type == 'TRUE_FALSE_NOT_GIVEN':
        return [
            {'value': 'TRUE', 'label': 'TRUE', 'is_correct': correct_answer == 'TRUE'},
            {'value': 'FALSE', 'label': 'FALSE', 'is_correct': correct_answer == 'FALSE'},
            {'value': 'NOT GIVEN', 'label': 'NOT GIVEN', 'is_correct': correct_answer == 'NOT GIVEN'},
        ]
    elif q_type == 'YES_NO_NOT_GIVEN':
        return [
            {'value': 'YES', 'label': 'YES', 'is_correct': correct_answer == 'YES'},
            {'value': 'NO', 'label': 'NO', 'is_correct': correct_answer == 'NO'},
            {'value': 'NOT GIVEN', 'label': 'NOT GIVEN', 'is_correct': correct_answer == 'NOT GIVEN'},
        ]
    elif q_type == 'MATCHING_INFORMATION':
        # Determine option range from answer
        if correct_answer and correct_answer.isalpha() and len(correct_answer) == 1:
            # Build A-F or A-H based on answer
            max_letter = max('F', correct_answer.upper())
            options = []
            for c in 'ABCDEFGH':
                if c <= max_letter:
                    options.append({'value': c, 'label': c, 'is_correct': c == correct_answer.upper()})
            return options
        return []
    elif q_type in ['SHORT_ANSWER', 'SUMMARY_COMPLETION']:
        return []  # Text input, no options
    elif q_type == 'MULTIPLE_CHOICE_SINGLE':
        return [
            {'value': 'A', 'label': 'A', 'is_correct': correct_answer == 'A'},
            {'value': 'B', 'label': 'B', 'is_correct': correct_answer == 'B'},
            {'value': 'C', 'label': 'C', 'is_correct': correct_answer == 'C'},
            {'value': 'D', 'label': 'D', 'is_correct': correct_answer == 'D'},
        ]
    
    return []


# CLI for testing
if __name__ == '__main__':
    import sys
    if len(sys.argv) < 2:
        print("Usage: python enhanced_parser.py <cleaned_text_file>")
        sys.exit(1)
    
    text = Path(sys.argv[1]).read_text()
    result = parse_cleaned_text(text)
    
    print(f"Title: {result['title']}")
    print(f"\nQuestion Groups: {len(result['question_groups'])}")
    for g in result['question_groups']:
        print(f"  Q{g['start']}-{g['end']}: {g['type']}")
        print(f"    Prompts: {len(g['prompts'])}")
    
    print(f"\nAnswers: {len(result['answers'])}")
    for idx, ans in sorted(result['answers'].items()):
        print(f"  Q{idx}: {ans}")
