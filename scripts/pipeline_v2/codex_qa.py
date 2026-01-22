#!/usr/bin/env python3
"""
Codex QA Validator - 3rd Layer AI Validation
Uses OpenAI Codex CLI to validate normalized IELTS data.

Usage: python codex_qa.py <source> <item_id> [--json]

Pipeline Order:
1. Gemini QA (gemini_qa.py)
2. Codex QA (codex_qa.py) ← THIS
3. Claude CHECK (invariants.py)
"""

import json
import subprocess
import sys
import argparse
import tempfile
from pathlib import Path

from config import NORMALIZED_DIR, get_logger

logger = get_logger(__name__)

# Validation prompt for Codex - includes full schema and IELTS content rules
VALIDATION_PROMPT = """
You are an expert IELTS examiner and data validator. Analyze the IELTS exam JSON data thoroughly.

## YOUR ROLE
You must validate BOTH:
1. **Schema correctness** - Does the data structure match requirements?
2. **IELTS content quality** - Does it look like real IELTS content?

## ⚠️ CRITICAL: NO PARAPHRASE RULES ⚠️

**NEVER suggest or make these changes:**
- Do NOT paraphrase or rewrite any text
- Do NOT invent missing content
- Do NOT change wording of options, prompts, or passages
- All content MUST match the original source EXACTLY

**If content is missing:**
- Flag as issue but do NOT suggest invented content
- Report: "Missing X - must be extracted from source"

**Examples of FORBIDDEN fixes:**
- ❌ "Change 'D' from 'demolished' to 'used for different purpose'" (inventing)
- ❌ "Add option F: 'It will close temporarily'" (inventing)
- ✅ "Option D-G meanings are missing from source data" (correct)

## MASTER TYPE TABLE

| Type | UI Kind | Options | is_correct Rule |
|------|---------|---------|----------------|
| TRUE_FALSE_NOT_GIVEN | choice_single | 3 opts (TRUE/FALSE/NOT GIVEN) | exactly 1 |
| YES_NO_NOT_GIVEN | choice_single | 3 opts (YES/NO/NOT GIVEN) | exactly 1 |
| MULTIPLE_CHOICE_SINGLE | choice_single | 3-4 options (A/B/C/D) | exactly 1 |
| MULTIPLE_CHOICE_MULTIPLE | choice_multiple | 4-7 options | 2+ correct |
| MATCHING_INFORMATION | matching_letter | `[]` empty | N/A |
| MATCHING_HEADING | matching_heading | roman i-xi | N/A |
| MATCHING_FEATURES | matching_letter | `[]` empty | N/A |
| MATCHING_ENDINGS | matching_letter | `[]` empty | N/A |
| SUMMARY_COMPLETION | completion | `[]` empty | N/A |
| TABLE_COMPLETION | completion | `[]` empty | N/A |
| NOTE_COMPLETION | completion | `[]` empty | N/A |
| SENTENCE_COMPLETION | completion | `[]` empty | N/A |
| SHORT_ANSWER | completion | `[]` empty | N/A |
| DIAGRAM_LABEL | completion | `[]` empty | N/A |

## SCHEMA VALIDATION RULES

1. **Type validity**: question.type MUST be from table above
2. **MULTIPLE_CHOICE_SINGLE**: exactly 1 option with is_correct=true
3. **MULTIPLE_CHOICE_MULTIPLE**: 2+ options with is_correct=true, matching correct_answers
4. **MATCHING_***: options MUST be empty [] (except MATCHING_HEADING which has roman numerals)
5. **correct_answers**: MUST NOT be empty [] for any question
6. **Audio URL**: For listening exams, youtube.com/embed/VIDEO_ID format is valid (params like ?enablejsapi=1 are OK)

## IELTS CONTENT QUALITY RULES

1. **Prompt quality**: prompt_md should be meaningful question text, not "Question 1" placeholder
2. **Option text**: MCQ options should have clear, distinct text (not empty or duplicates)
3. **Answer consistency**: correct_answers values should match actual option labels
4. **Listening exam**: Must have audio_url in exam or section metadata
5. **Question flow**: Question indices should be logical (no gaps like Q1, Q3, Q5 only)
6. **Content coherence**: Question prompts should relate to the exam topic
7. **Grammar/spelling**: Option text should be grammatically correct

## REAL IELTS EXAM CHARACTERISTICS

- IELTS Listening has 4 parts, 40 questions total (mini-ielts may have fewer)
- Question types are grouped together (not mixed randomly)
- Matching questions use letters A-G, headings use roman numerals i-xi
- MCQ options are usually 3-4 choices, well-written and plausible

## OUTPUT FORMAT

```json
{
  "decision": "PASS" or "FAIL",
  "confidence": 0-100,
  "schema_issues": [{"question": "Q1", "severity": "HIGH/MED/LOW", "message": "schema issue"}],
  "content_issues": [{"question": "Q1", "severity": "HIGH/MED/LOW", "message": "content issue"}],
  "ielts_authenticity_score": 0-100,
  "fixes": ["suggested fix 1"]
}
```

- **PASS**: No HIGH severity issues, authenticity score >= 70
- **FAIL**: Any HIGH severity issue OR authenticity score < 70

## CONTENT COMPLETENESS RULES (CRITICAL!)

For each question, verify users have enough information to answer. These are HIGH severity if violated:

### MATCHING_INFORMATION / MATCHING_FEATURES / MATCHING_ENDINGS
- `instruction_md` OR `passage_md` MUST contain the FULL list of options (A-H) with their meanings
- Example: If Q1-6 are "Match to Tutor's opinions A-H", instruction_md MUST list what A,B,C,D,E,F,G,H mean
- ❌ FAIL: instruction_md just says "Choose A-H" without explaining what each letter means
- ✅ PASS: instruction_md contains "A: It would be rewarding... B: It is too ambitious..."

### MATCHING_HEADING
- `options[]` MUST contain roman numerals (i, ii, iii...) with actual heading text
- Example: `{"label": "i", "text": "The importance of research"}`
- ❌ FAIL: options just have "i", "ii", "iii" without heading text

### MULTIPLE_CHOICE_SINGLE / MULTIPLE_CHOICE_MULTIPLE
- Each option MUST have meaningful text (not empty, not just "Option A", not placeholder)
- At least 3 options for single, 4-7 for multiple
- ❌ FAIL: options have empty text or generic placeholders

### TRUE_FALSE_NOT_GIVEN / YES_NO_NOT_GIVEN
- `prompt_md` MUST contain a complete statement that can be judged true/false
- ❌ FAIL: prompt_md is empty or just a number

### SUMMARY_COMPLETION / TABLE_COMPLETION / NOTE_COMPLETION / SENTENCE_COMPLETION
- `prompt_md` MUST contain context showing where the answer fits
- Example: "The company was founded in ___"
- ❌ FAIL: prompt_md doesn't show the gap or context

### ALL QUESTION TYPES
- `prompt_md` MUST describe what is being asked
- ❌ FAIL: prompt_md is empty, or just a number like "1", "2"
- ✅ PASS: prompt_md is "Customer database" or "The company was founded in ___"

NOTE: Type names like "MULTIPLE_CHOICE_SINGLE" are CORRECT (not "MCQ_SINGLE").
NOTE: Empty options for MATCHING_* is CORRECT behavior.
NOTE: Audio URLs with query params (?enablejsapi=1) are VALID.

DATA TO VALIDATE:
"""

