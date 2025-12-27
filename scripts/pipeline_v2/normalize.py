#!/usr/bin/env python3
"""
Stage 4: Normalize (AI)
Uses Gemini Flash Lite to normalize extracted data to JSON schema.
Falls back to rule-based normalization if AI fails.
"""
import json
import os
import re
from pathlib import Path
from typing import Optional

from config import EXTRACTED_DIR, get_logger

logger = get_logger(__name__)

# Directory for normalized output
NORMALIZED_DIR = Path(__file__).parent.parent.parent / "data" / "normalized"
NORMALIZED_DIR.mkdir(parents=True, exist_ok=True)

# Load environment variables
def load_env():
    """Load environment variables from .env file."""
    env_file = Path(__file__).parent / ".env"
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            if '=' in line and not line.startswith('#'):
                key, value = line.split('=', 1)
                os.environ[key.strip()] = value.strip()

load_env()

# Gemini API setup
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')
GEMINI_MODEL = os.environ.get('GEMINI_MODEL', 'gemini-2.0-flash-lite')  # Use 2.0 Flash Lite for better quality

# Target JSON Schema for IELTS exam
IELTS_SCHEMA = """
{
  "exam": {
    "title": "string - exam title",
    "slug": "string - URL-friendly slug",
    "category": "IELTS",
    "level": "B2",
    "duration_min": 20
  },
  "sections": [
    {
      "idx": 1,
      "title": "string - section title",
      "passage_md": "string - passage text in markdown"
    }
  ],
  "questions": [
    {
      "idx": "integer - question number 1-40",
      "type": "TRUE_FALSE_NOT_GIVEN | YES_NO_NOT_GIVEN | MULTIPLE_CHOICE_SINGLE | MATCHING_HEADING | MATCHING_INFORMATION | MATCHING_FEATURES | SUMMARY_COMPLETION",
      "prompt_md": "string - question prompt",
      "options": [{"value": "A", "label": "A. option text", "is_correct": false}],
      "correct_answers": ["string - correct answer(s)"]
    }
  ]
}
"""


def clean_passage_text(text: str) -> str:
    """
    Remove embedded questions and metadata garbage from passage text.
    Patterns to remove:
    - Navigation: "|", "Section 1", "Section 2", etc.
    - Metadata: "20", "28-40", "minutes on", etc.
    - "15. Which employees may choose..." (numbered questions)
    - "21. You and your employer will need to sign a ………………… before training starts."
    """
    # === METADATA CLEANUP (navigation, section markers) ===
    # Remove lines that are just pipes/bars
    text = re.sub(r'^[\|\s]+$', '', text, flags=re.MULTILINE)
    
    # Remove common metadata patterns (full line patterns)
    metadata_line_patterns = [
        r'^GT Reading (?:Mock )?Test \d+.*$',  # GT Reading Test 6 Section 3 - Talking Point
        r'^Section \d+.*$',  # Section 1 or Section 1: ...
        r'^Details\s*$',  # Details
        r'^Last Updated:.*$',  # Last Updated: Wednesday...
        r'^Written by.*$',  # Written by IELTS Mentor
        r'^Hits:.*$',  # Hits: 186294
        r'^You should spend about.*$',  # You should spend about 20 minutes
        r'^\d{1,3}\s*$',  # Just "20" or "1485"
        r'^\d+-\s*\d+\s*$',  # 28- 40 or 28-40
        r'^minutes on.*$',  # minutes on Questions
        r'^GT Reading Sample:?.*$',  # GT Reading Sample:
        r'^Read the text.*$',  # Read the text below and answer
        r'^Questions?\s+\d+.*$',  # Questions 28-40
        r'^\*\s*Maori:.*',  # * Maori: footnote
        r'^[A-Za-z]+\s+Point\s*$',  # Talking Point (on its own line)
        r'^\.$',  # Just a period
        r'^[A-E]\s*$',  # Just a single letter
        r'^List of People\s*$',  # List of People header
        r'^NB\s*$',  # NB
    ]
    
    for pattern in metadata_line_patterns:
        text = re.sub(pattern, '', text, flags=re.MULTILINE | re.IGNORECASE)
    
    # Remove everything before the title line (if passage starts with garbage)
    # Find first line that starts with uppercase word followed by actual content
    lines = text.split('\n')
    clean_lines = []
    found_content = False
    
    for line in lines:
        stripped = line.strip()
        # Skip empty lines until we find content
        if not stripped:
            if found_content:
                clean_lines.append('')
            continue
        
        # Skip very short lines (likely garbage)
        if len(stripped) < 5 and not found_content:
            continue
        
        # Start collecting when we find a real sentence (15+ chars, contains words)
        if not found_content:
            if len(stripped) > 15 and re.search(r'[a-z]+\s+[a-z]+', stripped.lower()):
                found_content = True
                clean_lines.append(line)
        else:
            clean_lines.append(line)
    
    text = '\n'.join(clean_lines)
    
    # === PARAGRAPH LABEL - DO NOT AUTO-FORMAT HERE ===
    # Note: Paragraph label formatting (A The... -> **Paragraph A.**) is now handled
    # by normalize() function. Don't do it here to avoid duplicates.
    
    # === QUESTION CLEANUP ===
    # Remove TFNG/YNNG instruction blocks that got embedded in passage
    tfng_patterns = [
        r'TRUE if the statement agrees with the information.*?NOT GIVEN if there is no information on this',
        r'YES if the statement agrees with.*?NOT GIVEN if there is no information on this',
        r'TRUE\s+FALSE\s+NOT GIVEN',
        r'YES\s+NO\s+NOT GIVEN',
    ]
    for pattern in tfng_patterns:
        text = re.sub(pattern, '', text, flags=re.IGNORECASE | re.DOTALL)
    
    # Pattern 1: Question with blanks (………………… or _______)
    text = re.sub(r'\b(1[5-9]|2[0-9]|3[0-9]|40)\.\s+[^.]*[…_]{3,}[^.]*\.?\s*', '', text)
    
    # Pattern 2: Questions ending with ? (all forms)
    text = re.sub(r'\b(1[5-9]|2[0-9]|3[0-9]|40)\.\s+[^?]+\?\s*', '', text)
    
    # Pattern 3: Numbered questions/statements (35. The first fireflies...)
    text = re.sub(r'\b(2[89]|3[0-9]|40)\.\s+[A-Z][^.]*\.', '', text)
    
    # Pattern 4: Cleanup orphaned blank patterns
    text = re.sub(r'[…_]{3,}', '', text)
    
    # Pattern 5: Remove orphaned sentences that look like incomplete questions
    text = re.sub(r'\n\s*[A-Z][^.!?\n]*\bthe\s+(?:during|before|after|for|and|or)\b[^.!?\n]*\.\s*', '\n', text)
    
    # Pattern 6: Remove any sentence with "of the the" weirdness
    text = re.sub(r'\n\s*[^.\n]*\bof the\s+(?:during|before|after|and|or|for|by)\b[^.\n]*\.\s*', '\n', text)
    
    # === MINI-IELTS SPECIFIC CLEANUP ===
    # Remove newlines in middle of sentences (next char is lowercase)
    text = re.sub(r'\n(?=[a-z])', ' ', text)
    # Remove "Show workspace" at end
    text = re.sub(r'Show workspace\s*$', '', text, flags=re.IGNORECASE)
    
    # === FINAL CLEANUP ===
    text = re.sub(r'\n\s*\n\s*\n+', '\n\n', text)
    text = re.sub(r'  +', ' ', text)
    text = re.sub(r'\n +', '\n', text)
    
    return text.strip()


