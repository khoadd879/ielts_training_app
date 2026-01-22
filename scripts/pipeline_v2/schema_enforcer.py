#!/usr/bin/env python3
"""
Schema Enforcer - Ensures consistent output per question type
Based on /ielts-data-format workflow rules

STRICT RULES:
| Type                    | Options                  | MatchPairs                    |
|-------------------------|--------------------------|-------------------------------|
| TRUE_FALSE_NOT_GIVEN    | [TRUE, FALSE, NOT GIVEN] | null                          |
| YES_NO_NOT_GIVEN        | [YES, NO, NOT GIVEN]     | null                          |
| MULTIPLE_CHOICE_SINGLE  | [A., B., C., D.]         | null                          |
| MULTIPLE_CHOICE_MULTIPLE| [A., B., C., D., E.]     | null                          |
| MATCHING_HEADING        | [i., ii., iii... headings]| {key: [value, fullLabel]}    |
| MATCHING_INFORMATION    | []                       | {key: [letter]}               |
| MATCHING_FEATURES       | []                       | {key: [fullLabel, letter]}    |
| MATCHING_ENDINGS        | []                       | {key: [letter]}               |
| SUMMARY_COMPLETION      | []                       | null (use blankAcceptTexts)   |
| SHORT_ANSWER            | []                       | null (use shortAnswerAcceptTexts)|
"""
import re
from typing import Dict, List, Any, Optional
import logging

logger = logging.getLogger(__name__)


def enforce_schema(question: Dict, answer: str = '') -> Dict:
    """
    Enforce strict schema rules for a question.
    Returns the question with correct fields based on type.
    """
    q_type = question.get('type', '')
    idx = question.get('idx', 0)
    
    # Get answer from various sources
    if not answer:
        answer = question.get('correct_answer', '')
    if not answer and question.get('correct_answers'):
        answer = question['correct_answers'][0] if question['correct_answers'] else ''
    
    # Apply type-specific schema enforcement
    if q_type == 'TRUE_FALSE_NOT_GIVEN':
        question = _enforce_tfng(question, answer)
    elif q_type == 'YES_NO_NOT_GIVEN':
        question = _enforce_ynng(question, answer)
    elif q_type == 'MULTIPLE_CHOICE_SINGLE':
        question = _enforce_mcq_single(question, answer)
    elif q_type == 'MULTIPLE_CHOICE_MULTIPLE':
        question = _enforce_mcq_multiple(question, answer)
    elif q_type == 'MATCHING_HEADING':
        question = _enforce_matching_heading(question, answer)
    elif q_type == 'MATCHING_INFORMATION':
        question = _enforce_matching_information(question, answer)
    elif q_type == 'MATCHING_FEATURES':
        question = _enforce_matching_features(question, answer)
    elif q_type == 'MATCHING_ENDINGS':
        question = _enforce_matching_endings(question, answer)
    elif q_type in ['SUMMARY_COMPLETION', 'SENTENCE_COMPLETION', 'NOTE_COMPLETION', 
                     'TABLE_COMPLETION', 'FORM_COMPLETION', 'DIAGRAM_LABEL']:
        question = _enforce_completion(question, answer)
    elif q_type == 'SHORT_ANSWER':
        question = _enforce_short_answer(question, answer)
    
    return question


def _enforce_tfng(q: Dict, answer: str) -> Dict:
    """TRUE_FALSE_NOT_GIVEN: options = [TRUE, FALSE, NOT GIVEN], matchPairs = null"""
    q['options'] = [
        {'value': 'TRUE', 'label': 'TRUE', 'is_correct': answer == 'TRUE'},
        {'value': 'FALSE', 'label': 'FALSE', 'is_correct': answer == 'FALSE'},
        {'value': 'NOT GIVEN', 'label': 'NOT GIVEN', 'is_correct': answer == 'NOT GIVEN'},
    ]
    q['matchPairs'] = None
    q['correct_answers'] = [answer] if answer else []
    return q


def _enforce_ynng(q: Dict, answer: str) -> Dict:
    """YES_NO_NOT_GIVEN: options = [YES, NO, NOT GIVEN], matchPairs = null"""
    q['options'] = [
        {'value': 'YES', 'label': 'YES', 'is_correct': answer == 'YES'},
        {'value': 'NO', 'label': 'NO', 'is_correct': answer == 'NO'},
        {'value': 'NOT GIVEN', 'label': 'NOT GIVEN', 'is_correct': answer == 'NOT GIVEN'},
    ]
    q['matchPairs'] = None
    q['correct_answers'] = [answer] if answer else []
    return q