# JSON schema for structured output
OUTPUT_SCHEMA = {
    "type": "object",
    "properties": {
        "decision": {"type": "string", "enum": ["PASS", "FAIL"]},
        "confidence": {"type": "number", "minimum": 0, "maximum": 100},
        "issues": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "question": {"type": "string"},
                    "severity": {"type": "string", "enum": ["HIGH", "MED", "LOW"]},
                    "message": {"type": "string"}
                },
                "required": ["question", "severity", "message"]
            }
        },
        "fixes": {"type": "array", "items": {"type": "string"}}
    },
    "required": ["decision", "confidence", "issues"]
}

# Fix prompt for Codex - applies fixes to the data
FIX_PROMPT = """
You are an IELTS data fixer. Your job is to fix the issues found in the JSON data.

## ISSUES TO FIX:
{issues}

## FIXING RULES:

1. **MCQ with 5 options**: If MULTIPLE_CHOICE_SINGLE has 5 options and prompt says "Choose TWO":
   - Change type to MULTIPLE_CHOICE_MULTIPLE
   - Set is_correct=true for both correct answers
   - Update correct_answers array with both answers

2. **Passage incomplete**: If passage is truncated or incomplete:
   - Do NOT modify passage (it's too complex to fix automatically)
   - Report as "not fixed"

3. **Instruction mismatch**: If instruction conflicts with question type:
   - Update instruction to match the actual question structure

4. **Duplicate answers**: If same letter used multiple times:
   - Add instruction note: "NB: You may use any letter more than once."

5. **Content overview mismatch**: Update section overview to match actual questions

## OUTPUT FORMAT:

Return ONLY the fixed JSON data. No explanations. The output must be valid JSON that can be parsed.

CURRENT DATA:
"""