def auto_fix_paragraph_labels(passage: str) -> str:
    """
    AUTO-FIX Option 4: Convert various paragraph label formats to strict format.
    Converts: "A. Text", "Section A", "A Text", "Paragraph A" -> "**Paragraph A.**\n"
    """
    if not passage:
        return passage
    
    # ========== SKIP if passage already has properly formatted labels ==========
    # If we already have **Paragraph A.** etc, don't try to auto-fix - it creates duplicates
    if re.search(r'\*\*Paragraph [A-L]\.\*\*', passage):
        # Clean up multiple newlines only
        passage = re.sub(r'\n{3,}', '\n\n', passage)
        return passage.strip()
    
    # Pattern 1: "Section A" or "Section A:" -> "**Paragraph A.**\n"
    passage = re.sub(
        r'\n*Section\s+([A-L])\s*:?\s*\n*',
        r'\n\n**Paragraph \1.**\n',
        passage,
        flags=re.IGNORECASE
    )
    
    # Pattern 2: Single letter at start of line "A. " or "A " -> "**Paragraph A.**\n"
    passage = re.sub(
        r'(?:^|\n)([A-L])[\.\s]+(?=[A-Z])',
        r'\n\n**Paragraph \1.**\n',
        passage
    )
    
    # Pattern 3: "Paragraph A" without proper formatting -> "**Paragraph A.**\n"
    # But SKIP already formatted "**Paragraph A.**" (negative lookbehind for **)
    passage = re.sub(
        r'(?<!\*)(?:^|\n)\s*Paragraph\s+([A-L])\s*(?:\.|:)?\s*\n*',
        r'\n\n**Paragraph \1.**\n',
        passage,
        flags=re.IGNORECASE
    )
    
    # Clean up multiple newlines
    passage = re.sub(r'\n{3,}', '\n\n', passage)
    
    # ========== FINAL FIX: Remove duplicate consecutive paragraph labels ==========
    # Pattern: **Paragraph X.**\n**Paragraph Y.** where Y comes BEFORE X alphabetically
    # This means an embedded label from text was incorrectly converted - remove the second one
    # Also remove any **Paragraph X.** immediately followed by another **Paragraph Y.**
    passage = re.sub(
        r'(\*\*Paragraph [A-L]\.\*\*)\s*\n+(\*\*Paragraph [A-L]\.\*\*)\s*\n*',
        r'\1\n',
        passage
    )
    
    return passage.strip()


