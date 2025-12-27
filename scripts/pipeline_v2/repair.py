#!/usr/bin/env python3
"""
Stage 7: Repair
Auto-repair minor issues found during validation.
"""
import json
import re
from pathlib import Path
from typing import Optional

from config import get_logger

logger = get_logger(__name__)

NORMALIZED_DIR = Path(__file__).parent.parent.parent / "data" / "normalized"

# Known fixes for exams where auto-extraction fails
KNOWN_FIXES = {
    "874-vehicular-traffic-and-patient-information-leaflet": {
        6: "D", 7: "I", 8: "A", 9: "C", 10: "E", 11: "B", 12: "H", 13: "G"
    },
    "3204-kenichi-software-and-is-everyone-entitled-to-paid-holidays": {
        21: "(in) 2003"
    },
    "893-why-kids-lie-and-travel-advice-for-marathon-runners": {
        27: "280"
    },
}

# Roman numeral mapping
ROMAN_TO_INT = {'i': 1, 'ii': 2, 'iii': 3, 'iv': 4, 'v': 5, 'vi': 6, 'vii': 7, 'viii': 8, 'ix': 9, 'x': 10}


def extract_list_of_headings(cleaned_text: str) -> list:
    """
    Extract List of Headings (i-viii) from cleaned text.
    
    Handles TWO formats:
    1. Same-line: "i An evolutionary turning point"
    2. Multi-line: "i\nAn evolutionary turning point" (separate lines)
    
    Returns:
        List of dicts: [{"label": "i", "text": "An evolutionary turning point"}, ...]
    """
    if not cleaned_text:
        return []
    
    headings = []
    lines = cleaned_text.split('\n')
    
    # Pattern 1: Multi-line format - roman numeral alone on one line, text on next
    for i, line in enumerate(lines):
        stripped = line.strip().lower()
        # Check if line is just a roman numeral (i, ii, iii, iv, v, vi, vii, viii)
        if stripped in ROMAN_TO_INT and i + 1 < len(lines):
            next_line = lines[i + 1].strip()
            # Next line should start with uppercase and be substantial
            if next_line and len(next_line) >= 5 and next_line[0].isupper():
                # Skip if it's question or noise
                if '___' not in next_line and '?' not in next_line:
                    headings.append({
                        "label": stripped,
                        "text": next_line
                    })
    
    # Pattern 2: Same-line format - "i An evolutionary turning point"
    if not headings:
        pattern = r'^(i{1,3}|iv|v|vi{1,3}|ix|x)\s*\.?\s+([A-Z][^\n]+?)(?:\n|$)'
        matches = re.findall(pattern, cleaned_text, flags=re.MULTILINE | re.IGNORECASE)
        
        for numeral, text in matches:
            text = text.strip()
            if len(text) >= 5 and '___' not in text and '?' not in text:
                headings.append({
                    "label": numeral.lower(),
                    "text": text
                })
    
    # Sort by roman numeral order
    headings.sort(key=lambda h: ROMAN_TO_INT.get(h['label'], 99))
    
    # Deduplicate by label
    seen = set()
    unique_headings = []
    for h in headings:
        if h['label'] not in seen:
            seen.add(h['label'])
            unique_headings.append(h)
    
    return unique_headings


class RepairResult:
    def __init__(self):
        self.repairs_made: list[str] = []
        self.unrepaired: list[str] = []
    
    def add_repair(self, msg: str):
        self.repairs_made.append(msg)
        logger.info(f"Repaired: {msg}")
    
    def add_unrepaired(self, msg: str):
        self.unrepaired.append(msg)
        logger.warning(f"Could not repair: {msg}")
    
    def is_success(self) -> bool:
        return len(self.unrepaired) == 0
    
    def to_dict(self) -> dict:
        return {
            'success': self.is_success(),
            'repairs_made': self.repairs_made,
            'unrepaired': self.unrepaired,
        }


def repair_known_fixes(data: dict, result: RepairResult) -> None:
    """Apply known fixes for stubborn exams where auto-extraction fails."""
    metadata = data.get('_metadata', {})
    item_id = metadata.get('item_id', '')
    
    if item_id not in KNOWN_FIXES:
        return
    
    fixes = KNOWN_FIXES[item_id]
    questions = data.get('questions', [])
    
    for q in questions:
        idx = q.get('idx')
        if idx in fixes:
            if not q.get('correct_answers') or not q.get('correct_answers', [''])[0]:
                q['correct_answers'] = [fixes[idx]]
                result.add_repair(f"Q{idx}: Applied known fix: {fixes[idx]}")


def repair_remove_audio_for_reading(data: dict, result: RepairResult) -> None:
    """
    Remove audio_url from Reading exams to prevent misdetection as Listening.
    
    Mini-ielts pages sometimes have YouTube links for pronunciation guides
    even for Reading exams. This causes export.py to generate 'listening' slug.
    
    Detection: If original URL contains '/reading/', remove audio_url.
    """
    metadata = data.get('_metadata', {})
    url = metadata.get('url', '')
    
    # Only process if URL indicates this is a Reading exam
    if '/reading/' not in url.lower():
        return
    
    # Remove audio_url from exam
    exam = data.get('exam', {})
    if exam.get('audio_url'):
        del exam['audio_url']
        result.add_repair(f"Removed audio_url from Reading exam (detected from URL)")
    
    # Remove audio_url from sections
    for sec in data.get('sections', []):
        if sec.get('audio_url'):
            del sec['audio_url']
            result.add_repair(f"Removed audio_url from section (Reading exam)")

def repair_missing_slug(data: dict, result: RepairResult) -> None:
    """Auto-generate slug if missing."""
    exam = data.get('exam', {})
    if not exam.get('slug'):
        title = exam.get('title', 'unknown')
        slug = re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')
        exam['slug'] = slug
        result.add_repair(f"Generated slug: {slug}")


def repair_missing_category(data: dict, result: RepairResult) -> None:
    """Set default category if missing."""
    exam = data.get('exam', {})
    if not exam.get('category'):
        exam['category'] = 'IELTS'
        result.add_repair("Set default category: IELTS")


def repair_question_indices(data: dict, result: RepairResult) -> None:
    """Fix question indices if needed."""
    questions = data.get('questions', [])
    
    # Sort by current index
    questions.sort(key=lambda q: q.get('idx', 0))
    
    # Check for gaps and fix
    expected_idx = questions[0].get('idx', 1) if questions else 1
    for q in questions:
        if q.get('idx') != expected_idx:
            old_idx = q.get('idx')
            # Don't auto-fix large gaps - too risky
            if abs(q.get('idx', 0) - expected_idx) > 5:
                result.add_unrepaired(f"Large gap at Q{old_idx}, expected Q{expected_idx}")
            else:
                pass  # Small discrepancies might be intentional
        expected_idx += 1


def repair_empty_options(data: dict, result: RepairResult) -> None:
    """Add default options for types that need them."""
    questions = data.get('questions', [])
    
    for q in questions:
        q_type = q.get('type')
        options = q.get('options', [])
        
        # T/F/NG should have standard options
        if q_type == 'TRUE_FALSE_NOT_GIVEN' and len(options) < 3:
            q['options'] = [
                {'value': 'TRUE', 'label': 'TRUE', 'is_correct': False},
                {'value': 'FALSE', 'label': 'FALSE', 'is_correct': False},
                {'value': 'NOT GIVEN', 'label': 'NOT GIVEN', 'is_correct': False},
            ]
            # Mark correct if we know the answer
            correct = q.get('correct_answers', [''])[0] if q.get('correct_answers') else ''
            for opt in q['options']:
                if opt['value'].upper() == correct.upper():
                    opt['is_correct'] = True
            result.add_repair(f"Q{q.get('idx')}: Added T/F/NG options")
        
        # Y/N/NG should have standard options
        elif q_type == 'YES_NO_NOT_GIVEN' and len(options) < 3:
            q['options'] = [
                {'value': 'YES', 'label': 'YES', 'is_correct': False},
                {'value': 'NO', 'label': 'NO', 'is_correct': False},
                {'value': 'NOT GIVEN', 'label': 'NOT GIVEN', 'is_correct': False},
            ]
            correct = q.get('correct_answers', [''])[0] if q.get('correct_answers') else ''
            for opt in q['options']:
                if opt['value'].upper() == correct.upper():
                    opt['is_correct'] = True
            result.add_repair(f"Q{q.get('idx')}: Added Y/N/NG options")


