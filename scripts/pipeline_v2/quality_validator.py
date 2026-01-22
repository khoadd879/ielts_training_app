#!/usr/bin/env python3
"""
AI Quality Validator for IELTS Pipeline
Implements 5 AI roles as defined by user:
1. Validate input - check raw HTML quality
2. Normalize IELTS - ensure IELTS standard format
3. Check JSON format - validate schema
4. Validate output - check SQL correctness
5. Ensure production quality - final QA pass

Uses Gemini AI for intelligent validation.
"""
import json
import re
import os
from pathlib import Path
from typing import Optional
import google.generativeai as genai
from dotenv import load_dotenv

from config import get_logger, DATA_DIR

logger = get_logger(__name__)
load_dotenv()

# Configure Gemini
genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
MODEL = genai.GenerativeModel('gemini-1.5-flash')


class QualityResult:
    """Result of quality validation."""
    def __init__(self):
        self.issues: list[str] = []
        self.fixes: list[dict] = []
        self.is_production_ready = False
    
    def add_issue(self, issue: str):
        self.issues.append(issue)
    
    def add_fix(self, question_idx: int, field: str, old_value: str, new_value: str):
        self.fixes.append({
            'idx': question_idx,
            'field': field,
            'old': old_value,
            'new': new_value
        })
    
    def to_dict(self) -> dict:
        return {
            'issues': self.issues,
            'fixes': self.fixes,
            'is_production_ready': self.is_production_ready,
            'issue_count': len(self.issues),
            'fix_count': len(self.fixes)
        }


# ============================================================================
# ROLE 1: Validate Input
# ============================================================================
def validate_input(source: str, item_id: str) -> QualityResult:
    """Role 1: Validate raw HTML input quality."""
    result = QualityResult()
    
    raw_path = DATA_DIR / "raw" / source / f"{item_id}.html"
    if not raw_path.exists():
        result.add_issue("Raw HTML file not found")
        return result
    
    html = raw_path.read_text()
    
    # Check minimum length
    if len(html) < 5000:
        result.add_issue(f"HTML too short: {len(html)} chars (need 5000+)")
    
    # Check for essential IELTS content markers
    markers = ['question', 'passage', 'answer']
    for marker in markers:
        if marker.lower() not in html.lower():
            result.add_issue(f"Missing marker: {marker}")
    
    return result


# ============================================================================
# ROLE 2: Normalize IELTS with AI
# ============================================================================
def normalize_ielts_with_ai(source: str, item_id: str) -> QualityResult:
    """Role 2: Use AI to normalize and check IELTS standard format."""
    result = QualityResult()
    
    normalized_path = DATA_DIR / "normalized" / source / f"{item_id}.json"
    if not normalized_path.exists():
        result.add_issue("Normalized JSON not found")
        return result
    
    data = json.loads(normalized_path.read_text())
    
    # Also load cleaned text for reference
    cleaned_path = DATA_DIR / "cleaned" / source / f"{item_id}.txt"
    cleaned_text = cleaned_path.read_text() if cleaned_path.exists() else ""
    
    # Extract summary for AI
    questions_summary = []
    for q in data.get('questions', []):
        questions_summary.append({
            'idx': q.get('idx'),
            'type': q.get('type'),
            'prompt': q.get('prompt_md', '')[:100],
            'answer': q.get('correct_answers', [''])[0] if q.get('correct_answers') else ''
        })
    
    prompt = f"""You are an IELTS exam data validator. Check this data for issues:

## Questions (first 10):
{json.dumps(questions_summary[:10], indent=2)}

## Source Text (first 2000 chars):
{cleaned_text[:2000]}

## Check for:
1. Question types match the answer format (e.g., SHORT_ANSWER should have word answers, not letters)
2. Prompts are actual questions, not instructions like "Write the correct letter"
3. Answers are non-empty and in correct format
4. TFNG/YNNG types have proper TRUE/FALSE/NOT GIVEN or YES/NO/NOT GIVEN answers

## Output as JSON:
{{
    "issues": ["issue 1", "issue 2"],
    "fixes": [
        {{"idx": 1, "field": "type", "old": "MATCHING_INFORMATION", "new": "SHORT_ANSWER", "reason": "answer is a year not a letter"}}
    ],
    "is_production_ready": false
}}

Only output the JSON, nothing else."""

    try:
        response = MODEL.generate_content(prompt)
        text = response.text.strip()
        # Extract JSON from response
        if '```' in text:
            text = re.search(r'```(?:json)?\s*(.*?)```', text, re.DOTALL).group(1)
        ai_result = json.loads(text)
        
        for issue in ai_result.get('issues', []):
            result.add_issue(f"[AI] {issue}")
        
        for fix in ai_result.get('fixes', []):
            result.add_fix(fix['idx'], fix['field'], fix.get('old', ''), fix.get('new', ''))
        
        result.is_production_ready = ai_result.get('is_production_ready', False)
        
    except Exception as e:
        logger.error(f"AI validation failed: {e}")
        result.add_issue(f"AI validation error: {e}")
    
    return result


