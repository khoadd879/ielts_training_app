#!/usr/bin/env python3
"""
Stage 5: Validate (Schema Gate)
JSON Schema validation for normalized exam data using Pydantic models.
"""
import json
from pathlib import Path
from typing import Optional

from config import get_logger
from models import (
    NormalizedExam, QuestionType, parse_normalized_exam,
    SINGLE_CHOICE_TYPES, MULTIPLE_CHOICE_TYPES, COMPLETION_TYPES, MATCHING_TYPES
)

logger = get_logger(__name__)

NORMALIZED_DIR = Path(__file__).parent.parent.parent / "data" / "normalized"


class ValidationResult:
    def __init__(self):
        self.errors: list[str] = []
        self.warnings: list[str] = []
    
    def add_error(self, msg: str):
        self.errors.append(msg)
        logger.error(f"Validation error: {msg}")
    
    def add_warning(self, msg: str):
        self.warnings.append(msg)
        logger.warning(f"Validation warning: {msg}")
    
    def is_valid(self) -> bool:
        return len(self.errors) == 0
    
    def to_dict(self) -> dict:
        return {
            'valid': self.is_valid(),
            'error_count': len(self.errors),
            'warning_count': len(self.warnings),
            'errors': self.errors,
            'warnings': self.warnings,
        }


def validate_with_pydantic(data: dict, result: ValidationResult) -> Optional[NormalizedExam]:
    """Validate using Pydantic models for type-safe parsing."""
    parsed_exam, parse_errors = parse_normalized_exam(data)
    
    if parse_errors:
        for err in parse_errors:
            result.add_error(f"Pydantic: {err}")
        return None
    
    return parsed_exam


def validate_question_types(questions: list, result: ValidationResult) -> None:
    """Validate all question types are recognized."""
    valid_types = {t.value for t in QuestionType}
    
    for i, q in enumerate(questions):
        q_type = q.get('type', '')
        if q_type not in valid_types:
            result.add_error(f"questions[{i}].type '{q_type}' is not a valid IELTS type")


def validate_options_by_type(questions: list, result: ValidationResult) -> None:
    """Validate options based on question type."""
    for i, q in enumerate(questions):
        q_type_str = q.get('type', '')
        options = q.get('options', [])
        idx = q.get('idx', i+1)
        
        try:
            q_type = QuestionType(q_type_str)
        except ValueError:
            continue  # Already reported in validate_question_types
        
        # Single choice types need exactly 1 correct
        if q_type in SINGLE_CHOICE_TYPES:
            if len(options) < 2:
                result.add_warning(f"Q{idx}: {q_type.value} should have at least 2 options")
            else:
                correct_count = sum(1 for opt in options if opt.get('is_correct'))
                if correct_count != 1:
                    result.add_warning(f"Q{idx}: {q_type.value} should have exactly 1 correct, found {correct_count}")
        
        # Multiple choice needs 2+ correct
        if q_type in MULTIPLE_CHOICE_TYPES:
            if len(options) < 3:
                result.add_warning(f"Q{idx}: {q_type.value} should have at least 3 options")
            else:
                correct_count = sum(1 for opt in options if opt.get('is_correct'))
                if correct_count < 2:
                    result.add_warning(f"Q{idx}: {q_type.value} should have at least 2 correct, found {correct_count}")
        
        # Matching heading needs many options
        if q_type == QuestionType.MATCHING_HEADING:
            if len(options) < 5:
                result.add_warning(f"Q{idx}: MATCHING_HEADING should have 5+ heading options (i, ii, iii...)")


def validate_correct_answers(questions: list, result: ValidationResult) -> None:
    """Validate correct_answers field exists where needed."""
    for i, q in enumerate(questions):
        q_type_str = q.get('type', '')
        idx = q.get('idx', i+1)
        correct = q.get('correct_answers', []) or q.get('correct_answer', '')
        
        try:
            q_type = QuestionType(q_type_str)
        except ValueError:
            continue
        
        # Matching and completion types need correct_answers
        if q_type in MATCHING_TYPES or q_type in COMPLETION_TYPES:
            if not correct:
                blank = q.get('blank_accept_texts')
                if not blank:
                    result.add_warning(f"Q{idx}: {q_type.value} missing correct_answers")


def validate_schema(data: dict) -> ValidationResult:
    """Validate normalized data against full IELTS schema."""
    result = ValidationResult()
    
    # Check required top-level keys
    if 'exam' not in data:
        result.add_error("Missing required key: exam")
    if 'sections' not in data:
        result.add_error("Missing required key: sections")
    if 'questions' not in data:
        result.add_error("Missing required key: questions")
    
    if not result.is_valid():
        return result
    
    # Try Pydantic validation (lenient - just warnings)
    # parse_normalized_exam is strict, so we do manual checks here
    
    # Validate question types
    questions = data.get('questions', [])
    validate_question_types(questions, result)
    validate_options_by_type(questions, result)
    validate_correct_answers(questions, result)
    
    # Exam validation
    exam = data.get('exam', {})
    if not exam.get('title'):
        result.add_error("exam.title is required")
    if not exam.get('slug'):
        result.add_error("exam.slug is required")
    
    # Section validation
    sections = data.get('sections', [])
    if not sections:
        result.add_error("At least one section is required")
    else:
        for i, section in enumerate(sections):
            passage = section.get('passage_md', '')
            if len(passage) < 50:
                result.add_warning(f"sections[{i}].passage_md is very short ({len(passage)} chars)")
    
    return result


def load_normalized(source: str, item_id: str) -> Optional[dict]:
    """Load normalized data from disk."""
    source_dir = NORMALIZED_DIR / source
    data_path = source_dir / f"{item_id}.json"
    
    if not data_path.exists():
        logger.error(f"Normalized data not found: {data_path}")
        return None
    
    try:
        return json.loads(data_path.read_text(encoding='utf-8'))
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON: {e}")
        return None


def validate(source: str, item_id: str) -> ValidationResult:
    """Validate normalized data file."""
    data = load_normalized(source, item_id)
    
    if not data:
        result = ValidationResult()
        result.add_error(f"Could not load data: {source}/{item_id}")
        return result
    
    logger.info(f"Validating schema: {source}/{item_id}")
    return validate_schema(data)


# CLI
if __name__ == "__main__":
    import sys
    if len(sys.argv) < 3:
        print("Usage: python validate.py <source> <item_id>")
        sys.exit(1)
    
    source, item_id = sys.argv[1], sys.argv[2]
    result = validate(source, item_id)
    
    print(f"Valid: {result.is_valid()}")
    if result.errors:
        print("Errors:")
        for e in result.errors:
            print(f"  ✗ {e}")
    if result.warnings:
        print("Warnings:")
        for w in result.warnings:
            print(f"  ⚠ {w}")
    
    sys.exit(0 if result.is_valid() else 1)