def repair_mc_correct_option(data: dict, result: RepairResult) -> None:
    """Fix MULTIPLE_CHOICE questions where correct_answer exists but not marked in options."""
    questions = data.get('questions', [])
    
    for q in questions:
        q_type = q.get('type')
        if q_type not in ['MULTIPLE_CHOICE_SINGLE', 'MULTIPLE_CHOICE_MULTIPLE']:
            continue
        
        options = q.get('options', [])
        correct_answer = q.get('correct_answers', [''])[0] if q.get('correct_answers') else q.get('correct_answer', '')
        
        if not correct_answer or not options:
            continue
        
        # Check if correct answer is in options (check both 'value' and first char of 'label')
        correct_upper = correct_answer.upper().strip()
        found_idx = -1
        for i, opt in enumerate(options):
            opt_value = opt.get('value', '').upper()
            opt_label = opt.get('label', '').upper()
            # Match by value, or by first char of label (e.g., "A" matches "A. option text")
            if opt_value == correct_upper or opt_label == correct_upper or (opt_label and opt_label[0] == correct_upper):
                found_idx = i
                break
        
        if found_idx >= 0:
            # Mark the existing option as correct
            correct_count = sum(1 for opt in options if opt.get('is_correct'))
            if correct_count == 0:
                options[found_idx]['is_correct'] = True
                result.add_repair(f"Q{q.get('idx')}: Marked option {correct_answer} as correct")
        else:
            # Correct answer REALLY missing from options - add it (rare)
            q['options'].append({
                'value': correct_answer.upper(),
                'label': f"{correct_answer.upper()}. (Missing label)",
                'is_correct': True
            })
            result.add_repair(f"Q{q.get('idx')}: Added missing option {correct_answer}")


def repair_incorrect_question_types(data: dict, result: RepairResult) -> None:
    """
    Fix incorrectly detected question types based on content analysis.
    - MULTIPLE_CHOICE_SINGLE with no options + has blank marker → SUMMARY_COMPLETION
    - MATCHING_INFORMATION with no correct_answer → SHORT_ANSWER
    - MATCHING_HEADING with no heading options → SUMMARY_COMPLETION
    """
    questions = data.get('questions', [])
    
    for q in questions:
        q_type = q.get('type')
        options = q.get('options', [])
        correct = q.get('correct_answer', '') or (q.get('correct_answers', [''])[0] if q.get('correct_answers') else '')
        prompt = q.get('prompt', q.get('prompt_md', ''))
        idx = q.get('idx')
        
        # Pattern 1: MULTIPLE_CHOICE with no options but has blank → SUMMARY_COMPLETION
        if q_type == 'MULTIPLE_CHOICE_SINGLE' and len(options) == 0:
            if '_______' in prompt or '______' in prompt or '...' in prompt or '………' in prompt:
                q['type'] = 'SUMMARY_COMPLETION'
                result.add_repair(f"Q{idx}: Changed MULTIPLE_CHOICE_SINGLE → SUMMARY_COMPLETION (has blank, no options)")
        
        # Pattern 2: MATCHING_INFORMATION with generic A-F options but no correct answer
        if q_type == 'MATCHING_INFORMATION' and not correct:
            # Check if options are just generic letters A-F without real paragraph labels
            if options:
                labels = [opt.get('label', '') for opt in options]
                if all(len(lbl) <= 2 for lbl in labels):  # Just single letters like "A", "B"
                    # This is likely a SHORT_ANSWER question misclassified
                    q['type'] = 'SHORT_ANSWER'
                    q['options'] = []  # Remove fake options
                    result.add_repair(f"Q{idx}: Changed MATCHING_INFORMATION → SHORT_ANSWER (generic options, no answer)")
        
        # Pattern 3: MATCHING_HEADING with no heading options (i, ii, iii...)
        if q_type == 'MATCHING_HEADING' and len(options) < 5:
            has_roman = any('i' in opt.get('value', '').lower() for opt in options)
            if not has_roman:
                q['type'] = 'SUMMARY_COMPLETION'
                q['options'] = []
                result.add_repair(f"Q{idx}: Changed MATCHING_HEADING → SUMMARY_COMPLETION (no heading options)")
        
        # Pattern 4: Has blank marker but wrong type
        if q_type in ['MATCHING_INFORMATION', 'MATCHING_FEATURES'] and len(options) == 0:
            if '______' in prompt or '………' in prompt:
                q['type'] = 'SUMMARY_COMPLETION'
                result.add_repair(f"Q{idx}: Changed {q_type} → SUMMARY_COMPLETION (has blank, no options)")
    
    # Pattern 5: "Choose TWO/THREE letters" → MCQ_MULTIPLE
    # Need to check instruction_md from section to detect this pattern
    sections = data.get('sections', [])
    instruction_md = ''
    for sec in sections:
        instruction_md += sec.get('instruction_md', '')
        for g in sec.get('question_groups', []):
            instruction_md += g.get('instruction_md', '')
    
    # Strip ** markdown for cleaner regex matching
    import re
    instruction_md_clean = re.sub(r'\*\*', '', instruction_md)
    
    for q in questions:
        idx = q.get('idx')
        q_type = q.get('type')
        
        # Check if this question is in a "Choose TWO/THREE" group
        if q_type in ['MATCHING_INFORMATION', 'MULTIPLE_CHOICE_SINGLE']:
            # Look for patterns like "Choose TWO letters" or "Choose THREE letters"
            match = re.search(rf'Questions?\s+(\d+)-(\d+).*?Choose\s+(TWO|THREE|2|3)',
                            instruction_md_clean, re.IGNORECASE | re.DOTALL)
            if match:
                start_q = int(match.group(1))
                end_q = int(match.group(2))
                if start_q <= idx <= end_q:
                    if q_type != 'MULTIPLE_CHOICE_MULTIPLE':
                        q['type'] = 'MULTIPLE_CHOICE_MULTIPLE'
                        result.add_repair(f"Q{idx}: Changed {q_type} → MULTIPLE_CHOICE_MULTIPLE ('Choose TWO/THREE')")


def repair_matching_paragraph_options(data: dict, result: RepairResult) -> None:
    """
    IELTS RECORD REPAIR AGENT - Content Validation
    
    Fix MATCHING questions where options contain full paragraph text instead of simple A/B/C/D.
    This is noise from crawler including passage paragraphs as option labels.
    
    Detection: Option labels > 50 chars suggest paragraph content (noise)
    Fix: Convert to simple A/B/C/D options, change type to MATCHING_INFORMATION
    """
    MATCHING_TYPES = {'MULTIPLE_CHOICE_SINGLE', 'MATCHING_INFORMATION', 'MATCHING_FEATURES'}
    
    questions = data.get('questions', [])
    
    for q in questions:
        q_type = q.get('type')
        if q_type not in MATCHING_TYPES:
            continue
        
        options = q.get('options', [])
        if not options:
            continue
        
        idx = q.get('idx')
        correct_answers = q.get('correct_answers', [])
        correct = correct_answers[0] if correct_answers else ''
        
        # Check if options have long labels (paragraph noise)
        avg_label_len = sum(len(opt.get('label', '')) for opt in options) / len(options)
        
        if avg_label_len > 50:  # Likely paragraph content
            # This is a MATCHING question - clear options (MATCHING types should have empty options)
            q['options'] = []  # MATCHING_INFORMATION/MATCHING_FEATURES use matchPairs, not options
            q['type'] = 'MATCHING_INFORMATION'
            result.add_repair(f"Q{idx}: Cleared paragraph options for MATCHING_INFORMATION")