def _enforce_mcq_single(q: Dict, answer: str) -> Dict:
    """MULTIPLE_CHOICE_SINGLE: options = [A-D with labels], matchPairs = null"""
    # Keep existing options if they have labels
    options = q.get('options', [])
    if options and any(len(opt.get('label', '')) > 2 for opt in options):
        # Options have labels, just update is_correct
        for opt in options:
            opt_val = opt.get('value', '').upper()
            opt['is_correct'] = (opt_val == answer.upper())
        q['options'] = options
    else:
        # Generate default A-D options
        q['options'] = [
            {'value': 'A', 'label': 'A', 'is_correct': answer.upper() == 'A'},
            {'value': 'B', 'label': 'B', 'is_correct': answer.upper() == 'B'},
            {'value': 'C', 'label': 'C', 'is_correct': answer.upper() == 'C'},
            {'value': 'D', 'label': 'D', 'is_correct': answer.upper() == 'D'},
        ]
    q['matchPairs'] = None
    q['correct_answers'] = [answer] if answer else []
    return q


def _enforce_mcq_multiple(q: Dict, answer: str) -> Dict:
    """MULTIPLE_CHOICE_MULTIPLE: options with multiple is_correct=true"""
    options = q.get('options', [])
    # Parse answer like "A, B" or "C,E"
    correct_letters = set(re.findall(r'[A-E]', answer.upper())) if answer else set()
    
    if options and any(len(opt.get('label', '')) > 2 for opt in options):
        for opt in options:
            opt_val = opt.get('value', '').upper()
            opt['is_correct'] = (opt_val in correct_letters)
        q['options'] = options
    else:
        q['options'] = [
            {'value': 'A', 'label': 'A', 'is_correct': 'A' in correct_letters},
            {'value': 'B', 'label': 'B', 'is_correct': 'B' in correct_letters},
            {'value': 'C', 'label': 'C', 'is_correct': 'C' in correct_letters},
            {'value': 'D', 'label': 'D', 'is_correct': 'D' in correct_letters},
            {'value': 'E', 'label': 'E', 'is_correct': 'E' in correct_letters},
        ]
    q['matchPairs'] = None
    q['correct_answers'] = list(correct_letters) if correct_letters else []
    return q


def _enforce_matching_heading(q: Dict, answer: str) -> Dict:
    """
    MATCHING_HEADING: options = [i., ii., iii... with heading text], matchPairs = {key: [value, fullLabel]}
    Used for: "Match heading to section" with Roman numeral headings
    """
    idx = q.get('idx', 0)
    options = q.get('options', [])
    
    # Validate: options should have Roman numeral format (i., ii., iii...)
    # If options have headings, keep them
    if options and any('.' in str(opt.get('label', '')) for opt in options):
        for opt in options:
            opt_val = opt.get('value', '').lower()
            opt['is_correct'] = (opt_val == answer.lower())
        q['options'] = options
    
    # Set matchPairs
    correct_label = ''
    for opt in q.get('options', []):
        if opt.get('is_correct'):
            correct_label = opt.get('label', '')
            break
    
    q['matchPairs'] = {f"heading-q{idx}": [answer.lower(), correct_label]} if answer else None
    q['correct_answers'] = [answer] if answer else []
    return q


def _enforce_matching_information(q: Dict, answer: str) -> Dict:
    """
    MATCHING_INFORMATION: options = [], matchPairs = {key: [letter]}
    Used for: "Which paragraph contains..." - answer is uppercase letter A-J
    Frontend: Letter input (A-J)
    """
    idx = q.get('idx', 0)
    q['options'] = []  # MUST be empty
    q['matchPairs'] = {f"info-q{idx}": [answer.upper()]} if answer else None
    q['correct_answers'] = [answer.upper()] if answer else []
    return q


def _enforce_matching_features(q: Dict, answer: str) -> Dict:
    """
    MATCHING_FEATURES: options = [], matchPairs = {key: [fullLabel, letter]}
    Used for: "Match statement to person A-D"
    Frontend: Letter input (A-D)
    """
    idx = q.get('idx', 0)
    # Try to get full label from existing matchPairs or options
    full_label = ''
    existing_pairs = q.get('matchPairs', {})
    if existing_pairs:
        for k, v in existing_pairs.items():
            if isinstance(v, list) and len(v) >= 2:
                full_label = v[0]
                break
    
    q['options'] = []  # MUST be empty
    if full_label:
        q['matchPairs'] = {f"feature-q{idx}": [full_label, answer.upper()]} if answer else None
    else:
        q['matchPairs'] = {f"feature-q{idx}": [answer.upper()]} if answer else None
    q['correct_answers'] = [answer.upper()] if answer else []
    return q


