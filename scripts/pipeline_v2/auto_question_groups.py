#!/usr/bin/env python3
"""
Auto-detect question groups from questions and instructions.
This module provides utilities for creating question_groups automatically.
"""
import re
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)


def detect_question_groups(
    questions: List[Dict[str, Any]],
    instruction_md: Optional[str] = None,
    passage_md: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Auto-detect question groups based on:
    1. "Questions X-Y" headers in instruction_md
    2. Question type changes between consecutive questions
    3. Fallback: create single group containing all questions
    """
    if not questions:
        return []
    
    sorted_qs = sorted(questions, key=lambda q: q.get('idx', 0))
    
    # Try method 1: Parse "Questions X-Y" from instruction_md
    groups = _parse_question_headers(instruction_md or '', sorted_qs)
    if groups:
        logger.info(f"Detected {len(groups)} groups from instruction headers")
        return groups
    
    # Try method 2: Group by question type changes
    groups = _group_by_type_changes(sorted_qs, instruction_md or '')
    if len(groups) > 1:
        logger.info(f"Detected {len(groups)} groups from type changes")
        return groups
    
    # Fallback: Single group containing all questions
    if sorted_qs:
        logger.info("Creating single default group for all questions")
        return [{
            'idx': 1,
            'start_idx': sorted_qs[0].get('idx', 1),
            'end_idx': sorted_qs[-1].get('idx', len(sorted_qs)),
            'instruction_md': instruction_md or ''
        }]
    
    return []


def _parse_question_headers(instruction_md: str, questions: List[Dict]) -> List[Dict]:
    """Parse "Questions X-Y" headers from instruction_md."""
    groups = []
    pattern = r'(?:#{1,3}\s*)?(?:Questions?|QUESTIONS?)\s+(\d+)\s*[-–—]\s*(\d+)'
    matches = list(re.finditer(pattern, instruction_md, re.IGNORECASE))
    
    if not matches:
        return []
    
    for i, match in enumerate(matches):
        start_idx = int(match.group(1))
        end_idx = int(match.group(2))
        start_pos = match.start()
        end_pos = matches[i + 1].start() if i + 1 < len(matches) else len(instruction_md)
        group_instruction = instruction_md[start_pos:end_pos].strip()
        
        groups.append({
            'idx': i + 1,
            'start_idx': start_idx,
            'end_idx': end_idx,
            'instruction_md': group_instruction
        })
    
    return groups


def _group_by_type_changes(questions: List[Dict], instruction_md: str) -> List[Dict]:
    """Create groups when question type changes."""
    if not questions:
        return []
    
    groups = []
    current_type = questions[0].get('type', '')
    current_start = questions[0].get('idx', 1)
    
    for i, q in enumerate(questions):
        q_type = q.get('type', '')
        q_idx = q.get('idx', i + 1)
        
        if q_type != current_type and current_type:
            groups.append({
                'idx': len(groups) + 1,
                'start_idx': current_start,
                'end_idx': questions[i - 1].get('idx', i),
                'instruction_md': _extract_instruction_for_range(
                    instruction_md, current_start, questions[i - 1].get('idx', i)
                )
            })
            current_type = q_type
            current_start = q_idx
    
    if questions:
        groups.append({
            'idx': len(groups) + 1,
            'start_idx': current_start,
            'end_idx': questions[-1].get('idx', len(questions)),
            'instruction_md': _extract_instruction_for_range(
                instruction_md, current_start, questions[-1].get('idx', len(questions))
            )
        })
    
    return groups


def _extract_instruction_for_range(instruction_md: str, start_idx: int, end_idx: int) -> str:
    """Extract relevant instruction section for a question range."""
    pattern = rf'(?:#{1,3}\s*)?(?:Questions?|QUESTIONS?)\s+{start_idx}\s*[-–—]\s*{end_idx}'
    match = re.search(pattern, instruction_md, re.IGNORECASE)
    
    if match:
        start_pos = match.start()
        next_section = re.search(r'(?:#{1,3}\s*)?(?:Questions?|QUESTIONS?)\s+\d+', 
                                 instruction_md[match.end():], re.IGNORECASE)
        end_pos = match.end() + next_section.start() if next_section else len(instruction_md)
        return instruction_md[start_pos:end_pos].strip()
    
    return instruction_md


def validate_question_groups(groups: List[Dict], questions: List[Dict]) -> tuple:
    """Validate question groups cover all questions."""
    errors = []
    
    if not groups:
        errors.append("No question groups defined")
        return False, errors
    
    if not questions:
        return True, []
    
    q_indices = sorted(set(q.get('idx', i+1) for i, q in enumerate(questions)))
    covered = set()
    
    for g in groups:
        start, end = g.get('start_idx', 0), g.get('end_idx', 0)
        if start > end:
            errors.append(f"Group {g.get('idx')}: start_idx ({start}) > end_idx ({end})")
        for i in range(start, end + 1):
            if i in covered:
                errors.append(f"Overlap: Question {i} covered by multiple groups")
            covered.add(i)
    
    for idx in q_indices:
        if idx not in covered:
            errors.append(f"Gap: Question {idx} not covered by any group")
    
    for g in groups:
        if not g.get('instruction_md'):
            errors.append(f"Group {g.get('idx')}: missing instruction_md")
    
    return len(errors) == 0, errors


def ensure_question_groups(data: Dict[str, Any]) -> Dict[str, Any]:
    """Ensure question_groups exist in normalized data."""
    sections = data.get('sections', [])
    questions = data.get('questions', [])
    
    for section in sections:
        if section.get('question_groups'):
            continue
        
        instruction_md = section.get('instruction_md', '')
        groups = detect_question_groups(questions, instruction_md)
        
        if groups:
            section['question_groups'] = groups
            logger.info(f"Added {len(groups)} question_groups to section")
    
    return data
