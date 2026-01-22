#!/usr/bin/env python3
"""
Data Validation Script for IELTS Exam Crawler

Validates raw_data.json or normalized_exam.json against expected schema and rules.

Usage:
    python validate_data.py [file_path]
    python validate_data.py raw_data.json
    python validate_data.py normalized_exam.json
"""

import json
import sys
from pathlib import Path
from typing import Any

# Valid question types
VALID_QUESTION_TYPES = {
    'MATCHING_HEADING',
    'MATCHING_INFORMATION',
    'MATCHING_FEATURES',
    'MATCHING_ENDINGS',
    'TRUE_FALSE_NOT_GIVEN',
    'YES_NO_NOT_GIVEN',
    'MULTIPLE_CHOICE_SINGLE',
    'MULTIPLE_CHOICE_MULTIPLE',
    'SUMMARY_COMPLETION',
    'TABLE_COMPLETION',
    'NOTE_COMPLETION',
    'FORM_COMPLETION',
    'SENTENCE_COMPLETION',
    'SHORT_ANSWER',
    'DIAGRAM_LABEL',
    'MAP_LABEL',
    'FLOW_CHART',
    'CLASSIFICATION'
}

# Question types that should have options
TYPES_WITH_OPTIONS = {
    'MATCHING_HEADING',
    'MULTIPLE_CHOICE_SINGLE',
    'MULTIPLE_CHOICE_MULTIPLE',
}

# Question types that need MatchPairs
TYPES_WITH_MATCH_PAIRS = {
    'MATCHING_HEADING',
    'MATCHING_INFORMATION',
    'MATCHING_FEATURES',
    'MATCHING_ENDINGS',
    'CLASSIFICATION'
}


class ValidationResult:
    def __init__(self):
        self.errors = []
        self.warnings = []
        self.info = []
    
    def add_error(self, msg: str):
        self.errors.append(f"❌ ERROR: {msg}")
    
    def add_warning(self, msg: str):
        self.warnings.append(f"⚠️  WARNING: {msg}")
    
    def add_info(self, msg: str):
        self.info.append(f"ℹ️  INFO: {msg}")
    
    def has_errors(self):
        return len(self.errors) > 0
    
    def print_results(self):
        print("\n" + "=" * 60)
        print("VALIDATION RESULTS")
        print("=" * 60)
        
        if self.errors:
            print(f"\n🔴 ERRORS ({len(self.errors)}):")
            for e in self.errors:
                print(f"  {e}")
        
        if self.warnings:
            print(f"\n🟡 WARNINGS ({len(self.warnings)}):")
            for w in self.warnings:
                print(f"  {w}")
        
        if self.info:
            print(f"\n🔵 INFO ({len(self.info)}):")
            for i in self.info:
                print(f"  {i}")
        
        print("\n" + "-" * 60)
        if self.has_errors():
            print("❌ VALIDATION FAILED")
        else:
            print("✅ VALIDATION PASSED")
        print("-" * 60)