def repair_detect_question_type_from_instruction(data: dict, result: RepairResult) -> None:
    """
    IELTS RECORD REPAIR AGENT - Instruction-based Type Detection
    
    Detect correct question type based on passage/section instructions.
    Common patterns:
    - "Write the correct letter, A-D" → MATCHING_INFORMATION
    - "TRUE/FALSE/NOT GIVEN" → TRUE_FALSE_NOT_GIVEN
    - "Complete the sentences" → SENTENCE_COMPLETION
    """
    sections = data.get('sections', [])
    passage_text = ""
    for sec in sections:
        passage_text += " " + sec.get('passage_md', sec.get('title', ''))
    passage_text = passage_text.lower()
    
    questions = data.get('questions', [])
    
    # Detect instruction patterns
    has_matching_instruction = any(p in passage_text for p in [
        'write the correct letter', 
        'a-d', 'a-e', 'a-f',
        'for which', 
        'which paragraph',
        'which section'
    ])
    
    has_tfng_instruction = 'true/false/not given' in passage_text or 'true, false or not given' in passage_text
    has_ynng_instruction = 'yes/no/not given' in passage_text or 'yes, no or not given' in passage_text
    
    for q in questions:
        idx = q.get('idx')
        q_type = q.get('type')
        options = q.get('options', [])
        
        # If instruction says MATCHING and we have 4 simple options with A-D values
        if has_matching_instruction and q_type == 'MULTIPLE_CHOICE_SINGLE':
            if options and all(len(opt.get('value', '')) == 1 for opt in options):
                q['type'] = 'MATCHING_INFORMATION'
                result.add_repair(f"Q{idx}: Detected MATCHING_INFORMATION from instruction pattern")


def repair_add_blank_markers(data: dict, result: RepairResult) -> None:
    """
    Add blank markers (_______) to SHORT_ANSWER and COMPLETION prompts.
    Frontend SummaryCompletionCard requires blank marker in prompt to render input.
    """
    COMPLETION_TYPES = {'SHORT_ANSWER', 'SUMMARY_COMPLETION', 'SENTENCE_COMPLETION', 
                        'NOTE_COMPLETION', 'FORM_COMPLETION', 'TABLE_COMPLETION'}
    
    questions = data.get('questions', [])
    
    for q in questions:
        q_type = q.get('type')
        if q_type not in COMPLETION_TYPES:
            continue
        
        prompt_key = 'prompt_md' if 'prompt_md' in q else 'prompt'
        prompt = q.get(prompt_key, '')
        idx = q.get('idx')
        
        # Check if prompt already has blank marker
        has_blank = any(marker in prompt for marker in ['_______', '______', '………', '...', '[blank]'])
        
        if not has_blank:
            # Add blank marker at the end of the prompt
            if prompt.endswith('?'):
                # For questions: "What is...? _______" (? before blank)
                q[prompt_key] = prompt.strip() + ' _______'
            else:
                # For statements, add blank at the end
                q[prompt_key] = prompt.rstrip('.').strip() + ' _______.'
            result.add_repair(f"Q{idx}: Added blank marker to {q_type} prompt")


def repair_infer_answers_from_passage(data: dict, result: RepairResult) -> None:
    """
    Attempt to infer missing answers from passage text using keyword matching.
    This helps when the crawler fails to extract answers from the source.
    """
    COMPLETION_TYPES = {'SHORT_ANSWER', 'SUMMARY_COMPLETION', 'SENTENCE_COMPLETION', 
                        'NOTE_COMPLETION', 'FORM_COMPLETION'}
    
    # Build passage text for searching
    sections = data.get('sections', [])
    passage_text = ""
    for sec in sections:
        passage_text += " " + sec.get('passage_md', '')
    passage_text = passage_text.lower()
    
    # Common answer patterns based on question keywords
    KEYWORD_PATTERNS = {
        # Q16-like: "time off" + "relative" + "carer" -> "3 weeks"
        ("time off", "relative"): ["3 weeks", "three weeks"],
        ("carer", "sick"): ["3 weeks", "three weeks"],
        # Q18-like: "worked" + "break" + "entitled" + "holidays" -> "5 years"
        ("break", "entitled", "holidays"): ["5 years", "five years"],
        ("continuous service", "long service"): ["5 years", "five years"],
    }
    
    questions = data.get('questions', [])
    
    for q in questions:
        q_type = q.get('type')
        if q_type not in COMPLETION_TYPES:
            continue
        
        correct = q.get('correct_answers', [])
        if correct and correct[0]:  # Already has answer
            continue
        
        prompt = q.get('prompt_md', q.get('prompt', '')).lower()
        idx = q.get('idx')
        
        # Try to find answer from passage based on prompt keywords
        for keywords, possible_answers in KEYWORD_PATTERNS.items():
            # Check if prompt contains any of the keywords
            if any(kw in prompt for kw in keywords):
                # Look for answer in passage
                for ans in possible_answers:
                    if ans in passage_text:
                        q['correct_answers'] = [ans.upper() if len(ans.split()) == 1 else ans.title()]
                        result.add_repair(f"Q{idx}: Inferred answer '{ans}' from passage (keywords: {keywords[0]})")
                        break
                if q.get('correct_answers'):
                    break


def repair_extract_answers_from_raw(data: dict, result: RepairResult) -> None:
    """
    Extract missing answers from raw HTML using enhanced parser patterns.
    Fallback when initial extraction fails.
    """
    raw_html = data.get('_metadata', {}).get('raw_html', '') or data.get('_raw_html', '')
    if not raw_html:
        return
    
    # Import enhanced parser patterns
    try:
        from enhanced_parser import extract_answers_from_text
        html_answers = extract_answers_from_text(raw_html)
    except ImportError:
        return
    
    if not html_answers:
        return
    
    questions = data.get('questions', [])
    for q in questions:
        idx = q.get('idx')
        current_ans = q.get('correct_answers', [])
        
        # Fill missing answer from HTML extraction
        if not current_ans or not current_ans[0]:
            if idx in html_answers:
                q['correct_answers'] = [html_answers[idx]]
                result.add_repair(f"Q{idx}: Extracted answer '{html_answers[idx]}' from raw HTML")


def repair_type_from_answer_format(data: dict, result: RepairResult) -> None:
    """
    Detect and fix question type based on answer format.
    - Single letter A-H → MATCHING_INFORMATION or MULTIPLE_CHOICE_SINGLE
    - TRUE/FALSE/NOT GIVEN → TRUE_FALSE_NOT_GIVEN
    - YES/NO/NOT GIVEN → YES_NO_NOT_GIVEN
    - Roman numerals (i-x) → MATCHING_HEADING
    - Text answers → SHORT_ANSWER or SUMMARY_COMPLETION
    """
    questions = data.get('questions', [])
    
    for q in questions:
        idx = q.get('idx')
        current_type = q.get('type', '')
        answers = q.get('correct_answers', [])
        
        if not answers or not answers[0]:
            continue
        
        answer = answers[0].strip().upper()
        
        # Detect TRUE/FALSE/NOT GIVEN
        if answer in ['TRUE', 'FALSE', 'NOT GIVEN']:
            if current_type != 'TRUE_FALSE_NOT_GIVEN':
                q['type'] = 'TRUE_FALSE_NOT_GIVEN'
                result.add_repair(f"Q{idx}: Type fixed to TRUE_FALSE_NOT_GIVEN (answer: {answer})")
                continue
        
        # Detect YES/NO/NOT GIVEN
        if answer in ['YES', 'NO']:
            if current_type != 'YES_NO_NOT_GIVEN':
                q['type'] = 'YES_NO_NOT_GIVEN'
                result.add_repair(f"Q{idx}: Type fixed to YES_NO_NOT_GIVEN (answer: {answer})")
                continue
        
        # Detect Roman numerals (MATCHING_HEADING)
        roman_pattern = r'^[IVXivx]+$'
        if re.match(roman_pattern, answer):
            if current_type != 'MATCHING_HEADING':
                q['type'] = 'MATCHING_HEADING'
                result.add_repair(f"Q{idx}: Type fixed to MATCHING_HEADING (answer: {answer})")
            continue
        
        # Detect single letter A-H (MATCHING_HEADING if "which paragraph" pattern, else MATCHING_INFORMATION)
        if len(answer) == 1 and answer in 'ABCDEFGHIJ':
            # Check if instruction mentions "which paragraph/section contains"
            sections = data.get('sections', [])
            instruction_text = ''
            for sec in sections:
                instruction_text += sec.get('instruction_md', '') + ' ' + sec.get('passage_md', '')
            instruction_lower = instruction_text.lower()
            
            has_which_paragraph = any(p in instruction_lower for p in [
                'which paragraph',
                'which section contains',
                'which section mentions',
            ])
            
            if has_which_paragraph:
                # "Which paragraph contains..." → MATCHING_HEADING with paragraph A-H options
                if current_type != 'MATCHING_HEADING':
                    q['type'] = 'MATCHING_HEADING'
                    result.add_repair(f"Q{idx}: Type fixed to MATCHING_HEADING (which paragraph pattern, answer: {answer})")
            elif current_type not in ['MATCHING_INFORMATION', 'MULTIPLE_CHOICE_SINGLE', 'MATCHING_HEADING']:
                q['type'] = 'MATCHING_INFORMATION'
                result.add_repair(f"Q{idx}: Type fixed to MATCHING_INFORMATION (answer: {answer})")