def _enforce_matching_endings(q: Dict, answer: str) -> Dict:
    """
    MATCHING_ENDINGS: options = [], matchPairs = {key: [letter]}
    Frontend: Letter input (A-H)
    """
    idx = q.get('idx', 0)
    q['options'] = []  # MUST be empty
    q['matchPairs'] = {f"ending-q{idx}": [answer.upper()]} if answer else None
    q['correct_answers'] = [answer.upper()] if answer else []
    return q


def _enforce_completion(q: Dict, answer: str) -> Dict:
    """
    SUMMARY_COMPLETION and similar: options = [], use blankAcceptTexts
    Frontend: Text input with blank markers
    """
    idx = q.get('idx', 0)
    q['options'] = []  # MUST be empty
    q['matchPairs'] = None
    
    # Set blankAcceptTexts
    if answer:
        q['blankAcceptTexts'] = {"0": [answer]}
        q['correct_answers'] = [answer]
    
    # REMOVE leading number from prompt (e.g., "11. The dingo..." -> "The dingo...")
    prompt = q.get('prompt_md', '')
    prompt = re.sub(r'^\d+\.\s*', '', prompt)
    
    # Ensure prompt has blank marker
    if prompt and not re.search(r'_{3,}', prompt):
        prompt = prompt.rstrip('.') + ' _______.'
    
    q['prompt_md'] = prompt
    return q


def _enforce_short_answer(q: Dict, answer: str) -> Dict:
    """
    SHORT_ANSWER: options = [], use shortAnswerAcceptTexts
    """
    idx = q.get('idx', 0)
    q['options'] = []  # MUST be empty
    q['matchPairs'] = None
    
    if answer:
        q['shortAnswerAcceptTexts'] = [answer]
        q['correct_answers'] = [answer]
    
    # Ensure prompt has blank marker
    prompt = q.get('prompt_md', '')
    if prompt and not re.search(r'_{3,}', prompt):
        q['prompt_md'] = prompt.rstrip('.') + ' _______.'
    
    return q


def detect_and_enforce_type(q: Dict, instruction: str = '') -> Dict:
    """
    Detect correct question type based on answer format and instruction,
    then enforce schema.
    """
    answer = q.get('correct_answer', '') or (q.get('correct_answers', [''])[0] if q.get('correct_answers') else '')
    answer = answer.strip().upper() if answer else ''
    current_type = q.get('type', '')
    instruction_lower = instruction.lower()
    
    # 1. Detect from answer format
    if answer in ['TRUE', 'FALSE', 'NOT GIVEN']:
        q['type'] = 'TRUE_FALSE_NOT_GIVEN'
    elif answer in ['YES', 'NO']:
        q['type'] = 'YES_NO_NOT_GIVEN'
    elif re.match(r'^[IVX]+$', answer):  # Roman numerals
        q['type'] = 'MATCHING_HEADING'
    elif len(answer) == 1 and answer in 'ABCDEFGHIJ':
        # Single letter - need to check instruction
        if any(p in instruction_lower for p in ['which paragraph', 'which section contains']):
            q['type'] = 'MATCHING_INFORMATION'
        elif any(p in instruction_lower for p in ['match.*person', 'match.*name', 'list of people']):
            q['type'] = 'MATCHING_FEATURES'
        elif 'heading' in instruction_lower:
            q['type'] = 'MATCHING_HEADING'
        elif current_type in ['MATCHING_INFORMATION', 'MATCHING_FEATURES', 'MATCHING_HEADING', 'MULTIPLE_CHOICE_SINGLE']:
            pass  # Keep current type
        else:
            q['type'] = 'MATCHING_INFORMATION'  # Default for single letter
    elif ',' in answer:  # Multiple letters like "A, B"
        q['type'] = 'MULTIPLE_CHOICE_MULTIPLE'
    elif len(answer) > 1 and not answer[0].isdigit():  # Word answer
        q['type'] = 'SUMMARY_COMPLETION'
    
    # 2. Enforce schema
    return enforce_schema(q, answer.upper() if answer else '')


def enforce_all_questions(questions: List[Dict], instruction: str = '') -> List[Dict]:
    """Enforce schema on all questions."""
    result = []
    for q in questions:
        enforced = detect_and_enforce_type(q.copy(), instruction)
        result.append(enforced)
        logger.info(f"Q{enforced.get('idx')}: {enforced.get('type')} → options={len(enforced.get('options', []))}, matchPairs={'yes' if enforced.get('matchPairs') else 'no'}")
    return result