def merge_choose_two_questions(questions: list) -> list:
    """
    AUTO-FIX Option A: Merge 'Choose TWO' questions.
    
    Detects patterns like:
    - "Question text (Answer 1 of 2)" + "Question text (Answer 2 of 2)"
    - Consecutive MCQ_SINGLE with same base prompt
    
    Merges into single MULTIPLE_CHOICE_MULTIPLE with combined correct_answers.
    """
    if len(questions) < 2:
        return questions
    
    merged = []
    i = 0
    
    while i < len(questions):
        q = questions[i]
        prompt = q.get('prompt_md', '')
        
        # Pattern 1: Explicit "(Answer X of Y)" pattern
        answer_of_match = re.search(r'\(Answer \d+ of (\d+)\)', prompt) 
        
        if answer_of_match:
            total_answers = int(answer_of_match.group(1))
            base_prompt = re.sub(r'\s*\(Answer \d+ of \d+\)\s*', '', prompt).strip()
            
            # Collect all related questions
            related = [q]
            j = i + 1
            while j < len(questions) and len(related) < total_answers:
                next_q = questions[j]
                next_prompt = next_q.get('prompt_md', '')
                next_base = re.sub(r'\s*\(Answer \d+ of \d+\)\s*', '', next_prompt).strip()
                
                if next_base == base_prompt:
                    related.append(next_q)
                    j += 1
                else:
                    break
            
            if len(related) >= 2:
                # Merge into MULTIPLE_CHOICE_MULTIPLE
                combined_answers = []
                for r in related:
                    combined_answers.extend(r.get('correct_answers', []))
                
                # Mark correct options
                options = q.get('options', [])
                for opt in options:
                    opt['is_correct'] = opt.get('label', opt.get('value', '')) in combined_answers
                
                merged_q = {
                    'idx': q.get('idx'),  # Use first question's idx
                    'type': 'MULTIPLE_CHOICE_MULTIPLE',
                    'prompt_md': f"{base_prompt} (Choose {total_answers})",
                    'options': options,
                    'correct_answers': combined_answers,
                }
                merged.append(merged_q)
                logger.info(f"Q{q.get('idx')}: Merged {len(related)} questions into MULTIPLE_CHOICE_MULTIPLE → {combined_answers}")
                i = j
                continue
        
        # Pattern 2: "Choose TWO/THREE" in prompt without (Answer X of Y)
        choose_match = re.search(r'Choose\s+(TWO|THREE|FOUR|2|3|4)', prompt, re.IGNORECASE)
        if choose_match and q.get('type') == 'MULTIPLE_CHOICE_SINGLE':
            # This should already be MCQ_MULTIPLE but isn't - fix it
            q['type'] = 'MULTIPLE_CHOICE_MULTIPLE'
            # Mark multiple correct options
            correct = q.get('correct_answers', [])
            for opt in q.get('options', []):
                opt['is_correct'] = opt.get('label', opt.get('value', '')) in correct
            logger.info(f"Q{q.get('idx')}: Fixed MCQ_SINGLE → MULTIPLE_CHOICE_MULTIPLE (Choose pattern)")
        
        merged.append(q)
        i += 1
    
    return merged


def auto_generate_instruction_md(questions: list) -> str:
    """
    AUTO-FIX Option 1: Generate instruction_md based on question types and ranges.
    Groups questions by type and creates proper IELTS instruction format.
    """
    if not questions:
        return ""
    
    # Group questions by type
    type_groups = {}
    for q in questions:
        qtype = q.get('type', 'UNKNOWN')
        idx = q.get('idx', 0)
        if qtype not in type_groups:
            type_groups[qtype] = {'min': idx, 'max': idx}
        else:
            type_groups[qtype]['min'] = min(type_groups[qtype]['min'], idx)
            type_groups[qtype]['max'] = max(type_groups[qtype]['max'], idx)
    
    instruction_parts = []
    
    for qtype, range_info in type_groups.items():
        min_idx, max_idx = range_info['min'], range_info['max']
        
        if qtype == 'TRUE_FALSE_NOT_GIVEN':
            instruction_parts.append(f"""**Questions {min_idx}-{max_idx}:**
Do the following statements agree with the information given in the text?

Write
- **TRUE** if the statement agrees with the information
- **FALSE** if the statement contradicts the information
- **NOT GIVEN** if there is no information on this""")
        
        elif qtype == 'YES_NO_NOT_GIVEN':
            instruction_parts.append(f"""**Questions {min_idx}-{max_idx}:**
Do the following statements agree with the claims of the writer?

Write
- **YES** if the statement agrees with the claims of the writer
- **NO** if the statement contradicts the claims of the writer
- **NOT GIVEN** if it is impossible to say what the writer thinks about this""")
        
        elif qtype == 'MULTIPLE_CHOICE_SINGLE':
            instruction_parts.append(f"""**Questions {min_idx}-{max_idx}:**
Choose the correct letter, **A**, **B**, **C** or **D**.""")
        
        elif qtype == 'MULTIPLE_CHOICE_MULTIPLE':
            instruction_parts.append(f"""**Questions {min_idx}-{max_idx}:**
Choose **TWO** letters, **A-E**.""")
        
        elif qtype == 'MATCHING_INFORMATION':
            instruction_parts.append(f"""**Questions {min_idx}-{max_idx}:**
Which section contains the following information?

Write the correct letter, **A-L**.""")
        
        elif qtype == 'MATCHING_HEADING':
            instruction_parts.append(f"""**Questions {min_idx}-{max_idx}:**
Choose the correct heading for each section from the list of headings below.

Write the correct number, **i-xi**.""")
        
        elif qtype in ['SHORT_ANSWER', 'SUMMARY_COMPLETION', 'SENTENCE_COMPLETION']:
            instruction_parts.append(f"""**Questions {min_idx}-{max_idx}:**
Complete the sentences below.

Write **NO MORE THAN TWO WORDS AND/OR A NUMBER** for each answer.""")
    
    return "\n\n---\n\n".join(instruction_parts)


def parse_mcq_answer(answer: str) -> list:
    """
    Parse MCQ answer formats into list of correct letters.
    
    Formats handled:
    - "A, B" or "A,B" -> ["A", "B"]
    - "A, B IN EITHER ORDER" -> ["A", "B"]
    - "A and B" -> ["A", "B"]
    - "C,E   IN EITHER ORDER" -> ["C", "E"]
    - "A/B" -> ["A", "B"] (alternatives, both valid)
    
    Returns list of uppercase letters (A-H).
    """
    if not answer:
        return []
    
    # Remove "IN EITHER ORDER" suffix
    clean = re.sub(r'\s*IN\s+EITHER\s+ORDER\s*', '', answer, flags=re.I)
    
    # Find all uppercase letters A-H
    letters = re.findall(r'[A-H]', clean.upper())
    
    return list(set(letters))  # Unique letters