def validate_raw_data(data: dict, result: ValidationResult):
    """Validate raw_data.json format."""
    
    # Check required fields
    if 'title' not in data or not data['title']:
        result.add_error("Missing or empty 'title'")
    else:
        result.add_info(f"Title: {data['title']}")
    
    if 'questions' not in data:
        result.add_error("Missing 'questions' array")
        return
    
    questions = data['questions']
    result.add_info(f"Total questions: {len(questions)}")
    
    # Group by type for summary
    type_counts = {}
    
    for i, q in enumerate(questions, 1):
        q_idx = q.get('idx', i)
        
        # Required fields
        if 'type' not in q:
            result.add_error(f"Q{q_idx}: Missing 'type'")
        else:
            q_type = q['type']
            type_counts[q_type] = type_counts.get(q_type, 0) + 1
            
            if q_type not in VALID_QUESTION_TYPES:
                result.add_error(f"Q{q_idx}: Invalid type '{q_type}'")
        
        # Prompt validation
        prompt = q.get('prompt', '')
        if not prompt:
            result.add_error(f"Q{q_idx}: Missing 'prompt'")
        elif len(prompt) < 10:
            result.add_warning(f"Q{q_idx}: Prompt too short ({len(prompt)} chars)")
        elif prompt.startswith("Question ") and len(prompt) < 15:
            result.add_warning(f"Q{q_idx}: Generic prompt '{prompt}'")
        
        # Explanation validation
        explanation = q.get('explanation', '')
        if not explanation:
            result.add_warning(f"Q{q_idx}: Missing 'explanation'")
        elif len(explanation) < 20:
            result.add_warning(f"Q{q_idx}: Short explanation ({len(explanation)} chars)")
        
        # Options validation
        options = q.get('options', [])
        q_type = q.get('type', '')
        
        if q_type in TYPES_WITH_OPTIONS:
            if not options:
                result.add_warning(f"Q{q_idx}: {q_type} should have options")
            elif q_type == 'MULTIPLE_CHOICE_SINGLE' and len(options) < 3:
                result.add_warning(f"Q{q_idx}: MCQ has only {len(options)} options")
            elif q_type == 'MATCHING_HEADING' and len(options) < 5:
                result.add_warning(f"Q{q_idx}: MATCHING_HEADING has only {len(options)} headings")
        
        # Option content validation
        for j, opt in enumerate(options):
            if isinstance(opt, dict):
                if not opt.get('label') and not opt.get('text'):
                    result.add_warning(f"Q{q_idx} Option {j+1}: Empty option")
    
    # Print summary
    result.add_info("Question types:")
    for q_type, count in sorted(type_counts.items()):
        result.add_info(f"  - {q_type}: {count}")


def validate_normalized_data(data: dict, result: ValidationResult):
    """Validate normalized_exam.json format."""
    
    if 'exams' not in data:
        result.add_error("Missing 'exams' array")
        return
    
    for exam in data['exams']:
        title = exam.get('title', 'Unknown')
        result.add_info(f"Exam: {title}")
        
        if not exam.get('slug'):
            result.add_error("Missing 'slug'")
        
        sections = exam.get('sections', [])
        if not sections:
            result.add_error("No sections found")
            continue
        
        for sec in sections:
            questions = sec.get('questions', [])
            result.add_info(f"Section '{sec.get('title', 'Unknown')}': {len(questions)} questions")
            
            # Validate each question
            type_counts = {}
            for q in questions:
                q_idx = q.get('idx', 0)
                q_type = q.get('type', 'UNKNOWN')
                type_counts[q_type] = type_counts.get(q_type, 0) + 1
                
                # Check promptMd
                prompt = q.get('promptMd', '')
                if not prompt or len(prompt) < 5:
                    result.add_warning(f"Q{q_idx}: Empty or short promptMd")
                
                # Check explanationMd
                explanation = q.get('explanationMd', '')
                if not explanation:
                    result.add_warning(f"Q{q_idx}: Missing explanationMd")
                
                # Check options for MCQ
                options = q.get('options', [])
                if q_type in TYPES_WITH_OPTIONS and not options:
                    result.add_warning(f"Q{q_idx}: {q_type} missing options")
                
                # Check matchPairs for matching types
                match_pairs = q.get('matchPairs', {})
                if q_type in TYPES_WITH_MATCH_PAIRS and not match_pairs:
                    result.add_warning(f"Q{q_idx}: {q_type} missing matchPairs")
            
            result.add_info("Question types:")
            for q_type, count in sorted(type_counts.items()):
                result.add_info(f"  - {q_type}: {count}")


def main():
    # Default to raw_data.json if no argument
    file_path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("raw_data.json")
    
    if not file_path.exists():
        print(f"❌ File not found: {file_path}")
        sys.exit(1)
    
    print(f"📋 Validating: {file_path}")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    result = ValidationResult()
    
    # Detect format and validate
    if 'exams' in data:
        validate_normalized_data(data, result)
    elif 'questions' in data:
        validate_raw_data(data, result)
    else:
        result.add_error("Unknown file format")
    
    result.print_results()
    
    # Exit with error code if validation failed
    sys.exit(1 if result.has_errors() else 0)


if __name__ == "__main__":
    main()