# ============================================================================
# ROLE 3: Check JSON Format
# ============================================================================
def check_json_format(source: str, item_id: str) -> QualityResult:
    """Role 3: Validate JSON schema and IELTS format."""
    result = QualityResult()
    
    normalized_path = DATA_DIR / "normalized" / source / f"{item_id}.json"
    if not normalized_path.exists():
        result.add_issue("Normalized JSON not found")
        return result
    
    data = json.loads(normalized_path.read_text())
    
    # Check required fields
    required = ['exam', 'sections', 'questions']
    for field in required:
        if field not in data:
            result.add_issue(f"Missing required field: {field}")
    
    # Check questions
    for q in data.get('questions', []):
        idx = q.get('idx')
        
        # Check prompt
        prompt = q.get('prompt_md', '')
        if not prompt or prompt.startswith('Question '):
            result.add_issue(f"Q{idx}: Invalid prompt")
        if prompt and prompt[0].islower():
            result.add_issue(f"Q{idx}: Prompt starts with lowercase")
        
        # Check type vs answer
        q_type = q.get('type', '')
        answer = q.get('correct_answers', [''])[0] if q.get('correct_answers') else ''
        
        if q_type in ['MATCHING_INFORMATION', 'MATCHING_FEATURES'] and len(answer) > 1:
            if not answer[0].isupper() or len(answer) > 3:
                result.add_issue(f"Q{idx}: {q_type} should have letter answer, got '{answer}'")
        
        if q_type in ['TRUE_FALSE_NOT_GIVEN', 'YES_NO_NOT_GIVEN']:
            valid_answers = ['TRUE', 'FALSE', 'NOT GIVEN', 'YES', 'NO']
            if answer.upper() not in valid_answers:
                result.add_issue(f"Q{idx}: {q_type} invalid answer: '{answer}'")
    
    return result


# ============================================================================
# ROLE 4: Validate SQL Output
# ============================================================================
def validate_sql_output(source: str, item_id: str) -> QualityResult:
    """Role 4: Validate generated SQL file."""
    result = QualityResult()
    
    # Find SQL file
    seeds_dir = DATA_DIR.parent / "deploy" / "seeds"
    sql_files = list(seeds_dir.glob(f"seed_exam*{item_id[:30]}*.sql"))
    
    if not sql_files:
        result.add_issue("SQL seed file not found")
        return result
    
    sql_path = sql_files[0]
    sql = sql_path.read_text()
    
    # Basic SQL validation
    if 'INSERT INTO' not in sql:
        result.add_issue("SQL missing INSERT statements")
    
    if 'exam_questions' not in sql:
        result.add_issue("SQL missing exam_questions table")
    
    # Check for common SQL errors
    if "''" in sql and "NULL" not in sql:
        result.add_issue("SQL may have empty string values")
    
    return result


# ============================================================================
# ROLE 5: Ensure Production Quality
# ============================================================================
def ensure_production_quality(source: str, item_id: str) -> QualityResult:
    """Role 5: Final QA pass to ensure production readiness."""
    result = QualityResult()
    
    normalized_path = DATA_DIR / "normalized" / source / f"{item_id}.json"
    if not normalized_path.exists():
        result.add_issue("Normalized JSON not found")
        return result
    
    data = json.loads(normalized_path.read_text())
    questions = data.get('questions', [])
    
    # Production quality checks
    total = len(questions)
    missing_answers = sum(1 for q in questions if not q.get('correct_answers') or not q['correct_answers'][0])
    placeholder_prompts = sum(1 for q in questions if q.get('prompt_md', '').startswith('Question'))
    
    if missing_answers > 0:
        result.add_issue(f"{missing_answers}/{total} questions missing answers")
    
    if placeholder_prompts > 0:
        result.add_issue(f"{placeholder_prompts}/{total} questions have placeholder prompts")
    
    # Type consistency check
    type_answer_mismatches = []
    for q in questions:
        idx = q.get('idx')
        q_type = q.get('type', '')
        answer = q.get('correct_answers', [''])[0] if q.get('correct_answers') else ''
        
        # SHORT_ANSWER should not have single letter
        if q_type in ['SHORT_ANSWER', 'SUMMARY_COMPLETION']:
            if answer and len(answer) == 1 and answer.isupper():
                type_answer_mismatches.append(f"Q{idx}: {q_type} has letter answer '{answer}'")
        
        # MATCHING types should have letter
        if q_type in ['MATCHING_INFORMATION', 'MATCHING_FEATURES']:
            if answer and (not answer[0].isupper() or len(answer) > 3):
                # Check if it's a year or number (common mismatch)
                if answer.isdigit():
                    type_answer_mismatches.append(f"Q{idx}: {q_type} should be SHORT_ANSWER (answer is '{answer}')")
    
    for mismatch in type_answer_mismatches:
        result.add_issue(mismatch)
    
    # Set production ready flag
    result.is_production_ready = (
        missing_answers == 0 and 
        placeholder_prompts == 0 and 
        len(type_answer_mismatches) == 0
    )
    
    return result