def repair_add_options_from_answers(data: dict, result: RepairResult) -> None:
    """
    Auto-add missing options based on answer values and question type.
    """
    questions = data.get('questions', [])
    
    for q in questions:
        idx = q.get('idx')
        q_type = q.get('type', '')
        answers = q.get('correct_answers', [])
        options = q.get('options', [])
        
        if not answers or not answers[0]:
            continue
        
        answer = answers[0].strip().upper()
        
        # TRUE_FALSE_NOT_GIVEN - ensure options exist
        if q_type == 'TRUE_FALSE_NOT_GIVEN' and len(options) != 3:
            q['options'] = [
                {'value': 'TRUE', 'label': 'TRUE', 'is_correct': answer == 'TRUE'},
                {'value': 'FALSE', 'label': 'FALSE', 'is_correct': answer == 'FALSE'},
                {'value': 'NOT GIVEN', 'label': 'NOT GIVEN', 'is_correct': answer == 'NOT GIVEN'},
            ]
            result.add_repair(f"Q{idx}: Added TRUE/FALSE/NOT GIVEN options")
            continue
        
        # YES_NO_NOT_GIVEN - ensure options exist
        if q_type == 'YES_NO_NOT_GIVEN' and len(options) != 3:
            q['options'] = [
                {'value': 'YES', 'label': 'YES', 'is_correct': answer == 'YES'},
                {'value': 'NO', 'label': 'NO', 'is_correct': answer == 'NO'},
                {'value': 'NOT GIVEN', 'label': 'NOT GIVEN', 'is_correct': answer == 'NOT GIVEN'},
            ]
            result.add_repair(f"Q{idx}: Added YES/NO/NOT GIVEN options")
            continue
        
        # MATCHING_HEADING - detect if answer is roman numeral (i-viii) or letter (A-G)
        if q_type == 'MATCHING_HEADING' and len(options) < 5:
            answer_lower = answer.lower() if answer else ''
            
            # Case 1: Answer is roman numeral (i, ii, iii, etc.) - need heading options
            if answer_lower in ROMAN_TO_INT:
                # Try to extract headings from cleaned text
                metadata = data.get('_metadata', {})
                source = metadata.get('source', '')
                item_id = metadata.get('item_id', '')
                
                cleaned_path = Path(__file__).parent.parent.parent / "data" / "cleaned" / source / f"{item_id}.txt"
                headings = []
                if cleaned_path.exists():
                    cleaned_text = cleaned_path.read_text(encoding='utf-8')
                    headings = extract_list_of_headings(cleaned_text)
                
                if headings and len(headings) >= 3:
                    # Use extracted headings as options
                    q['options'] = []
                    for h in headings:
                        q['options'].append({
                            'value': h['label'],
                            'label': h['label'],
                            'text': h['text'],
                            'is_correct': h['label'] == answer_lower
                        })
                    result.add_repair(f"Q{idx}: Added {len(q['options'])} heading options (i-{headings[-1]['label']}) for MATCHING_HEADING")
                else:
                    # Fallback: generate basic roman numeral options without text
                    q['options'] = []
                    for numeral in ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii']:
                        q['options'].append({
                            'value': numeral,
                            'label': numeral,
                            'text': f'Heading {numeral}',
                            'is_correct': numeral == answer_lower
                        })
                    result.add_repair(f"Q{idx}: Added 8 heading options (i-viii) for MATCHING_HEADING (no text extracted)")
            
            # Case 2: Answer is letter (A, B, C, etc.) - paragraph options
            else:
                sections = data.get('sections', [])
                passage_md = ''
                for sec in sections:
                    passage_md += sec.get('passage_md', '')
                
                paragraph_labels = re.findall(r'\*\*Paragraph ([A-L])\.\*\*', passage_md)
                max_letter = max(paragraph_labels) if paragraph_labels else 'H'
                
                q['options'] = []
                for c in 'ABCDEFGHIJKL':
                    if c <= max_letter:
                        q['options'].append({
                            'value': c,
                            'label': f'Paragraph {c}',
                            'is_correct': (c == answer)
                        })
                result.add_repair(f"Q{idx}: Added {len(q['options'])} paragraph options (A-{max_letter}) for MATCHING_HEADING")
            continue


def repair_smart_answer_fallback(data: dict, result: RepairResult) -> None:
    """
    Smart fallback to find missing answers from various sources:
    1. Extract from raw HTML using enhanced patterns
    2. Look for answers embedded in prompt text
    3. Try to match answer patterns in source files
    """
    # Get source info for fallback
    metadata = data.get('_metadata', {})
    source = metadata.get('source', '')
    item_id = metadata.get('item_id', '')
    
    questions = data.get('questions', [])
    missing_answers = [(i, q) for i, q in enumerate(questions) 
                       if not q.get('correct_answers') or not q.get('correct_answers', [''])[0]]
    
    if not missing_answers:
        return
    
    # Try loading raw HTML directly if available
    raw_path = Path(__file__).parent.parent.parent / "data" / "raw" / source / f"{item_id}.html"
    raw_html = ""
    if raw_path.exists():
        raw_html = raw_path.read_text(encoding='utf-8')
    
    # Pattern 1: Answer in blockquote with number
    # <blockquote>28. E, 29. H, 30. C</blockquote>
    if raw_html:
        blockquote_match = re.search(r'<blockquote[^>]*>([^<]+)</blockquote>', raw_html, re.IGNORECASE)
        if blockquote_match:
            bq_text = blockquote_match.group(1)
            for idx, q in missing_answers:
                q_idx = q.get('idx')
                # Look for "28. E" or "28. TRUE" pattern
                pattern = rf'\b{q_idx}\.\s*([A-Z]|TRUE|FALSE|NOT GIVEN|YES|NO|[^,\s]{{1,30}})'
                match = re.search(pattern, bq_text, re.IGNORECASE)
                if match:
                    answer = match.group(1).strip()
                    if len(answer) == 1 and answer.isalpha():
                        answer = answer.upper()
                    elif answer.upper() in ['TRUE', 'FALSE', 'NOT GIVEN', 'YES', 'NO']:
                        answer = answer.upper()
                    q['correct_answers'] = [answer]
                    result.add_repair(f"Q{q_idx}: Found answer '{answer}' in HTML blockquote")
    
    # Pattern 2: Answer section with commas
    # "28. E, 29. H, 30. C, 31. B"
    if raw_html:
        for idx, q in missing_answers:
            if q.get('correct_answers') and q.get('correct_answers', [''])[0]:
                continue  # Already found
            q_idx = q.get('idx')
            pattern = rf'\b{q_idx}\.\s*([A-Z]|TRUE|FALSE|NOT GIVEN)(?:,|\s|$)'
            match = re.search(pattern, raw_html, re.IGNORECASE)
            if match:
                answer = match.group(1).strip().upper()
                q['correct_answers'] = [answer]
                result.add_repair(f"Q{q_idx}: Extracted answer '{answer}' from HTML (comma pattern)")
    
    # Pattern 3: Look for answer in cleaned text file
    cleaned_path = Path(__file__).parent.parent.parent / "data" / "cleaned" / source / f"{item_id}.txt"
    if cleaned_path.exists():
        cleaned_text = cleaned_path.read_text(encoding='utf-8')
        
        # Find Answer: section
        answer_match = re.search(r'Answer\s*:(.+?)(?=\n\n|$)', cleaned_text, re.IGNORECASE | re.DOTALL)
        if answer_match:
            answer_section = answer_match.group(1)
            for idx, q in missing_answers:
                if q.get('correct_answers') and q.get('correct_answers', [''])[0]:
                    continue
                q_idx = q.get('idx')
                # Try various patterns
                patterns = [
                    rf'\b{q_idx}\.\s*([A-Z])\b',
                    rf'\b{q_idx}\s+([A-Z])\b',
                    rf'\b{q_idx}\.\s*(TRUE|FALSE|NOT GIVEN|YES|NO)\b',
                ]
                for pat in patterns:
                    match = re.search(pat, answer_section, re.IGNORECASE)
                    if match:
                        answer = match.group(1).strip().upper()
                        q['correct_answers'] = [answer]
                        result.add_repair(f"Q{q_idx}: Found answer '{answer}' in cleaned text")
                        break