def load_normalized(source: str, item_id: str) -> dict:
    """Load normalized data from disk."""
    path = NORMALIZED_DIR / source / f"{item_id}.json"
    if not path.exists():
        logger.error(f"Normalized data not found: {path}")
        return None
    with open(path) as f:
        return json.load(f)


def run_codex_validation(data: dict) -> dict:
    """Run Codex CLI with o3 thinking model to validate data."""
    
    # Send FULL data for comprehensive content validation
    full_data = {
        "exam": data.get("exam", {}),
        "sections": [
            {
                "idx": s.get("idx"),
                "title": s.get("title"),
                "passage_md": s.get("passage_md", "")[:2000],  # First 2000 chars
                "instruction_md": s.get("instruction_md", ""),
                "audio_url": s.get("audio_url", ""),
                "passage_word_count": len(s.get("passage_md", "").split())
            }
            for s in data.get("sections", [])
        ],
        "questions": data.get("questions", [])  # Full question data
    }
    
    prompt = VALIDATION_PROMPT + json.dumps(full_data, indent=2, ensure_ascii=False)
    
    # Create temp file for schema
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        json.dump(OUTPUT_SCHEMA, f)
        schema_path = f.name
    
    # Create temp file for output
    output_path = tempfile.mktemp(suffix='.txt')
    
    try:
        # Run codex exec with default model (uses Codex default config)
        cmd = [
            "codex", "exec",
            # No --model flag - use default (probably o4-mini)
            "--full-auto",
            "--skip-git-repo-check",
            "--output-last-message", output_path,
            prompt
        ]
        
        logger.info("Calling Codex CLI...")
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300,  # 5 minutes for comprehensive IELTS validation
            cwd=str(NORMALIZED_DIR.parent.parent)
        )
        
        # Read output
        if Path(output_path).exists():
            output_text = Path(output_path).read_text()
            
            # Try to parse JSON from output
            try:
                # Find JSON in output
                import re
                json_match = re.search(r'\{[\s\S]*\}', output_text)
                if json_match:
                    return json.loads(json_match.group())
            except json.JSONDecodeError:
                pass
            
            # Return raw output as message
            return {
                "decision": "FAIL",
                "confidence": 50,
                "issues": [{"question": "ALL", "severity": "MED", "message": output_text[:500]}],
                "fixes": []
            }
        
        # Fallback
        return {
            "decision": "FAIL",
            "confidence": 30,
            "issues": [{"question": "ALL", "severity": "HIGH", "message": f"Codex error: {result.stderr[:200]}"}],
            "fixes": []
        }
        
    except subprocess.TimeoutExpired:
        return {
            "decision": "FAIL",
            "confidence": 0,
            "issues": [{"question": "ALL", "severity": "HIGH", "message": "Codex timeout (120s)"}],
            "fixes": []
        }
    except Exception as e:
        return {
            "decision": "FAIL",
            "confidence": 0,
            "issues": [{"question": "ALL", "severity": "HIGH", "message": f"Error: {str(e)}"}],
            "fixes": []
        }
    finally:
        # Cleanup temp files
        Path(schema_path).unlink(missing_ok=True)
        Path(output_path).unlink(missing_ok=True)


def run_codex_fix(data: dict, issues: list) -> dict:
    """Run Codex CLI to auto-fix issues in the data."""
    
    # Format issues for the prompt
    issues_text = json.dumps(issues, indent=2, ensure_ascii=False)
    
    # Create the fix prompt
    prompt = FIX_PROMPT.format(issues=issues_text) + json.dumps(data, indent=2, ensure_ascii=False)
    
    # Create temp file for output
    output_path = tempfile.mktemp(suffix='.txt')
    
    try:
        cmd = [
            "codex", "exec",
            "--full-auto",
            "--skip-git-repo-check",
            "--output-last-message", output_path,
            prompt
        ]
        
        logger.info("Calling Codex CLI for FIX mode...")
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300,
            cwd=str(NORMALIZED_DIR.parent.parent)
        )
        
        # Read output
        if Path(output_path).exists():
            output_text = Path(output_path).read_text()
            
            # Try to parse JSON from output
            try:
                import re
                # Find the largest JSON object in output
                json_match = re.search(r'\{[\s\S]*\}', output_text)
                if json_match:
                    fixed_data = json.loads(json_match.group())
                    return {"success": True, "data": fixed_data}
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse fixed JSON: {e}")
                return {"success": False, "error": str(e)}
        
        return {"success": False, "error": "No output from Codex"}
        
    except subprocess.TimeoutExpired:
        logger.error("Codex fix timed out")
        return {"success": False, "error": "Timeout"}
    except Exception as e:
        logger.error(f"Codex fix error: {e}")
        return {"success": False, "error": str(e)}
    finally:
        Path(output_path).unlink(missing_ok=True)