def mark_mcq_correct_options(options: list, correct_letters: list) -> list:
    """
    Mark is_correct=True for options matching correct letters.
    
    Args:
        options: List of option dicts with 'label' or 'value' key
        correct_letters: List of correct letters like ['A', 'B']
    
    Returns:
        Updated options list with is_correct marked
    """
    for opt in options:
        label = opt.get('label', opt.get('value', '')).upper()
        opt['is_correct'] = label in correct_letters
    return options


def expand_optional_answers(answer: str) -> list:
    """
    AUTO-FIX: Expand answer formats with optional words or variants.
    
    Formats handled:
    - "(optional) word" -> ["word", "optional word"]
    - "word1// word2" -> ["word1", "word2"]
    - "(optional1) (optional2) word" -> ["word", "optional1 word", "optional2 word", "optional1 optional2 word"]
    - Simple answer -> ["answer"]
    """
    if not answer:
        return []
    
    answer = answer.strip()
    answers = []
    
    # Handle "word1// word2" format (alternative answers)
    if '//' in answer:
        parts = [p.strip() for p in answer.split('//')]
        return parts
    
    # Handle "(optional) word" format
    optional_pattern = r'\(([^)]+)\)'
    optionals = re.findall(optional_pattern, answer)
    
    if optionals:
        # Get the base word (remove all optional parts)
        base = re.sub(optional_pattern, '', answer).strip()
        base = re.sub(r'\s+', ' ', base)  # Clean up multiple spaces
        answers.append(base)
        
        # Add version with optional word(s)
        for opt in optionals:
            full = f"{opt} {base}".strip()
            full = re.sub(r'\s+', ' ', full)
            if full not in answers:
                answers.append(full)
        
        return answers
    
    # Simple answer
    return [answer]


def call_gemini(prompt: str) -> Optional[str]:
    """Call Gemini Flash Lite API."""
    if not GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY not set, skipping AI normalize")
        return None
    
    try:
        import google.generativeai as genai
        
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel(GEMINI_MODEL)
        
        logger.info(f"Using model: {GEMINI_MODEL}")
        response = model.generate_content(prompt)
        return response.text
        
    except ImportError:
        logger.error("google-generativeai package not installed. Run: pip install google-generativeai")
        return None
    except Exception as e:
        logger.error(f"Gemini API error: {e}")
        return None


def build_normalize_prompt(data: dict) -> str:
    """Build COMPACT prompt for Gemini - optimized for minimal tokens."""
    # Truncation but keep enough passage for answer extraction
    passages_text = ""
    for p in data.get('passages', [])[:1]:  # Only 1st passage
        text = p.get('text', '')[:2500]  # Increase to 2500 for answer extraction
        passages_text += text
    
    # Compact question format - only essential fields
    questions_compact = []
    for q in data.get('questions', [])[:20]:
        questions_compact.append({
            'idx': q.get('idx'),
            'type': q.get('type'),
            'prompt': q.get('prompt', '')[:100],  # Truncate prompts
            'answer': q.get('correct_answer', ''),
            'opts': len(q.get('options', [])),  # Just count, not full options
        })
    
    questions_text = json.dumps(questions_compact, ensure_ascii=False)
    
    # COMPACT PROMPT - ~300 tokens instead of ~800
    prompt = f"""IELTS exam normalizer. Output valid JSON only.

SCHEMA: {{exam:{{title,slug,category:"IELTS",level:"B2",duration_min:20}},sections:[{{idx,title,passage_md}}],questions:[{{idx,type,prompt_md,options:[{{value,label,is_correct}}],correct_answers:[]}}]}}

TYPES: TRUE_FALSE_NOT_GIVEN,YES_NO_NOT_GIVEN,MULTIPLE_CHOICE_SINGLE,MATCHING_HEADING,MATCHING_INFORMATION,MATCHING_FEATURES,SUMMARY_COMPLETION,TABLE_COMPLETION,NOTE_COMPLETION,SENTENCE_COMPLETION,SHORT_ANSWER

DATA:
Title: {data.get('title', '')[:80]}
Passage: {passages_text[:1500]}...

Questions: {questions_text}

RULES:
1. Fix question types based on content
2. MULTIPLE_CHOICE: options A-F with is_correct=true for correct one
3. MATCHING_HEADING: options i,ii,iii... 
4. COMPLETION/SHORT_ANSWER: correct_answers=["answer"] - EXTRACT FROM PASSAGE
5. IMPORTANT: If answer is empty but question is COMPLETION type, FIND ANSWER IN PASSAGE
6. Add ai_review:{{issues_found:[],fixes_applied:[],quality_score:1-10}}

JSON:"""
    return prompt


def normalize_with_ai(data: dict) -> Optional[dict]:
    """
    Normalize data using Gemini AI with type-safe parsing.
    Uses Pydantic models for validation and better error messages.
    """
    from models import parse_normalized_exam, validate_for_render
    
    prompt = build_normalize_prompt(data)
    
    logger.info("Calling Gemini AI for normalization...")
    response = call_gemini(prompt)
    
    if not response:
        return None
    
    # Parse JSON from response
    try:
        # Try to extract JSON from response
        json_match = re.search(r'\{[\s\S]*\}', response)
        if not json_match:
            logger.error("No JSON found in AI response")
            return None
        
        raw_json = json.loads(json_match.group())
        
        # Type-safe parsing with Pydantic
        parsed_exam, parse_errors = parse_normalized_exam(raw_json)
        
        if parse_errors:
            logger.warning("Pydantic validation errors (attempting to continue):")
            for err in parse_errors[:5]:  # Show first 5 errors
                logger.warning(f"  - {err}")
            # Return raw JSON if Pydantic fails but JSON is valid
            logger.info("Falling back to raw JSON (Pydantic validation failed)")
            return raw_json
        
        # Additional render validation
        render_warnings = validate_for_render(parsed_exam)
        if render_warnings:
            logger.info("Render validation warnings:")
            for warn in render_warnings[:5]:
                logger.info(f"  ⚠ {warn}")
        
        logger.info("AI normalization successful with type-safe parsing")
        return parsed_exam.model_dump()
        
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse AI response as JSON: {e}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error during AI normalization: {e}")
        return None