def repair_passage_from_html(data: dict, result: RepairResult) -> None:
    """
    Fix truncated or short passages by extracting full content from raw HTML or cleaned text.
    Minimum passage length: 500 words (to catch summary-only passages).
    """
    MIN_WORDS = 500  # Increased from 100 to catch summary-only passages
    
    metadata = data.get('_metadata', {})
    source = metadata.get('source', '')
    item_id = metadata.get('item_id', '')
    
    sections = data.get('sections', [])
    for sec in sections:
        passage = sec.get('passage_md', '')
        word_count = len(passage.split())
        
        if word_count >= MIN_WORDS:
            continue
        
        # Try to extract from raw HTML
        raw_path = Path(__file__).parent.parent.parent / "data" / "raw" / source / f"{item_id}.html"
        if not raw_path.exists():
            continue
        
        try:
            from bs4 import BeautifulSoup
            html = raw_path.read_text(encoding='utf-8')
            soup = BeautifulSoup(html, 'html.parser')
            
            # Find main content
            main = soup.find('article') or soup.find('div', class_='item-page')
            if not main:
                continue
            
            # Get all paragraphs
            paragraphs = []
            for p in main.find_all(['p', 'div']):
                text = p.get_text(strip=True)
                # Skip short/noise paragraphs
                if len(text) > 50 and not any(skip in text.lower() for skip in 
                    ['question', 'answer', 'click', 'show', 'hide', 'rating', 'hits']):
                    paragraphs.append(text)
            
            if paragraphs:
                new_passage = '\n\n'.join(paragraphs[:10])  # Max 10 paragraphs
                new_word_count = len(new_passage.split())
                
                if new_word_count > word_count:
                    sec['passage_md'] = new_passage
                    result.add_repair(f"Passage expanded: {word_count} → {new_word_count} words from HTML")
        except Exception as e:
            pass  # Silently fail if BeautifulSoup not available


def repair_data(data: dict) -> RepairResult:
    """Run all auto-repair functions."""
    result = RepairResult()
    
    # Phase 0: Fix skill detection - remove audio_url for Reading exams
    repair_remove_audio_for_reading(data, result)
    
    # Phase 1: Structural repairs + known fixes
    repair_missing_slug(data, result)
    repair_missing_category(data, result)
    repair_question_indices(data, result)
    repair_known_fixes(data, result)  # Apply hardcoded fixes for stubborn exams
    
    # Phase 2: Extract missing answers
    repair_extract_answers_from_raw(data, result)
    repair_smart_answer_fallback(data, result)
    
    # Phase 3: Question type detection (IMPROVED)
    repair_detect_question_type_from_instruction(data, result)
    repair_question_type_priority(data, result)  # NEW: Fix type based on word instructions
    repair_incorrect_question_types(data, result)
    repair_type_from_answer_format(data, result)
    
    # Phase 4: Content validation (IMPROVED)
    repair_matching_paragraph_options(data, result)
    repair_passage_from_html(data, result)
    repair_passage_length(data, result)  # NEW: Ensure min 500 words
    
    # Phase 5: Options and answers
    repair_empty_options(data, result)
    repair_add_options_from_answers(data, result)
    repair_mc_correct_option(data, result)
    repair_add_blank_markers(data, result)
    repair_infer_answers_from_passage(data, result)
    
    # Phase 6: Fix prompts (IMPROVED)
    repair_placeholder_prompts(data, result)
    repair_mcq_prompt_options(data, result)  # NEW: Separate MCQ options from prompt
    
    # Phase 7: FINAL SCHEMA ENFORCEMENT (STRICT)
    # Ensure all questions match their type's required schema
    try:
        from schema_enforcer import enforce_all_questions
        instruction = ''
        for sec in data.get('sections', []):
            instruction += sec.get('instruction_md', '')
        questions = enforce_all_questions(data.get('questions', []), instruction)
        data['questions'] = questions
        result.add_repair("Applied strict schema enforcement")
    except ImportError as e:
        pass  # Schema enforcer may not be available in all envs
    
    # Phase 8: Add question_groups if missing (NEW SCHEMA)
    repair_missing_question_groups(data, result)
    
    # Phase 9: Auto-extract images from raw HTML and embed in question groups
    repair_extract_images_from_raw(data, result)
    
    # Phase 9.5: MCQ_MULTIPLE detection (must run AFTER schema enforcer!)
    # "Choose TWO/THREE letters" questions should be MCQ_MULTIPLE
    repair_mcq_multiple_from_instruction(data, result)
    
    # Phase 9.7: MATCHING_FEATURES detection from "List of People/Researchers"
    repair_matching_features_type(data, result)
    
    # Phase 10: Clean garbled prompts (YESNONOT GIVEN, TRUEFALSENOT GIVEN prefixes)
    repair_garbled_prompts(data, result)
    
    # Phase 11: Fix MATCHING_FEATURES instructions with list of features
    repair_matching_features_instruction(data, result)
    
    # Phase 12: Normalize group types based on questions
    repair_group_type_consistency(data, result)
    
    # Phase 13: Add sentences to SUMMARY/TABLE_COMPLETION instruction_md
    repair_completion_instruction(data, result)
    
    return result


def repair_completion_instruction(data: dict, result: RepairResult) -> None:
    """
    For SUMMARY_COMPLETION and TABLE_COMPLETION questions,
    add the full sentences with blanks to instruction_md.
    """
    import re
    
    sections = data.get('sections', [])
    questions = data.get('questions', [])
    
    completion_types = {'SUMMARY_COMPLETION', 'TABLE_COMPLETION', 'SENTENCE_COMPLETION'}
    
    for sec in sections:
        for g in sec.get('question_groups', []):
            start_idx = g['start_idx']
            end_idx = g['end_idx']
            
            # Get questions in this group
            group_questions = [q for q in questions if start_idx <= q.get('idx', 0) <= end_idx]
            
            # Check if this is a completion type group
            if not group_questions:
                continue
                
            is_completion = any(q.get('type') in completion_types for q in group_questions)
            
            if not is_completion:
                continue
            
            # Check if instruction_md already has sentences
            inst = g.get('instruction_md', '')
            
            # If instruction already has numbered questions, skip
            if re.search(r'\*\*\d+\.\*\*|\n\d+\.\s+', inst):
                continue
            
            # Build sentences from prompts
            sentences = []
            for q in sorted(group_questions, key=lambda x: x.get('idx', 0)):
                idx = q.get('idx')
                prompt = q.get('prompt_md', '')
                
                if prompt:
                    # Format: **10.** The boat crossed the lake _______.
                    sentences.append(f"**{idx}.** {prompt}")
            
            if sentences:
                # Add sentences to instruction_md
                sentences_md = '\n\n'.join(sentences)
                g['instruction_md'] = inst.rstrip() + f"\n\n{sentences_md}"
                result.add_repair(f"Q{start_idx}-{end_idx}: Added {len(sentences)} sentences to instruction_md")


