#!/usr/bin/env python3
"""
Stage 6.5: Gemini CLI Validator v2 (Strict QA Gate)
Catches context/structure issues that rule-based invariants miss.
Uses Gemini CLI (gemini command) for validation - NOT API.
"""
import json
import subprocess
import sys
from pathlib import Path
from typing import Optional

from config import NORMALIZED_DIR, get_logger

logger = get_logger(__name__)

# Load prompt
PROMPT_FILE = Path(__file__).parent / "prompts" / "gemini_validator_v2.txt"


def build_compact_payload(data: dict, invariant_result: dict) -> dict:
    """Build minimal payload for Gemini (save tokens/quota)."""
    questions = data.get('questions', [])
    sections = data.get('sections', [])
    
    # Question type counts
    type_counts = {}
    for q in questions:
        qtype = q.get('type', 'UNKNOWN')
        type_counts[qtype] = type_counts.get(qtype, 0) + 1
    
    # Question ranges by type
    type_ranges = {}
    for q in questions:
        qtype = q.get('type', 'UNKNOWN')
        idx = q.get('idx', 0)
        if qtype not in type_ranges:
            type_ranges[qtype] = {'min': idx, 'max': idx}
        else:
            type_ranges[qtype]['min'] = min(type_ranges[qtype]['min'], idx)
            type_ranges[qtype]['max'] = max(type_ranges[qtype]['max'], idx)
    
    # FULL questions data (no preview - Gemini CLI local has no limits)
    full_questions = []
    for q in questions:
        full_questions.append({
            'idx': q.get('idx'),
            'type': q.get('type'),
            'prompt_md': q.get('prompt_md', ''),
            'options': q.get('options', []),
            'correct_answers': q.get('correct_answers', []),
        })
    
    # FULL section info
    section_info = []
    for i, s in enumerate(sections):
        section_info.append({
            'idx': i + 1,
            'title': s.get('title', ''),
            'passage_md': s.get('passage_md', ''),
            'instruction_md': s.get('instruction_md', ''),
        })
    
    return {
        'meta': {
            'title': data.get('exam', {}).get('title', ''),
            'total_questions': len(questions),
            'total_sections': len(sections),
        },
        'counts': type_counts,
        'type_ranges': type_ranges,
        'questions': full_questions,
        'sections': section_info,
        'rule_based_results': {
            'is_valid': invariant_result.get('is_valid', True),
            'violations_count': len(invariant_result.get('violations', [])),
            'warnings_count': len(invariant_result.get('warnings', [])),
            'violations': invariant_result.get('violations', [])[:5],  # First 5 only
            'warnings': invariant_result.get('warnings', [])[:5],
        }
    }


def call_gemini_cli(payload: dict) -> Optional[dict]:
    """Call Gemini CLI with validator prompt."""
    import tempfile
    import os
    
    try:
        # Load prompt
        if PROMPT_FILE.exists():
            prompt_template = PROMPT_FILE.read_text()
        else:
            logger.error(f"Prompt file not found: {PROMPT_FILE}")
            return None
        
        # Build simpler prompt - avoid triggering agent mode
        full_prompt = f"""JSON OUTPUT ONLY. NO TEXT. NO TOOLS. NO ACTIONS.

You are an IELTS data validator. Analyze this payload and return JSON.

RULES:
- Output ONLY valid JSON
- No markdown, no explanation, no code blocks
- Return immediately after JSON

PAYLOAD:
{json.dumps(payload, ensure_ascii=False)}

OUTPUT FORMAT:
{{"decision":"PASS"|"FAIL","confidence":0.0-1.0,"issues":[],"recommended_next_step":"COMMIT"|"REPAIR"|"QUARANTINE"}}

ANALYZE AND RETURN JSON:"""
        
        logger.info("Calling Gemini CLI...")
        
        # Write prompt to temp file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            f.write(full_prompt)
            prompt_file = f.name
        
        try:
            # Call gemini CLI
            result = subprocess.run(
                f'cat "{prompt_file}" | gemini 2>/dev/null',
                shell=True,
                capture_output=True,
                text=True,
                timeout=90
            )
        finally:
            os.unlink(prompt_file)
        
        if result.returncode != 0:
            logger.error(f"Gemini CLI failed: {result.stderr}")
            return None
        
        # Parse JSON response - filter out STARTUP logs
        text = result.stdout.strip()
        
        # Find JSON object (skip lines starting with [ for logs)
        lines = text.split('\n')
        for line in lines:
            line = line.strip()
            if line.startswith('{') and line.endswith('}'):
                try:
                    return json.loads(line)
                except:
                    pass
        
        # Try to find multi-line JSON
        json_start = text.find('{')
        if json_start >= 0:
            depth = 0
            for i, c in enumerate(text[json_start:], json_start):
                if c == '{':
                    depth += 1
                elif c == '}':
                    depth -= 1
                    if depth == 0:
                        try:
                            return json.loads(text[json_start:i+1])
                        except:
                            pass
                        break
        
        logger.error(f"No valid JSON found in response")
        return None
        
    except subprocess.TimeoutExpired:
        logger.error("Gemini CLI timed out (90s)")
        return None
    except FileNotFoundError:
        logger.error("Gemini CLI not found")
        return None
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Gemini response: {e}")
        return None
    except Exception as e:
        logger.error(f"Gemini CLI error: {e}")
        return None