# ============================================================================
# MAIN: Run All 5 Roles
# ============================================================================
def run_quality_check(source: str, item_id: str, use_ai: bool = True) -> dict:
    """Run all 5 quality check roles."""
    results = {}
    
    logger.info(f"Running quality check: {source}/{item_id}")
    
    # Role 1: Validate Input
    logger.info("Role 1: Validating input...")
    results['input'] = validate_input(source, item_id).to_dict()
    
    # Role 2: Normalize IELTS with AI
    if use_ai:
        logger.info("Role 2: AI IELTS normalization check...")
        results['normalize'] = normalize_ielts_with_ai(source, item_id).to_dict()
    else:
        results['normalize'] = {'issues': [], 'fixes': [], 'skipped': True}
    
    # Role 3: Check JSON Format
    logger.info("Role 3: Checking JSON format...")
    results['json'] = check_json_format(source, item_id).to_dict()
    
    # Role 4: Validate SQL Output
    logger.info("Role 4: Validating SQL output...")
    results['sql'] = validate_sql_output(source, item_id).to_dict()
    
    # Role 5: Ensure Production Quality
    logger.info("Role 5: Production quality check...")
    results['production'] = ensure_production_quality(source, item_id).to_dict()
    
    # Summary
    total_issues = sum(len(r.get('issues', [])) for r in results.values())
    total_fixes = sum(len(r.get('fixes', [])) for r in results.values())
    is_ready = results['production'].get('is_production_ready', False)
    
    results['summary'] = {
        'total_issues': total_issues,
        'total_fixes': total_fixes,
        'is_production_ready': is_ready
    }
    
    logger.info(f"Quality check complete: {total_issues} issues, ready={is_ready}")
    
    return results


def apply_ai_fixes(source: str, item_id: str, results: dict) -> bool:
    """Apply fixes suggested by AI."""
    normalized_path = DATA_DIR / "normalized" / source / f"{item_id}.json"
    if not normalized_path.exists():
        return False
    
    data = json.loads(normalized_path.read_text())
    
    fixes_applied = 0
    for role_result in results.values():
        if not isinstance(role_result, dict):
            continue
        for fix in role_result.get('fixes', []):
            idx = fix.get('idx')
            field = fix.get('field')
            new_value = fix.get('new')
            
            if not all([idx, field, new_value]):
                continue
            
            for q in data.get('questions', []):
                if q.get('idx') == idx:
                    if field == 'type':
                        q['type'] = new_value
                    elif field == 'prompt':
                        q['prompt_md'] = new_value
                    elif field == 'answer':
                        q['correct_answers'] = [new_value]
                    fixes_applied += 1
                    break
    
    if fixes_applied > 0:
        normalized_path.write_text(json.dumps(data, indent=2, ensure_ascii=False))
        logger.info(f"Applied {fixes_applied} AI fixes")
        return True
    
    return False


# CLI
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 3:
        print("Usage: python quality_validator.py <source> <item_id> [--no-ai]")
        sys.exit(1)
    
    source, item_id = sys.argv[1], sys.argv[2]
    use_ai = '--no-ai' not in sys.argv
    
    results = run_quality_check(source, item_id, use_ai)
    
    print(json.dumps(results, indent=2))
    
    if results['summary']['is_production_ready']:
        print("\n✅ PRODUCTION READY")
        sys.exit(0)
    else:
        print(f"\n⚠️ {results['summary']['total_issues']} issues found")
        sys.exit(1)