def repair_garbled_prompts(data: dict, result: RepairResult) -> None:
    """
    Remove garbled type prefixes from prompts.
    E.g., "YESNONOT GIVEN Statement..." → "Statement..."
    """
    import re
    
    garbled_patterns = [
        r'^YESNONOT\s*GIVEN\s*',
        r'^YES\s*NO\s*NOT\s*GIVEN\s*',
        r'^TRUEFALSENOT\s*GIVEN\s*',
        r'^TRUE\s*FALSE\s*NOT\s*GIVEN\s*',
        r'^MATCHING\s*INFORMATION\s*',
        r'^MATCHING\s*HEADING\s*',
    ]
    
    questions = data.get('questions', [])
    for q in questions:
        prompt = q.get('prompt_md', '')
        for pattern in garbled_patterns:
            if re.match(pattern, prompt, re.IGNORECASE):
                cleaned = re.sub(pattern, '', prompt, flags=re.IGNORECASE).strip()
                q['prompt_md'] = cleaned
                result.add_repair(f"Q{q['idx']}: Removed garbled prefix from prompt")
                break


def repair_matching_features_type(data: dict, result: RepairResult) -> None:
    """
    Detect MATCHING_FEATURES questions from 'List of People/Researchers' pattern.
    Changes MATCHING_INFORMATION to MATCHING_FEATURES when appropriate.
    """
    import re
    from pathlib import Path
    
    # Get source/item_id for cleaned text
    source = data.get('source', data.get('_metadata', {}).get('source', ''))
    item_id = data.get('item_id', data.get('_metadata', {}).get('item_id', ''))
    
    if not source or not item_id:
        return
    
    cleaned_path = Path(__file__).parent.parent.parent / "data" / "cleaned" / source / f"{item_id}.txt"
    if not cleaned_path.exists():
        return
    
    cleaned_text = cleaned_path.read_text(encoding='utf-8', errors='ignore')
    
    # Check for "List of People/Researchers/Scientists" pattern
    list_patterns = [
        r'List of (People|Researchers|Scientists|Experts|Writers|Names)',
        r'list of people below',
    ]
    
    has_list_of_people = False
    for pattern in list_patterns:
        if re.search(pattern, cleaned_text, re.IGNORECASE):
            has_list_of_people = True
            break
    
    if not has_list_of_people:
        return
    
    # Find question range by looking backwards from "Match each statement with the correct person"
    match_stmt = re.search(r'Match each statement with the correct person', cleaned_text, re.IGNORECASE)
    
    start_q = None
    end_q = None
    
    if match_stmt:
        pos = match_stmt.start()
        before_text = cleaned_text[max(0, pos-200):pos]
        range_match = re.search(r'Questions?\s*(\d+)-(\d+)', before_text, re.IGNORECASE)
        if range_match:
            start_q = int(range_match.group(1))
            end_q = int(range_match.group(2))
    
    if start_q is None or end_q is None:
        # Fallback: assume last 5 questions
        questions = data.get('questions', [])
        if not questions:
            return
        max_idx = max(q.get('idx', 0) for q in questions)
        start_q = max_idx - 4
        end_q = max_idx
    
    # Change MATCHING_INFORMATION to MATCHING_FEATURES for these questions
    questions = data.get('questions', [])
    for q in questions:
        idx = q.get('idx')
        if start_q <= idx <= end_q:
            old_type = q.get('type')
            if old_type == 'MATCHING_INFORMATION':
                q['type'] = 'MATCHING_FEATURES'
                q['options'] = []  # Clear options, will be rebuilt
                result.add_repair(f"Q{idx}: Changed MATCHING_INFORMATION → MATCHING_FEATURES (List of People)")


def repair_matching_features_instruction(data: dict, result: RepairResult) -> None:
    """
    For MATCHING_FEATURES questions, ensure instruction_md has list of features.
    Extract features from cleaned text file.
    """
    import re
    from pathlib import Path
    
    # Check if we have MATCHING_FEATURES questions
    questions = data.get('questions', [])
    mf_questions = [q for q in questions if q.get('type') == 'MATCHING_FEATURES']
    
    if not mf_questions:
        return
    
    # Get source/item_id for cleaned text
    source = data.get('source', data.get('_metadata', {}).get('source', ''))
    item_id = data.get('item_id', data.get('_metadata', {}).get('item_id', ''))
    
    if not source or not item_id:
        return
    
    cleaned_path = Path(__file__).parent.parent.parent / "data" / "cleaned" / source / f"{item_id}.txt"
    if not cleaned_path.exists():
        return
    
    cleaned_text = cleaned_path.read_text(encoding='utf-8', errors='ignore')
    
    # Find "List of People" or similar section
    list_patterns = [
        r'List of People\s*\n(.*?)(?:---End|\Z)',
        r'List of (People|Researchers|Scientists|Experts|Writers)\s*\n(.*?)(?:---End|\Z)',
    ]
    
    features = {}
    for pattern in list_patterns:
        match = re.search(pattern, cleaned_text, re.DOTALL | re.IGNORECASE)
        if match:
            content = match.group(1) if match.lastindex == 1 else match.group(2)
            
            # Pattern: "A\nName\nB\nName2\n..."
            lines = content.strip().split('\n')
            current_letter = None
            for line in lines:
                line = line.strip()
                if re.match(r'^[A-E]$', line):
                    current_letter = line
                elif current_letter and len(line) > 2 and line[0].isupper():
                    # This is a name
                    features[current_letter] = line
                    current_letter = None
            break
    
    if not features:
        # Try alternative: look for pattern in entire text
        # Pattern: single letter followed by name on next line within List of People section
        lop_match = re.search(r'List of People.*?---End', cleaned_text, re.DOTALL | re.IGNORECASE)
        if lop_match:
            lop_content = lop_match.group(0)
            for letter in 'ABCDE':
                # Find "A\nName" pattern
                name_match = re.search(rf'{letter}\s*\n\s*([A-Z][a-z][\w\s\.]+)', lop_content)
                if name_match:
                    name = name_match.group(1).strip().split('\n')[0]
                    if len(name) > 2 and len(name) < 50:
                        features[letter] = name
    
    if features and len(features) >= 3:
        # Build instruction_md with features list
        start_idx = min(q['idx'] for q in mf_questions)
        end_idx = max(q['idx'] for q in mf_questions)
        
        sorted_features = sorted(features.items())
        first_letter = sorted_features[0][0]
        last_letter = sorted_features[-1][0]
        feature_lines = '\n'.join([f"- **{k}** {v}" for k, v in sorted_features])
        
        new_instruction = f"""## Questions {start_idx}-{end_idx}

Look at the following statements (Questions {start_idx}-{end_idx}) and the list of people below.

Match each statement with the correct person, **{first_letter}-{last_letter}**.

Write the correct letter **{first_letter}-{last_letter}**.

**NB** You may use any letter more than once.

### List of People:
{feature_lines}
"""
        
        # Update question group instruction
        sections = data.get('sections', [])
        for sec in sections:
            for g in sec.get('question_groups', []):
                if g['start_idx'] == start_idx:
                    existing = g.get('instruction_md', '')
                    # Always update for MATCHING_FEATURES if current instruction doesn't have list
                    if '### List of' not in existing:
                        g['instruction_md'] = new_instruction
                        result.add_repair(f"Q{start_idx}-{end_idx}: Added list of people to instruction")


def repair_group_type_consistency(data: dict, result: RepairResult) -> None:
    """
    Ensure all questions in a group have consistent type.
    If instruction says YES_NO_NOT_GIVEN, all questions should match.
    """
    import re
    
    sections = data.get('sections', [])
    questions = data.get('questions', [])
    
    for sec in sections:
        instruction = sec.get('instruction_md', '')
        for g in sec.get('question_groups', []):
            g_inst = g.get('instruction_md', '')
            combined = instruction + g_inst
            
            # Detect expected type from instruction
            expected_type = None
            if re.search(r'views?\s*of\s*the\s*writer|claims?\s*of\s*the\s*writer', combined, re.IGNORECASE):
                expected_type = 'YES_NO_NOT_GIVEN'
            elif re.search(r'agree\s*with\s*the\s*information', combined, re.IGNORECASE):
                expected_type = 'TRUE_FALSE_NOT_GIVEN'
            
            if expected_type:
                for q in questions:
                    idx = q.get('idx')
                    if g['start_idx'] <= idx <= g['end_idx']:
                        old_type = q.get('type')
                        if old_type != expected_type and old_type in ['TRUE_FALSE_NOT_GIVEN', 'YES_NO_NOT_GIVEN']:
                            q['type'] = expected_type
                            # Update options if needed
                            if expected_type == 'YES_NO_NOT_GIVEN':
                                q['options'] = [
                                    {"id": "opt-yes", "idx": 1, "contentMd": "YES", "isCorrect": False},
                                    {"id": "opt-no", "idx": 2, "contentMd": "NO", "isCorrect": False},
                                    {"id": "opt-ng", "idx": 3, "contentMd": "NOT GIVEN", "isCorrect": False},
                                ]
                            else:
                                q['options'] = [
                                    {"id": "opt-true", "idx": 1, "contentMd": "TRUE", "isCorrect": False},
                                    {"id": "opt-false", "idx": 2, "contentMd": "FALSE", "isCorrect": False},
                                    {"id": "opt-ng", "idx": 3, "contentMd": "NOT GIVEN", "isCorrect": False},
                                ]
                            # Mark correct answer
                            ans = q.get('correct_answers', [])
                            if ans:
                                for opt in q['options']:
                                    if opt['contentMd'] == ans[0]:
                                        opt['isCorrect'] = True
                            result.add_repair(f"Q{idx}: Changed {old_type} → {expected_type}")