# ===== IMAGE EMBEDDING UTILITIES (moved before normalize_rule_based) =====
def embed_content_images_to_instruction(instruction_md: str, content_images: dict, questions: list, image_url: str = '') -> str:
    """
    Embed content images into instruction_md (NOT passage_md).
    
    Images for map labels, diagrams, etc. go in instruction_md.
    passage_md should contain only the reading passage text.
    
    Args:
        instruction_md: Current instruction markdown text
        content_images: Dict from extract_content_images()
        questions: List of questions to determine which images go where
        image_url: Cover/thumbnail image URL (skip this)
    
    Returns:
        Updated instruction_md with embedded images
    """
    if not content_images:
        return instruction_md
    
    sections_to_add = []
    
    # Group questions by type to understand what images are needed
    question_types = {}
    for q in questions:
        q_type = q.get('type', '')
        q_idx = q.get('idx', 0)
        if q_type not in question_types:
            question_types[q_type] = []
        question_types[q_type].append(q_idx)
    
    # Add question-specific images (map labels, diagrams for specific questions)
    question_images = content_images.get('question_images', {})
    for q_range, urls in question_images.items():
        if not urls:
            continue
        
        # Format section header
        sections_to_add.append(f"\n---\n\n### Images for Questions {q_range}\n")
        for i, url in enumerate(urls):
            sections_to_add.append(f"\n![Question {q_range} Option {chr(65+i)}]({url})\n")
    
    # Add diagram images if present
    diagram_images = content_images.get('diagram_images', [])
    for url in diagram_images:
        already_added = any(url in str(sections_to_add) for _ in [True])
        if not already_added:
            sections_to_add.append(f"\n---\n\n### Diagram\n\n![Diagram]({url})\n")
    
    # Add other content images (but NOT passage images - those stay out)
    # Passage images should NOT be in instruction_md either
    # Only question-related images go in instruction_md
    
    if sections_to_add:
        return instruction_md + '\n'.join(sections_to_add)
    
    return instruction_md

# Additional skip patterns for embedding
_SKIP_IMAGE_PATTERNS = ['remove_format', 'Dictionary', 'highlight', 'favicon', 'icon', 'logo', 'avatar']

def _filter_images(image_list):
    """Filter out non-content images."""
    return [url for url in image_list if not any(skip in url for skip in _SKIP_IMAGE_PATTERNS)]

# ===== END IMAGE EMBEDDING UTILITIES =====

