#!/usr/bin/env python3
"""
Exam Data Validation Module
===========================
Validates exam data against schema and content rules.

Usage:
    python validate_exam.py [JSON_FILE]
    
    # Validate all JSON files in output directory
    python validate_exam.py --all
"""

import json
import re
import os
import sys
from pathlib import Path
from typing import Optional
import logging

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

# Paths
SCRIPT_DIR = Path(__file__).parent
SCHEMA_PATH = SCRIPT_DIR / "exam-import.schema.json"
OUTPUT_DIR = SCRIPT_DIR / "output"

# Noise patterns to detect in passages
NOISE_PATTERNS = [
    r'SHARE THIS PAGE',
    r'CONTACT US',
    r'IELTS QUESTIONS',
    r'LIFE IN THE UK TEST',
    r'While using this site',
    r'terms of use, cookie and privacy policy',
    r'Dear readers,',
    r'OK, I understand',
    r'https://www\.ielts-',
    r'Written by IELTS',
    r'Last Updated:',
    r'Hits: \d+',
    r'GT Reading Test \d+',
    r'General Training Reading Mock Test',
]

# Expected question types for IELTS Reading
VALID_QUESTION_TYPES = [
    'MULTIPLE_CHOICE_SINGLE',
    'MULTIPLE_CHOICE_MULTIPLE',
    'TRUE_FALSE_NOT_GIVEN',
    'YES_NO_NOT_GIVEN',
    'SUMMARY_COMPLETION',
    'TABLE_COMPLETION',
    'NOTE_COMPLETION',
    'SENTENCE_COMPLETION',
    'SHORT_ANSWER',
    'MATCHING_HEADING',
    'MATCHING_INFORMATION',
    'MATCHING_FEATURES',
    'MATCHING_ENDINGS',
    'CLASSIFICATION',
]


class ValidationResult:
    """Container for validation errors and warnings."""
    
    def __init__(self, exam_title: str = ""):
        self.exam_title = exam_title
        self.errors: list[str] = []
        self.warnings: list[str] = []
    
    def add_error(self, message: str):
        self.errors.append(message)
    
    def add_warning(self, message: str):
        self.warnings.append(message)
    
    def is_valid(self) -> bool:
        return len(self.errors) == 0
    
    def summary(self) -> str:
        lines = [f"=== Validation: {self.exam_title} ==="]
        if self.is_valid():
            lines.append("✅ PASSED")
        else:
            lines.append(f"❌ FAILED ({len(self.errors)} errors)")
        
        if self.errors:
            lines.append("\nErrors:")
            for e in self.errors:
                lines.append(f"  - {e}")
        
        if self.warnings:
            lines.append("\nWarnings:")
            for w in self.warnings:
                lines.append(f"  ⚠ {w}")
        
        return "\n".join(lines)