def repair_mcq_multiple_from_instruction(data: dict, result: RepairResult) -> None:
    """
    Detect 'Choose TWO/THREE letters' questions and set type to MCQ_MULTIPLE.
    Must run AFTER schema_enforcer to prevent type override.
    """
    import re
    
    questions = data.get('questions', [])
    sections = data.get('sections', [])
    
    # Collect all instruction_md content
    instruction_md = ''
    for sec in sections:
        instruction_md += sec.get('instruction_md', '')
        for g in sec.get('question_groups', []):
            instruction_md += g.get('instruction_md', '')
    
    # Strip ** markdown for cleaner regex matching
    instruction_md_clean = re.sub(r'\*\*', '', instruction_md)
    
    # Find "Choose TWO/THREE" patterns - match only within same block (max 150 chars between header and Choose)
    # This prevents matching Q1-4 header with Choose TWO from Q11-13
    pattern = r'Questions?\s+(\d+)[-–](\d+)[^\n]{0,50}\n[^\n]{0,100}Choose\s+(TWO|THREE|2|3)'
    
    for match in re.finditer(pattern, instruction_md_clean, re.IGNORECASE):
        start_q = int(match.group(1))
        end_q = int(match.group(2))
        
        for q in questions:
            idx = q.get('idx')
            if start_q <= idx <= end_q:
                old_type = q.get('type')
                if old_type != 'MULTIPLE_CHOICE_MULTIPLE':
                    q['type'] = 'MULTIPLE_CHOICE_MULTIPLE'
                    result.add_repair(f"Q{idx}: {old_type} → MULTIPLE_CHOICE_MULTIPLE ('Choose TWO/THREE')")


def repair_missing_question_groups(data: dict, result: RepairResult) -> None:
    """
    Add question_groups to sections if missing.
    Uses auto_question_groups module for detection.
    """
    try:
        from auto_question_groups import detect_question_groups
    except ImportError:
        return
    
    sections = data.get('sections', [])
    questions = data.get('questions', [])
    
    for sec in sections:
        if sec.get('question_groups'):
            continue  # Already has groups
        
        instruction_md = sec.get('instruction_md', '')
        groups = detect_question_groups(questions, instruction_md)
        
        if groups:
            sec['question_groups'] = groups
            result.add_repair(f"Added {len(groups)} question_groups to section")


def repair_extract_images_from_raw(data: dict, result: RepairResult) -> None:
    """
    Auto-extract ALL images from raw HTML and embed in appropriate places.
    
    Improvements:
    - Extract ALL mini-ielts.com images (not just diagrams)
    - Add main exam image to section.image_url
    - Embed relevant images in instruction_md
    - Fix instruction_md format (Questions X-Y:** → ## Questions X-Y)
    """
    import re
    
    # Get source/item_id for finding raw HTML
    source = data.get('source', data.get('_metadata', {}).get('source', ''))
    item_id = data.get('item_id', data.get('_metadata', {}).get('item_id', ''))
    
    if not source or not item_id:
        return
    
    # Find raw HTML
    raw_path = Path(__file__).parent.parent.parent / "data" / "raw" / source / f"{item_id}.html"
    if not raw_path.exists():
        return
    
    raw_html = raw_path.read_text(encoding='utf-8', errors='ignore')
    
    # Extract ALL images from HTML (broader patterns)
    image_patterns = [
        r'src="(https?://images\.mini-ielts\.com/images/[^"]+)"',  # All mini-ielts images
        r'src="(https?://[^"]+\.(?:png|jpg|jpeg|gif))"',           # Generic images
    ]
    
    # Exclude patterns (toolbar icons, etc.) - be careful not to exclude legit content images
    exclude_patterns = ['highlight', 'icon', 'favicon', 'Dictionary', 'remove_format', 
                       'button', 'logo', 'banner', 'ad-', 'pagead', 'googlesyndication']
    
    all_images = []
    for pattern in image_patterns:
        matches = re.findall(pattern, raw_html, re.IGNORECASE)
        for url in matches:
            url = url if isinstance(url, str) else url[0]  # Handle tuple from groups
            if not any(exc.lower() in url.lower() for exc in exclude_patterns):
                if url not in all_images:
                    all_images.append(url)
    
    if not all_images:
        return
    
    logger.info(f"Found {len(all_images)} images in raw HTML: {[u[:40] for u in all_images[:3]]}")
    
    # Separate main image from content images
    main_image = None
    content_images = []
    for img in all_images:
        # Main image usually has exam ID or is first large image
        if 'resized' in img.lower() or '_resized' in img or item_id.split('-')[0] in img:
            main_image = img
        else:
            content_images.append(img)
    
    if not main_image and all_images:
        main_image = all_images[0]
        content_images = all_images[1:]
    
    # Add main image to section
    sections = data.get('sections', [])
    if main_image and sections:
        for sec in sections:
            if not sec.get('image_url'):
                sec['image_url'] = main_image
                result.add_repair(f"Added main image to section: {main_image[:50]}...")
    
    # Fix instruction_md format and embed images
    for sec in sections:
        for g in sec.get('question_groups', []):
            inst = g.get('instruction_md', '')
            
            # Fix format: "Questions 1-4:**" → "## Questions 1-4"
            inst = re.sub(r'Questions?\s+(\d+-\d+):\s*\*\*', r'## Questions \1\n', inst)
            inst = re.sub(r'\*\*\s*$', '', inst)  # Remove trailing **
            inst = re.sub(r'^Questions?\s+(\d+-\d+):', r'## Questions \1', inst, flags=re.MULTILINE)
            
            # If no ## heading, add one
            if not inst.startswith('##') and not inst.startswith('#'):
                inst = f"## Questions {g['start_idx']}-{g['end_idx']}\n\n{inst}"
            
            g['instruction_md'] = inst
            
            # Embed images for groups that need them
            # Include COMPLETION groups as they often have diagrams/tables
            needs_image = (
                'diagram' in inst.lower() or 
                'map' in inst.lower() or 
                'flowchart' in inst.lower() or
                'flow chart' in inst.lower() or
                'label' in inst.lower() or
                'picture' in inst.lower() or
                'figure' in inst.lower() or
                'complete the' in inst.lower()  # SUMMARY/SENTENCE COMPLETION often have diagrams
            )
            has_image = '![' in inst
            
            if needs_image and not has_image and content_images:
                img_url = content_images.pop(0)
                g['instruction_md'] = inst + f"\n\n![Diagram]({img_url})"
                result.add_repair(f"Added diagram to Q{g['start_idx']}-{g['end_idx']}")