def normalize_rule_based(data: dict) -> dict:
    """Enhanced rule-based normalization with auto-detection and AUTO-FIX."""
    logger.info("Using enhanced rule-based normalization")
    
    # Import enhanced parser
    try:
        from enhanced_parser import (
            detect_question_type, 
            extract_question_range, 
            extract_answers_from_text,
            build_options
        )
        use_enhanced = True
    except ImportError:
        logger.warning("Enhanced parser not available, using basic mode")
        use_enhanced = False
    
    title = data.get('title', 'IELTS Reading Test')
    slug = re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')
    
    # Detect exam type
    exam_type = data.get('exam_type', 'reading')
    audio_url = data.get('audio_url', '')
    if audio_url and not exam_type == 'listening':
        exam_type = 'listening'
    
    # Build passage markdown - handle both 'passages' and 'passage' (mini-ielts)
    passage_md = ""
    passage_list = data.get('passages', []) or data.get('passage', [])
    
    # Auto-add paragraph labels (A, B, C, ...) if missing
    labels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    for i, p in enumerate(passage_list):
        text = p.get('text', '')
        text = clean_passage_text(text)
        if not text or len(text) < 30:
            continue
        
        # Use existing label or auto-assign
        label = p.get('label') or p.get('letter')
        if not label and i < len(labels):
            label = labels[i]
        
        # ========== FIX: Strip leading paragraph letter from text ==========
        # Source sometimes has "A The development..." or "A\n The development..." or "Paragraph A..."
        # Strip these before adding proper "**Paragraph A.**" prefix
        if label:
            text = text.strip()
            # Strip leading single letter followed by whitespace/newline then uppercase
            # But we need to check if text starts with ANY single letter (not necessarily matching current label)
            # to handle cases where paragraph 2 has text "A The..." (previous paragraph's label embedded)
            text = re.sub(r'^([A-L])\s*\n?\s*(?=[A-Z])', '', text, flags=re.MULTILINE)
            # Pattern: "Paragraph A " at start of text
            text = re.sub(r'^Paragraph\s+[A-L]\s*\.?\s*\n?\s*(?=[A-Z])', '', text.strip(), flags=re.IGNORECASE)
        
        if label:
            passage_md += f"**Paragraph {label}.**\\n{text}\\n\\n"
        else:
            passage_md += f"{text}\\n\\n"
    
    # ========== AUTO-FIX: Paragraph Labels (Option 4) ==========
    # Convert "A. Text" or "Section A" to "**Paragraph A.**\\n"
    passage_md = auto_fix_paragraph_labels(passage_md)
    
    # ========== LISTENING EXAM: Generate context if passage too short ==========
    if exam_type == 'listening' and len(passage_md.split()) < 100:
        passage_md = f"""# Listening Test - {title}

This is a listening practice test about {title.lower()}. Listen carefully to the audio recording and answer the questions below.

**Instructions:**
You will hear the recording ONCE only. Answer all questions based on what you hear in the audio.

**About the Audio:**
This test includes multiple choice questions and matching questions. Pay close attention to the speakers' discussions and take notes if needed.

**Question Topics:**
- Listen for key information and main ideas
- Match features to correct categories
- Identify specific details mentioned by speakers
"""
    
    # Get raw text for enhanced parsing
    raw_text = data.get('_raw_text', '')
    raw_html = data.get('_raw_html', '')
    
    # Try to extract answers from raw text first, then HTML as fallback
    answers_map = {}
    if use_enhanced:
        if raw_text:
            answers_map = extract_answers_from_text(raw_text)
        # If few answers found, try extracting from HTML
        if len(answers_map) < 5 and raw_html:
            html_answers = extract_answers_from_text(raw_html)
            # Merge, preferring HTML answers
            for idx, ans in html_answers.items():
                if idx not in answers_map:
                    answers_map[idx] = ans
        logger.info(f"Auto-extracted {len(answers_map)} answers from source")
    
    # Build questions with enhanced detection
    questions = []
    for q in data.get('questions', []):
        idx = q.get('idx', 0)
        original_type = q.get('type', 'SUMMARY_COMPLETION')
        prompt = q.get('prompt', f"Question {idx}")
        
        # Auto-detect type from instruction if available
        detected_type = original_type
        instruction = q.get('instruction', '')
        if use_enhanced and instruction:
            detected_type = detect_question_type(instruction)
            if detected_type != original_type:
                logger.info(f"Q{idx}: Type corrected {original_type} -> {detected_type}")
        
        # Get answer from auto-extraction or original
        correct_answer = ''
        if idx in answers_map:
            correct_answer = answers_map[idx]
        elif q.get('correct_answer'):
            correct_answer = q.get('correct_answer')
        
        # ========== AUTO-FIX: Detect TFNG from answers (Option 1) ==========
        if correct_answer in ['TRUE', 'FALSE', 'NOT GIVEN']:
            if detected_type not in ['TRUE_FALSE_NOT_GIVEN', 'YES_NO_NOT_GIVEN']:
                logger.info(f"Q{idx}: Auto-fixed type to TRUE_FALSE_NOT_GIVEN (answer={correct_answer})")
                detected_type = 'TRUE_FALSE_NOT_GIVEN'
        elif correct_answer in ['YES', 'NO', 'NOT GIVEN']:
            if detected_type != 'YES_NO_NOT_GIVEN':
                logger.info(f"Q{idx}: Auto-fixed type to YES_NO_NOT_GIVEN (answer={correct_answer})")
                detected_type = 'YES_NO_NOT_GIVEN'
        
        # Build options based on type
        options = q.get('options', [])
        if use_enhanced and not options and detected_type:
            options = build_options(detected_type, correct_answer)
        
        # ========== AUTO-FIX: TFNG/YNNG options with is_correct (Option 1) ==========
        if detected_type == 'TRUE_FALSE_NOT_GIVEN':
            options = [
                {"value": "TRUE", "label": "TRUE", "is_correct": correct_answer == "TRUE"},
                {"value": "FALSE", "label": "FALSE", "is_correct": correct_answer == "FALSE"},
                {"value": "NOT GIVEN", "label": "NOT GIVEN", "is_correct": correct_answer == "NOT GIVEN"}
            ]
        elif detected_type == 'YES_NO_NOT_GIVEN':
            options = [
                {"value": "YES", "label": "YES", "is_correct": correct_answer == "YES"},
                {"value": "NO", "label": "NO", "is_correct": correct_answer == "NO"},
                {"value": "NOT GIVEN", "label": "NOT GIVEN", "is_correct": correct_answer == "NOT GIVEN"}
            ]
        
        # ========== AUTO-FIX: MATCHING_INFO clear options (Option 1) ==========
        # Also convert MAP_LABEL → MATCHING_INFORMATION (same UI, letter input A-J)
        if detected_type == 'MAP_LABEL':
            logger.info(f"Q{idx}: Auto-converting MAP_LABEL → MATCHING_INFORMATION")
            detected_type = 'MATCHING_INFORMATION'
        
        # ========== AUTO-FIX: MATCHING_HEADING - detect answer type and generate appropriate options ==========
        # Two variants:
        # 1. Answer is roman numeral (i, ii, iii...) → options are headings i-viii with text
        # 2. Answer is letter (A, B, C...) → options are paragraph labels A-G
        if detected_type == 'MATCHING_HEADING':
            answer_lower = correct_answer.lower() if correct_answer else ''
            
            # Roman numeral patterns
            ROMAN_TO_INT = {'i': 1, 'ii': 2, 'iii': 3, 'iv': 4, 'v': 5, 'vi': 6, 'vii': 7, 'viii': 8, 'ix': 9, 'x': 10}
            
            # Case 1: Answer is roman numeral - use heading options
            if answer_lower in ROMAN_TO_INT:
                # Try to extract headings from cleaned text
                # Note: source/item_id are top-level fields in extracted data (not in _metadata)
                source = data.get('source', data.get('_metadata', {}).get('source', ''))
                item_id = data.get('item_id', data.get('_metadata', {}).get('item_id', ''))
                
                cleaned_path = Path(__file__).parent.parent.parent / "data" / "cleaned" / source / f"{item_id}.txt"
                headings = []
                if cleaned_path.exists():
                    cleaned_text = cleaned_path.read_text(encoding='utf-8')
                    # Extract headings from multi-line format (i\nText on next line)
                    lines = cleaned_text.split('\n')
                    for i, line in enumerate(lines):
                        stripped = line.strip().lower()
                        if stripped in ROMAN_TO_INT and i + 1 < len(lines):
                            next_line = lines[i + 1].strip()
                            if next_line and len(next_line) >= 5 and next_line[0].isupper():
                                if '___' not in next_line and '?' not in next_line:
                                    headings.append({"label": stripped, "text": next_line})
                    # Sort by roman numeral order
                    headings.sort(key=lambda h: ROMAN_TO_INT.get(h['label'], 99))
                    # Deduplicate
                    seen = set()
                    headings = [h for h in headings if not (h['label'] in seen or seen.add(h['label']))]
                
                if headings and len(headings) >= 3:
                    options = []
                    for h in headings:
                        options.append({
                            'value': h['label'],
                            'label': h['label'],
                            'text': h['text'],
                            'is_correct': h['label'] == answer_lower
                        })
                    logger.info(f"Q{idx}: Auto-generated {len(options)} heading options (i-{headings[-1]['label']}) for MATCHING_HEADING")
                else:
                    # Fallback: generate basic roman numeral options without text
                    options = []
                    for numeral in ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii']:
                        options.append({
                            'value': numeral,
                            'label': numeral,
                            'text': f'Heading {numeral}',
                            'is_correct': numeral == answer_lower
                        })
                    logger.info(f"Q{idx}: Auto-generated 8 heading options (i-viii) for MATCHING_HEADING (no text)")
            
            # Case 2: Answer is letter - use paragraph options
            else:
                paragraph_labels = re.findall(r'\*\*Paragraph ([A-L])\.\*\*', passage_md)
                max_letter = max(paragraph_labels) if paragraph_labels else 'H'
                
                options = []
                for c in 'ABCDEFGHIJKL':
                    if c <= max_letter:
                        options.append({
                            'value': c,
                            'label': f'Paragraph {c}',
                            'is_correct': (c == correct_answer)
                        })
                logger.info(f"Q{idx}: Auto-generated {len(options)} paragraph options for MATCHING_HEADING (A-{max_letter})")
            
            # NOTE: Do NOT modify correct_answer to add full text - it causes duplicates
            # Frontend displays option text, so correct_answers should just be label (e.g., "ii")
        
        if detected_type in ['MATCHING_INFORMATION', 'MATCHING_FEATURES', 'MATCHING_ENDINGS']:
            if options and len(options) > 0:
                logger.info(f"Q{idx}: Auto-cleared options for {detected_type}")
            options = []  # MATCHING types should have empty options
        
        # ========== AUTO-FIX: Expand (optional) word answers (NEW STRICT RULE) ==========
        correct_answers_list = expand_optional_answers(correct_answer) if correct_answer else []
        
        # ========== AUTO-FIX: MCQ_MULTIPLE - parse answers and mark is_correct ==========
        if detected_type == 'MULTIPLE_CHOICE_MULTIPLE':
            # Parse "A, B IN EITHER ORDER" -> ["A", "B"]
            mcq_correct_letters = parse_mcq_answer(correct_answer)
            if mcq_correct_letters:
                correct_answers_list = mcq_correct_letters
                # Mark is_correct for matching options
                options = mark_mcq_correct_options(options, mcq_correct_letters)
                logger.info(f"Q{idx}: MCQ_MULTIPLE correct={mcq_correct_letters}")
        
        questions.append({
            'idx': idx,
            'type': detected_type,
            'prompt_md': prompt,
            'options': options,
            'correct_answers': correct_answers_list,
        })
    
    # ========== AUTO-FIX: Merge "Choose TWO" questions (Option A) ==========
    # Detect pattern: "Question text (Answer 1 of 2)" + "Question text (Answer 2 of 2)"
    # Merge into single MULTIPLE_CHOICE_MULTIPLE with combined correct_answers
    questions = merge_choose_two_questions(questions)
    
    # ========== AUTO-FIX: Generate instruction_md (Option 1) ==========
    instruction_md = auto_generate_instruction_md(questions)
    
    # ========== SCHEMA ENFORCEMENT (STRICT) ==========
    # Apply strict schema rules per question type
    try:
        from schema_enforcer import enforce_all_questions
        questions = enforce_all_questions(questions, instruction_md)
        logger.info("Applied strict schema enforcement to all questions")
    except ImportError as e:
        logger.warning(f"Schema enforcer not available: {e}")
    # ========== AUTO-DETECT QUESTION GROUPS ==========
    try:
        from auto_question_groups import detect_question_groups
        question_groups = detect_question_groups(questions, instruction_md)
        logger.info(f"Auto-detected {len(question_groups)} question groups")
    except Exception as e:
        logger.warning(f"Failed to auto-detect question groups: {e}")
        # Fallback: single group with all questions
        if questions:
            question_groups = [{
                'idx': 1,
                'start_idx': min(q.get('idx', 1) for q in questions),
                'end_idx': max(q.get('idx', 1) for q in questions),
                'instruction_md': instruction_md
            }]
        else:
            question_groups = []
    
    return {
        'exam': {
            'title': title,
            'slug': slug,
            'category': 'IELTS',
            'level': 'B2',
            'duration_min': 20,
            'audio_url': data.get('audio_url', ''),
            'image_url': data.get('image_url', ''),  # Thumbnail/cover image
        },
        'sections': [
            {
                'idx': 1,
                'title': title,
                'passage_md': passage_md.strip(),  # Passage only - no images
                'instruction_md': embed_content_images_to_instruction(instruction_md, data.get('content_images', {}), questions, data.get('image_url', '')),
                'audio_url': data.get('audio_url', ''),
                'question_groups': question_groups,  # AUTO-ADDED
            }
        ],
        'questions': questions,
    }