def load_schema() -> dict:
    """Load the JSON schema for validation."""
    try:
        with open(SCHEMA_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        logger.error(f"Schema file not found: {SCHEMA_PATH}")
        return {}


def validate_json_schema(data: dict, result: ValidationResult) -> None:
    """Validate data against exam-import.schema.json."""
    # Basic schema checks (without jsonschema library dependency)
    
    # Check required top-level fields
    if 'schemaVersion' not in data:
        result.add_error("Missing required field: schemaVersion")
    elif not re.match(r'^\d+\.\d+\.\d+$', str(data.get('schemaVersion', ''))):
        result.add_error(f"Invalid schemaVersion format: {data.get('schemaVersion')}")
    
    if 'exams' not in data:
        result.add_error("Missing required field: exams")
        return
    
    if not isinstance(data['exams'], list) or len(data['exams']) == 0:
        result.add_error("exams must be a non-empty array")
        return
    
    for i, exam in enumerate(data['exams']):
        _validate_exam(exam, i, result)


def _validate_exam(exam: dict, idx: int, result: ValidationResult) -> None:
    """Validate a single exam object."""
    prefix = f"exams[{idx}]"
    
    # Required fields
    required = ['id', 'slug', 'title', 'category', 'level', 'durationMin', 'sections']
    for field in required:
        if field not in exam:
            result.add_error(f"{prefix}: Missing required field: {field}")
    
    # Slug format
    slug = exam.get('slug', '')
    if slug and not re.match(r'^[a-z0-9]+(?:-[a-z0-9]+)*$', slug):
        result.add_error(f"{prefix}: Invalid slug format: {slug}")
    
    # Category enum
    valid_categories = ['IELTS', 'TOEIC', 'VSTEP', 'PLACEMENT']
    if exam.get('category') not in valid_categories:
        result.add_error(f"{prefix}: Invalid category: {exam.get('category')}")
    
    # Level enum
    valid_levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
    if exam.get('level') not in valid_levels:
        result.add_error(f"{prefix}: Invalid level: {exam.get('level')}")
    
    # Sections
    sections = exam.get('sections', [])
    if not sections:
        result.add_error(f"{prefix}: sections must not be empty")
        return
    
    for j, section in enumerate(sections):
        _validate_section(section, f"{prefix}.sections[{j}]", result)


def _validate_section(section: dict, prefix: str, result: ValidationResult) -> None:
    """Validate a section object."""
    # Required fields
    for field in ['id', 'idx', 'title', 'questions']:
        if field not in section:
            result.add_error(f"{prefix}: Missing required field: {field}")
    
    # Validate questions
    questions = section.get('questions', [])
    if not questions:
        result.add_error(f"{prefix}: questions must not be empty")
        return
    
    for k, question in enumerate(questions):
        _validate_question(question, f"{prefix}.questions[{k}]", result)


def _validate_question(question: dict, prefix: str, result: ValidationResult) -> None:
    """Validate a question object."""
    # Required fields
    required = ['id', 'idx', 'type', 'skill', 'difficulty', 'promptMd']
    for field in required:
        if field not in question:
            result.add_error(f"{prefix}: Missing required field: {field}")
    
    # Type enum
    q_type = question.get('type', '')
    if q_type not in VALID_QUESTION_TYPES:
        result.add_error(f"{prefix}: Invalid question type: {q_type}")
    
    # Skill enum
    valid_skills = ['SPEAKING', 'LISTENING', 'WRITING', 'READING']
    if question.get('skill') not in valid_skills:
        result.add_error(f"{prefix}: Invalid skill: {question.get('skill')}")
    
    # PromptMd not empty
    prompt = question.get('promptMd', '')
    if not prompt or len(prompt.strip()) < 3:
        result.add_error(f"{prefix}: promptMd is empty or too short")


def detect_noise_in_passage(passage: str, result: ValidationResult) -> None:
    """Detect noise patterns in passage content."""
    for pattern in NOISE_PATTERNS:
        if re.search(pattern, passage, re.IGNORECASE):
            result.add_error(f"Passage contains noise: '{pattern}'")


def validate_content(data: dict, result: ValidationResult) -> None:
    """Validate content quality: noise detection, prompt checks, etc."""
    
    for exam in data.get('exams', []):
        result.exam_title = exam.get('title', 'Unknown')
        
        for section in exam.get('sections', []):
            # Check passage for noise
            passage = section.get('instructionsMd', '')
            if passage:
                detect_noise_in_passage(passage, result)
                
                # Warning: passage too short
                if len(passage) < 500:
                    result.add_warning(f"Passage seems short ({len(passage)} chars)")
                
                # Check for paragraph labels
                has_labels = bool(re.search(r'\b(Paragraph|Section)\s+[A-F]\b', passage, re.IGNORECASE))
                has_letter_bold = bool(re.search(r'\*\*[A-F]\*\*|\n[A-F]\s+[A-Z]', passage))
                if not has_labels and not has_letter_bold and len(passage) > 1000:
                    result.add_warning("Long passage without paragraph labels (A, B, C...)")
            
            # Check questions
            for question in section.get('questions', []):
                q_type = question.get('type', '')
                prompt = question.get('promptMd', '')
                
                # MATCHING types need matchPairs
                if q_type.startswith('MATCHING_'):
                    match_pairs = question.get('matchPairs', {})
                    if not match_pairs:
                        result.add_warning(f"Q{question.get('idx')}: {q_type} has no matchPairs")
                
                # SUMMARY_COMPLETION needs blank
                if q_type == 'SUMMARY_COMPLETION':
                    if '_______' not in prompt and '...' not in prompt:
                        result.add_warning(f"Q{question.get('idx')}: SUMMARY_COMPLETION has no blank marker")
                    
                    blank_accept = question.get('blankAcceptTexts', {})
                    if not blank_accept:
                        result.add_error(f"Q{question.get('idx')}: SUMMARY_COMPLETION has no blankAcceptTexts")
                
                # MULTIPLE_CHOICE needs options
                if q_type.startswith('MULTIPLE_CHOICE'):
                    options = question.get('options', [])
                    if len(options) < 2:
                        result.add_error(f"Q{question.get('idx')}: {q_type} needs at least 2 options")


def validate_exam_file(filepath: str) -> ValidationResult:
    """Validate a single exam JSON file."""
    result = ValidationResult(filepath)
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        result.add_error(f"Invalid JSON: {e}")
        return result
    except FileNotFoundError:
        result.add_error(f"File not found: {filepath}")
        return result
    
    # Schema validation
    validate_json_schema(data, result)
    
    # Content validation
    if result.is_valid():
        validate_content(data, result)
    
    return result


def validate_all_files(output_dir: str = None) -> list[ValidationResult]:
    """Validate all JSON files in the output directory."""
    if output_dir is None:
        output_dir = OUTPUT_DIR
    
    results = []
    output_path = Path(output_dir)
    
    if not output_path.exists():
        logger.error(f"Output directory not found: {output_dir}")
        return results
    
    for json_file in sorted(output_path.glob("*.json")):
        result = validate_exam_file(str(json_file))
        results.append(result)
        print(result.summary())
        print()
    
    # Summary
    total = len(results)
    passed = sum(1 for r in results if r.is_valid())
    print(f"=== SUMMARY: {passed}/{total} passed ===")
    
    return results


def main():
    """Main entry point."""
    if len(sys.argv) < 2:
        print(__doc__)
        return
    
    if sys.argv[1] == '--all':
        validate_all_files()
    else:
        filepath = sys.argv[1]
        result = validate_exam_file(filepath)
        print(result.summary())
        sys.exit(0 if result.is_valid() else 1)


if __name__ == "__main__":
    main()