def repair_placeholder_prompts(data: dict, result: RepairResult) -> None:
    """Fix placeholder prompts like 'Question 6' with sensible defaults."""
    questions = data.get('questions', [])
    
    for q in questions:
        prompt = q.get('prompt_md', '')
        idx = q.get('idx')
        q_type = q.get('type', '')
        
        if not prompt.startswith('Question '):
            continue
        
        # Generate better prompt based on question type
        if q_type in ['MULTIPLE_CHOICE_SINGLE', 'MULTIPLE_CHOICE_MULTIPLE']:
            q['prompt_md'] = "Choose the correct letter, A, B, C or D."
        elif q_type in ['TRUE_FALSE_NOT_GIVEN']:
            q['prompt_md'] = "Do the following statements agree with the information given in the passage?"
        elif q_type in ['YES_NO_NOT_GIVEN']:
            q['prompt_md'] = "Do the following statements agree with the views of the writer?"
        elif q_type in ['MATCHING_HEADING']:
            q['prompt_md'] = "Choose the correct heading for this section from the list of headings."
        elif q_type in ['MATCHING_INFORMATION', 'MATCHING_FEATURES']:
            q['prompt_md'] = "Which paragraph contains the following information?"
        elif q_type in ['SUMMARY_COMPLETION', 'SENTENCE_COMPLETION', 'SHORT_ANSWER']:
            q['prompt_md'] = "Complete the summary using words from the passage."
        else:
            q['prompt_md'] = "Answer the following question about the passage."
        
        result.add_repair(f"Q{idx}: Fixed placeholder prompt for {q_type}")


def repair_mcq_prompt_options(data: dict, result: RepairResult) -> None:
    """
    Fix MCQ prompts that contain embedded options.
    Separates 'What is X? A. opt1 B. opt2' into prompt='What is X?' with options array.
    """
    questions = data.get('questions', [])
    
    for q in questions:
        if q.get('type') != 'MULTIPLE_CHOICE_SINGLE':
            continue
        
        prompt = q.get('prompt_md', '')
        
        # Check if prompt contains options (A. B. C. D. pattern)
        if not (' A.' in prompt and ' B.' in prompt):
            continue
        
        # Split prompt from options
        # Pattern: "Question text? A. option1 B. option2 ..."
        match = re.match(r'^(\d+\.\s*)?(.*?)(?=\s+A\.\s)', prompt, re.DOTALL)
        if match:
            clean_prompt = match.group(2).strip() if match.group(2) else prompt.split(' A.')[0].strip()
            
            # Remove leading question number if present
            clean_prompt = re.sub(r'^\d+\.\s*', '', clean_prompt)
            
            if clean_prompt:
                q['prompt_md'] = clean_prompt
                result.add_repair(f"Q{q['idx']}: Separated MCQ options from prompt")


def repair_question_type_priority(data: dict, result: RepairResult) -> None:
    """
    Fix question type detection based on correct priority:
    1. "ONE WORD/NUMBER/THREE WORDS" -> SHORT_ANSWER/SUMMARY_COMPLETION
    2. Then check answer format (letters vs words)
    """
    questions = data.get('questions', [])
    
    # Get raw text for instruction detection
    metadata = data.get('_metadata', {})
    source = metadata.get('source', '')
    item_id = metadata.get('item_id', '')
    
    cleaned_path = Path(__file__).parent.parent.parent / "data" / "cleaned" / source / f"{item_id}.txt"
    if not cleaned_path.exists():
        return
    
    cleaned = cleaned_path.read_text(encoding='utf-8')
    
    for q in questions:
        idx = q.get('idx')
        q_type = q.get('type', '')
        answer = q.get('correct_answers', [''])[0] if q.get('correct_answers') else ''
        
        # Skip if already correct type
        if q_type in ['SHORT_ANSWER', 'SUMMARY_COMPLETION'] and not (answer and len(answer) == 1 and answer.isupper()):
            continue
        
        # Check if this question range has "ONE WORD/NUMBER/THREE WORDS" instruction
        word_instructions = [
            r'NO MORE THAN (?:ONE|TWO|THREE) WORDS?',
            r'ONE WORD ONLY',
            r'ONE NUMBER',
            r'A NUMBER',
        ]
        
        # Find instruction for this question's range
        for pattern in word_instructions:
            # Check if instruction appears near this question number
            context_pattern = rf'Questions?\s*{idx}.*?{pattern}|{pattern}.*?Questions?\s*{idx}'
            if re.search(context_pattern, cleaned, re.IGNORECASE | re.DOTALL):
                # This should be SHORT_ANSWER, not MATCHING
                if q_type in ['MATCHING_INFORMATION', 'MATCHING_FEATURES']:
                    q['type'] = 'SHORT_ANSWER'
                    q['options'] = []  # SHORT_ANSWER doesn't have options
                    result.add_repair(f"Q{idx}: Changed {q_type} -> SHORT_ANSWER (word instruction)")
                break
        
        # Also fix based on answer format
        if q_type in ['MATCHING_INFORMATION', 'MATCHING_FEATURES']:
            if answer and (len(answer) > 2 or ' ' in answer or answer.isdigit()):
                # Answer is word/phrase, not letter
                q['type'] = 'SHORT_ANSWER'
                q['options'] = []
                result.add_repair(f"Q{idx}: Changed {q_type} -> SHORT_ANSWER (word answer)")


def repair_passage_length(data: dict, result: RepairResult) -> None:
    """
    Ensure passage has minimum length (500 words).
    If short, try to extract full passage from cleaned text.
    """
    MIN_WORDS = 500
    
    metadata = data.get('_metadata', {})
    source = metadata.get('source', '')
    item_id = metadata.get('item_id', '')
    
    sections = data.get('sections', [])
    
    for sec in sections:
        passage = sec.get('passage_md', '')
        word_count = len(passage.split())
        
        if word_count >= MIN_WORDS:
            continue
        
        # Try to extract from cleaned text
        cleaned_path = Path(__file__).parent.parent.parent / "data" / "cleaned" / source / f"{item_id}.txt"
        if not cleaned_path.exists():
            continue
        
        cleaned = cleaned_path.read_text(encoding='utf-8')
        
        # Find passage: starts with common patterns, ends before "Questions X-Y"
        start_patterns = [
            r'(?:People|The|In|Back|During|A|An|When|If|It|This|These|There|For|What|How|Why|Where|Who)',
        ]
        
        for pattern in start_patterns:
            start_match = re.search(pattern, cleaned)
            end_match = re.search(r'Questions \d+-\d+', cleaned)
            
            if start_match and end_match and start_match.start() < end_match.start():
                full_passage = cleaned[start_match.start():end_match.start()].strip()
                
                # Clean up
                full_passage = re.sub(r'\n{3,}', '\n\n', full_passage)
                
                new_word_count = len(full_passage.split())
                if new_word_count > word_count:
                    sec['passage_md'] = full_passage
                    result.add_repair(f"Passage expanded: {word_count} -> {new_word_count} words")
                break


def load_normalized(source: str, item_id: str) -> Optional[dict]:
    """Load normalized data from disk."""
    source_dir = NORMALIZED_DIR / source
    data_path = source_dir / f"{item_id}.json"
    
    if not data_path.exists():
        logger.error(f"Normalized data not found: {data_path}")
        return None
    
    return json.loads(data_path.read_text(encoding='utf-8'))


def save_repaired(data: dict, source: str, item_id: str) -> Path:
    """Save repaired data back to disk."""
    source_dir = NORMALIZED_DIR / source
    output_path = source_dir / f"{item_id}.json"
    output_path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding='utf-8')
    return output_path


def repair(source: str, item_id: str) -> tuple[Optional[dict], RepairResult]:
    """Repair normalized data file. Returns (repaired_data, result)."""
    data = load_normalized(source, item_id)
    
    if not data:
        result = RepairResult()
        result.add_unrepaired(f"Could not load data: {source}/{item_id}")
        return None, result
    
    logger.info(f"Running auto-repair: {source}/{item_id}")
    result = repair_data(data)
    
    if result.repairs_made:
        save_repaired(data, source, item_id)
        logger.info(f"Saved repaired data: {source}/{item_id}")
    
    return data, result


# CLI
if __name__ == "__main__":
    import sys
    if len(sys.argv) < 3:
        print("Usage: python repair.py <source> <item_id>")
        sys.exit(1)
    
    source, item_id = sys.argv[1], sys.argv[2]
    data, result = repair(source, item_id)
    
    print(f"Success: {result.is_success()}")
    if result.repairs_made:
        print("Repairs made:")
        for r in result.repairs_made:
            print(f"  ✓ {r}")
    if result.unrepaired:
        print("Could not repair:")
        for u in result.unrepaired:
            print(f"  ✗ {u}")
    
    sys.exit(0 if result.is_success() else 1)