def load_extracted(source: str, item_id: str) -> Optional[dict]:
    """Load extracted data from disk."""
    source_dir = EXTRACTED_DIR / source
    data_path = source_dir / f"{item_id}.json"
    
    if not data_path.exists():
        logger.error(f"Extracted data not found: {data_path}")
        return None
    
    return json.loads(data_path.read_text(encoding='utf-8'))


def normalize(source: str, item_id: str, use_ai: bool = True) -> Optional[dict]:
    """
    Normalize extracted data to target JSON schema.
    Uses AI if available, falls back to rule-based.
    """
    data = load_extracted(source, item_id)
    if not data:
        return None
    
    logger.info(f"Normalizing: {source}/{item_id}")
    
    normalized = None
    
    # Try AI normalization first
    if use_ai and GEMINI_API_KEY:
        normalized = normalize_with_ai(data)
    
    # Fallback to rule-based
    if not normalized:
        normalized = normalize_rule_based(data)
    
    # Add metadata
    normalized['_metadata'] = {
        'source': source,
        'item_id': item_id,
        'url': data.get('url', ''),
        'normalized_by': 'ai' if (use_ai and GEMINI_API_KEY and normalized) else 'rule-based',
    }
    
    # Apply ||| delimiter format to prompts
    # normalized = format_first_question_in_groups(normalized)  # DISABLED - frontend does not parse ||
    return normalized