def save_normalized(source: str, item_id: str, data: dict):
    """Save fixed data back to normalized file."""
    path = NORMALIZED_DIR / source / f"{item_id}.json"
    with open(path, 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    logger.info(f"Saved fixed data: {path}")


def main():
    parser = argparse.ArgumentParser(description="Codex QA Validator & Fixer")
    parser.add_argument("source", help="Source name (e.g., mini-ielts)")
    parser.add_argument("item_id", help="Item ID (e.g., 445-dolphin-conservation-trust)")
    parser.add_argument("--mode", choices=["pre", "validate", "fix"], default="validate",
                        help="Mode: pre (early check), validate (full check), fix (auto-fix)")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    args = parser.parse_args()
    
    data = load_normalized(args.source, args.item_id)
    if not data:
        print("✗ Normalized data not found")
        sys.exit(1)
    
    if args.mode in ["pre", "validate"]:
        mode_label = "PRE-CHECK" if args.mode == "pre" else "VALIDATE"
        result = run_codex_validation(data)
        
        if args.json:
            print(json.dumps(result, indent=2))
        else:
            decision = result.get("decision", "UNKNOWN")
            confidence = result.get("confidence", 0)
            authenticity = result.get("ielts_authenticity_score", result.get("authenticity_score", None))
            
            status = "✅" if decision == "PASS" else "❌"
            auth_str = f", authenticity: {authenticity}%" if authenticity else ""
            print(f"\n{status} CODEX {mode_label}: {decision} (confidence: {confidence}%{auth_str})")
            
            # Handle both old and new schema
            schema_issues = result.get("schema_issues", [])
            content_issues = result.get("content_issues", [])
            issues = result.get("issues", [])
            
            if schema_issues:
                print("\nSchema issues:")
                for issue in schema_issues:
                    q = issue.get("question", "?")
                    sev = issue.get("severity", "MED")
                    msg = issue.get("message", "")
                    print(f"  [{sev}] {q}: {msg}")
            
            if content_issues:
                print("\nContent issues:")
                for issue in content_issues:
                    q = issue.get("question", "?")
                    sev = issue.get("severity", "MED")
                    msg = issue.get("message", "")
                    print(f"  [{sev}] {q}: {msg}")
            
            if issues and not schema_issues and not content_issues:
                print("\nIssues found:")
                for issue in issues:
                    q = issue.get("question", "?")
                    sev = issue.get("severity", "MED")
                    msg = issue.get("message", "")
                    print(f"  [{sev}] {q}: {msg}")
            
            fixes = result.get("fixes", [])
            if fixes:
                print("\nSuggested fixes:")
                for fix in fixes:
                    print(f"  • {fix}")
        
        sys.exit(0 if result.get("decision") == "PASS" else 1)
    
    elif args.mode == "fix":
        # First validate to get issues
        print("Step 1: Validating to find issues...")
        validation_result = run_codex_validation(data)
        
        all_issues = (
            validation_result.get("schema_issues", []) +
            validation_result.get("content_issues", []) +
            validation_result.get("issues", [])
        )
        
        if not all_issues:
            print("✅ No issues to fix!")
            sys.exit(0)
        
        print(f"Found {len(all_issues)} issues. Attempting auto-fix...")
        
        # Run fix
        print("Step 2: Running Codex Fix...")
        fix_result = run_codex_fix(data, all_issues)
        
        if fix_result.get("success"):
            fixed_data = fix_result["data"]
            save_normalized(args.source, args.item_id, fixed_data)
            print("✅ CODEX FIX: Applied fixes successfully")
            
            # Re-validate to check
            print("Step 3: Re-validating...")
            revalidation = run_codex_validation(fixed_data)
            
            new_issues = (
                revalidation.get("schema_issues", []) +
                revalidation.get("content_issues", []) +
                revalidation.get("issues", [])
            )
            
            if len(new_issues) < len(all_issues):
                print(f"✅ Reduced issues from {len(all_issues)} to {len(new_issues)}")
            elif len(new_issues) == 0:
                print("✅ All issues fixed!")
            else:
                print(f"⚠️ Still {len(new_issues)} issues remaining (was {len(all_issues)})")
            
            sys.exit(0)
        else:
            print(f"❌ CODEX FIX: Failed - {fix_result.get('error')}")
            sys.exit(1)


if __name__ == "__main__":
    main()