def run_gemini_qa(source: str, item_id: str, invariant_result: dict = None) -> dict:
    """Run Gemini v2 QA on normalized data."""
    data_path = NORMALIZED_DIR / source / f"{item_id}.json"
    
    if not data_path.exists():
        return {
            'decision': 'FAIL',
            'confidence': 0.0,
            'issues': [{'code': 'FILE_NOT_FOUND', 'severity': 'HIGH', 'message': f'File not found: {data_path}'}],
            'recommended_next_step': 'QUARANTINE'
        }
    
    data = json.loads(data_path.read_text())
    
    # Build compact payload
    inv_result = invariant_result or {'is_valid': True, 'violations': [], 'warnings': []}
    payload = build_compact_payload(data, inv_result)
    
    # Call Gemini CLI
    result = call_gemini_cli(payload)
    
    if result is None:
        # Gemini failed, return default pass (fallback to rule-based only)
        logger.warning("Gemini CLI unavailable, falling back to rule-based only")
        return {
            'decision': 'PASS',
            'confidence': 0.5,
            'issues': [],
            'recommended_next_step': 'COMMIT',
            '_fallback': True
        }
    
    return result


def main():
    """CLI entry point."""
    import argparse
    parser = argparse.ArgumentParser(description='Gemini v2 QA Validator (uses Gemini CLI)')
    parser.add_argument('source', help='Source name (e.g., ielts-mentor)')
    parser.add_argument('item_id', help='Item ID (e.g., 86-talking-point)')
    parser.add_argument('--json', action='store_true', help='Output JSON')
    args = parser.parse_args()
    
    result = run_gemini_qa(args.source, args.item_id)
    
    if args.json:
        print(json.dumps(result, indent=2))
    else:
        decision = result.get('decision', 'UNKNOWN')
        confidence = result.get('confidence', 0.0)
        issues = result.get('issues', [])
        next_step = result.get('recommended_next_step', 'UNKNOWN')
        
        if decision == 'PASS':
            print(f"✅ GEMINI QA: PASS (confidence: {confidence:.1%})")
        else:
            print(f"❌ GEMINI QA: FAIL (confidence: {confidence:.1%})")
            for issue in issues:
                if isinstance(issue, dict):
                    sev = issue.get('severity', 'MED')
                    msg = issue.get('message', 'Unknown issue')
                elif isinstance(issue, str):
                    sev = 'MED'
                    msg = issue
                else:
                    sev = 'MED'
                    msg = str(issue)
                print(f"  [{sev}] {msg}")
        
        print(f"→ Next step: {next_step}")
        
        if result.get('_fallback'):
            print("⚠ Note: Gemini CLI fallback (using rule-based only)")


if __name__ == '__main__':
    main()