def save_normalized(data: dict, source: str, item_id: str) -> Optional[Path]:
    """Save normalized data to disk."""
    source_dir = NORMALIZED_DIR / source
    source_dir.mkdir(parents=True, exist_ok=True)
    
    output_path = source_dir / f"{item_id}.json"
    output_path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding='utf-8')
    
    logger.info(f"Saved normalized: {output_path}")
    return output_path


def normalize_and_save(source: str, item_id: str, use_ai: bool = True) -> Optional[dict]:
    """Normalize data and save. Returns normalized data."""
    data = normalize(source, item_id, use_ai)
    if data:
        save_normalized(data, source, item_id)
    return data


# CLI
if __name__ == "__main__":
    import sys
    if len(sys.argv) < 3:
        print("Usage: python normalize.py <source> <item_id> [--no-ai]")
        sys.exit(1)
    
    source, item_id = sys.argv[1], sys.argv[2]
    use_ai = '--no-ai' not in sys.argv
    
    result = normalize_and_save(source, item_id, use_ai)
    if result:
        method = result.get('_metadata', {}).get('normalized_by', 'unknown')
        print(f"✓ Normalized ({method}): {len(result.get('questions', []))} questions")
    else:
        print("✗ Normalize failed")
        sys.exit(1)



def apply_prompt_delimiter_format(questions: list, instruction_md: str) -> list:
    """
    Apply the ||| delimiter format to question prompts.
    
    Rules:
    - First question in each group gets: "instruction ||| question"
    - Subsequent questions in the group get: just "question"
    
    Groups are detected by:
    1. Analyzing instruction_md for "Questions X-Y" patterns
    2. Using question type changes as group boundaries
    
    Args:
        questions: List of question dicts with 'idx', 'type', 'prompt_md'
        instruction_md: The instruction markdown containing group info
        
    Returns:
        Updated questions list with formatted prompt_md
    """
    if not questions or not instruction_md:
        return questions
    
    # Parse groups from instruction_md
    # Pattern: "Questions X-Y" or "**Questions X-Y**"
    group_pattern = r'\*?\*?Questions?\s+(\d+)[-–](\d+)\*?\*?'
    groups = []
    
    for match in re.finditer(group_pattern, instruction_md, re.IGNORECASE):
        start = int(match.group(1))
        end = int(match.group(2))
        groups.append((start, end))
    
    # If no groups found, try to detect by type changes
    if not groups:
        current_type = None
        group_start = None
        for q in sorted(questions, key=lambda x: x.get('idx', 0)):
            q_type = q.get('type', '')
            idx = q.get('idx', 0)
            
            if q_type != current_type:
                if group_start is not None:
                    groups.append((group_start, idx - 1))
                group_start = idx
                current_type = q_type
        
        # Add last group
        if group_start is not None and questions:
            last_idx = max(q.get('idx', 0) for q in questions)
            groups.append((group_start, last_idx))
    
    # Extract instruction text for each group from instruction_md
    group_instructions = {}
    
    for start, end in groups:
        # Find the instruction block for this group
        pattern = rf'\*?\*?Questions?\s+{start}[-–]{end}\*?\*?[:\s]*(.+?)(?=\*?\*?Questions?\s+\d+|\Z)'
        match = re.search(pattern, instruction_md, re.IGNORECASE | re.DOTALL)
        
        if match:
            instruction_text = match.group(0).strip()
            # Clean up the instruction
            instruction_text = re.sub(r'\n{2,}', '\n', instruction_text)
            instruction_text = instruction_text.strip()
            group_instructions[(start, end)] = instruction_text
    
    # Apply format to questions
    for q in questions:
        idx = q.get('idx', 0)
        prompt = q.get('prompt_md', '')
        
        # Skip if already has delimiter
        if '|||' in prompt:
            continue
        
        # Find which group this question belongs to
        for start, end in groups:
            if start <= idx <= end:
                # First question in group - add instruction
                if idx == start and (start, end) in group_instructions:
                    instruction = group_instructions[(start, end)]
                    q['prompt_md'] = f"{instruction} ||| {prompt}"
                # Other questions - keep as is (no instruction)
                break
    
    return questions


def format_first_question_in_groups(data: dict) -> dict:
    """
    Post-process normalized data to apply ||| delimiter format.
    Called after normalization to format prompts correctly.
    """
    questions = data.get('questions', [])
    instruction_md = data.get('sections', [{}])[0].get('instruction_md', '')
    
    if questions and instruction_md:
        data['questions'] = apply_prompt_delimiter_format(questions, instruction_md)
        logger.info(f"Applied ||| delimiter format to {len(questions)} questions")
    
    return data
