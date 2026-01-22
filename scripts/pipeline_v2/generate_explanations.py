#!/usr/bin/env python3
"""
AI Explanation Generator Pipeline
Generates explanationMd for IELTS questions using Codex CLI.

Usage:
  python generate_explanations.py <source> <item_id>           # Single exam
  python generate_explanations.py --all                        # All exams
  python generate_explanations.py --all --resume               # Skip if already has explanation

Pipeline runs AFTER crawl is complete. Reads from data/normalized/{source}/{item_id}.json
"""

import json
import subprocess
import sys
import argparse
import tempfile
import re
from pathlib import Path
from typing import Optional, List
from concurrent.futures import ThreadPoolExecutor, as_completed

from config import NORMALIZED_DIR, get_logger

logger = get_logger(__name__)

# Codex prompt for generating IELTS explanations
EXPLANATION_PROMPT = """
You are an IELTS expert teacher. Generate a clear, concise explanation for each question.

## RULES:
1. Write in **Vietnamese** (giải thích bằng tiếng Việt)
2. Keep each explanation **3-5 sentences** maximum
3. Explain WHY the correct answer is correct
4. **MUST quote relevant text** from the passage using blockquote format (> quote)
5. Specify which paragraph or section the evidence comes from
6. Mention common mistakes if applicable
7. Use Markdown formatting

## OUTPUT FORMAT (JSON):
Return ONLY a JSON array with explanations for each question:
```json
[
  {"idx": 1, "explanation_md": "**Đáp án: TRUE**\\n\\n> \"The conservation efforts have resulted in...\"\\n\\n(Đoạn 2) Passage nói rõ về kết quả bảo tồn, khớp với câu hỏi. Từ khóa: 'conservation efforts'."},
  {"idx": 2, "explanation_md": "**Đáp án: B**\\n\\n> \"researchers discovered that the species...\"\\n\\n(Đoạn 4) Thông tin trong lựa chọn B khớp với trích dẫn trên. Lỗi thường gặp: nhầm với A vì có từ tương tự."}
]
```

Do NOT include any text outside the JSON array.

## QUESTION DATA:
"""

def load_normalized(source: str, item_id: str) -> Optional[dict]:
    """Load normalized data from disk."""
    path = NORMALIZED_DIR / source / f"{item_id}.json"
    if not path.exists():
        logger.error(f"Normalized data not found: {path}")
        return None
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def save_normalized(source: str, item_id: str, data: dict):
    """Save data back to normalized file."""
    path = NORMALIZED_DIR / source / f"{item_id}.json"
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    logger.info(f"Saved: {path}")


def has_explanations(data: dict) -> bool:
    """Check if data already has explanations for all questions."""
    questions = data.get('questions', [])
    if not questions:
        return False
    # Check if at least 80% of questions have explanation
    with_explanation = sum(1 for q in questions if q.get('explanation_md'))
    return with_explanation >= len(questions) * 0.8


def prepare_question_data(data: dict) -> dict:
    """Prepare question data for Codex prompt."""
    sections = data.get('sections', [])
    questions = data.get('questions', [])
    
    # Include passage context (first 1500 chars)
    passage_context = ""
    for section in sections[:2]:  # Max 2 sections
        passage = section.get('passage_md', '')[:1500]
        if passage:
            passage_context += f"\n\n### Passage:\n{passage}"
    
    # Prepare questions (without explanation_md)
    question_list = []
    for q in questions:
        question_list.append({
            "idx": q.get('idx'),
            "type": q.get('type'),
            "prompt_md": q.get('prompt_md', '')[:200],  # Limit prompt length
            "correct_answers": q.get('correct_answers', []),
            "options": [{"label": opt.get('label'), "text": opt.get('text', '')[:50]} 
                       for opt in q.get('options', [])[:5]]  # Limit options
        })
    
    return {
        "passage_context": passage_context[:2000],
        "questions": question_list
    }


def run_codex_explanation(data: dict) -> List[dict]:
    """Run Codex CLI to generate explanations."""
    
    question_data = prepare_question_data(data)
    prompt = EXPLANATION_PROMPT + json.dumps(question_data, indent=2, ensure_ascii=False)
    
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
        
        logger.info("[CODEX] Calling Codex CLI...")
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=180,  # 3 minutes (reduced from 5)
            cwd=str(NORMALIZED_DIR.parent.parent)
        )
        
        # Read output
        if Path(output_path).exists():
            output_text = Path(output_path).read_text()
            
            # Try to parse JSON from output
            try:
                # Find JSON array in output
                json_match = re.search(r'\[[\s\S]*\]', output_text)
                if json_match:
                    explanations = json.loads(json_match.group())
                    logger.info(f"[CODEX] Generated {len(explanations)} explanations")
                    return explanations
            except json.JSONDecodeError as e:
                logger.error(f"[CODEX] Failed to parse JSON: {e}")
                logger.debug(f"Output: {output_text[:500]}")
        
        logger.error(f"[CODEX] Error: {result.stderr[:200] if result.stderr else 'No output'}")
        return []
        
    except subprocess.TimeoutExpired:
        logger.error("[CODEX] Timeout (180s)")
        return []
    except Exception as e:
        logger.error(f"[CODEX] Error: {e}")
        return []
    finally:
        Path(output_path).unlink(missing_ok=True)


def run_gemini_explanation(data: dict) -> List[dict]:
    """Run Gemini CLI to generate explanations."""
    import os
    
    question_data = prepare_question_data(data)
    prompt = EXPLANATION_PROMPT + json.dumps(question_data, indent=2, ensure_ascii=False)
    
    # Write prompt to temp file
    prompt_file = tempfile.mktemp(suffix='.txt')
    
    try:
        with open(prompt_file, 'w', encoding='utf-8') as f:
            f.write(prompt)
        
        logger.info("[GEMINI] Calling Gemini CLI...")
        result = subprocess.run(
            f'cat "{prompt_file}" | gemini 2>/dev/null',
            shell=True,
            capture_output=True,
            text=True,
            timeout=120  # 2 minutes
        )
        
        if result.returncode != 0:
            logger.error(f"[GEMINI] CLI failed: {result.stderr[:100]}")
            return []
        
        output_text = result.stdout.strip()
        
        # Try to parse JSON array from output
        try:
            json_match = re.search(r'\[[\s\S]*\]', output_text)
            if json_match:
                explanations = json.loads(json_match.group())
                logger.info(f"[GEMINI] Generated {len(explanations)} explanations")
                return explanations
        except json.JSONDecodeError as e:
            logger.error(f"[GEMINI] Failed to parse JSON: {e}")
            logger.debug(f"Output: {output_text[:500]}")
        
        logger.error("[GEMINI] No valid JSON found in response")
        return []
        
    except subprocess.TimeoutExpired:
        logger.error("[GEMINI] Timeout (120s)")
        return []
    except Exception as e:
        logger.error(f"[GEMINI] Error: {e}")
        return []
    finally:
        if os.path.exists(prompt_file):
            os.unlink(prompt_file)


def apply_explanations(data: dict, explanations: List[dict]) -> dict:
    """Apply generated explanations to question data."""
    
    # Create lookup by idx
    explanation_map = {exp.get('idx'): exp.get('explanation_md', '') for exp in explanations}
    
    # Apply to questions
    for q in data.get('questions', []):
        idx = q.get('idx')
        if idx in explanation_map and explanation_map[idx]:
            q['explanation_md'] = explanation_map[idx]
    
    return data


def process_exam(source: str, item_id: str, resume: bool = False, provider: str = 'codex') -> bool:
    """Process a single exam to generate explanations.
    
    Args:
        provider: 'codex' or 'gemini'
    """
    
    logger.info(f"[{provider.upper()}] Processing: {source}/{item_id}")
    
    data = load_normalized(source, item_id)
    if not data:
        return False
    
    # Skip if resume mode and already has explanations
    if resume and has_explanations(data):
        logger.info(f"Skipping (already has explanations): {source}/{item_id}")
        return True
    
    # Generate explanations using specified provider
    if provider == 'gemini':
        explanations = run_gemini_explanation(data)
    else:
        explanations = run_codex_explanation(data)
    
    if not explanations:
        logger.warning(f"[{provider.upper()}] No explanations generated for: {source}/{item_id}")
        return False
    
    # Apply and save
    data = apply_explanations(data, explanations)
    save_normalized(source, item_id, data)
    
    # Count applied
    applied = sum(1 for q in data.get('questions', []) if q.get('explanation_md'))
    total = len(data.get('questions', []))
    logger.info(f"[{provider.upper()}] Applied {applied}/{total} explanations")
    
    return True


def get_all_normalized_items() -> List[tuple]:
    """Get all normalized items (source, item_id)."""
    items = []
    
    for source_dir in NORMALIZED_DIR.iterdir():
        if not source_dir.is_dir():
            continue
        source = source_dir.name
        
        for json_file in source_dir.glob("*.json"):
            item_id = json_file.stem
            items.append((source, item_id))
    
    return items


def main():
    parser = argparse.ArgumentParser(description="AI Explanation Generator")
    parser.add_argument("source", nargs='?', help="Source name (e.g., mini-ielts)")
    parser.add_argument("item_id", nargs='?', help="Item ID")
    parser.add_argument("--all", action="store_true", help="Process all normalized items")
    parser.add_argument("--resume", action="store_true", help="Skip items that already have explanations")
    parser.add_argument("--provider", choices=['codex', 'gemini', 'dual'], default='dual',
                       help="Provider: codex, gemini, or dual (1 each, default)")
    args = parser.parse_args()
    
    if args.all:
        # Batch mode with parallel processing
        items = get_all_normalized_items()
        
        if args.provider == 'dual':
            logger.info(f"Found {len(items)} items - DUAL MODE (1 Codex + 1 Gemini worker)")
        else:
            logger.info(f"Found {len(items)} items - {args.provider.upper()} mode")
        
        success = 0
        failed = 0
        
        def process_item(item_with_provider):
            source, item_id, provider = item_with_provider
            try:
                return (source, item_id, provider, process_exam(source, item_id, resume=args.resume, provider=provider))
            except Exception as e:
                logger.error(f"[{provider.upper()}] Error processing {source}/{item_id}: {e}")
                return (source, item_id, provider, False)
        
        # Prepare items with provider assignment
        if args.provider == 'dual':
            # Alternate between codex and gemini
            items_with_provider = []
            for i, (source, item_id) in enumerate(items):
                provider = 'codex' if i % 2 == 0 else 'gemini'
                items_with_provider.append((source, item_id, provider))
            workers = 2
        else:
            items_with_provider = [(s, i, args.provider) for s, i in items]
            workers = 1
        
        # Use ThreadPoolExecutor for parallel processing
        with ThreadPoolExecutor(max_workers=workers) as executor:
            futures = {executor.submit(process_item, item): item for item in items_with_provider}
            
            for future in as_completed(futures):
                source, item_id, provider, result = future.result()
                if result:
                    success += 1
                else:
                    failed += 1
                
                # Progress update every 5 items
                total_done = success + failed
                if total_done % 5 == 0:
                    logger.info(f"Progress: {total_done}/{len(items)} ({success} success, {failed} failed)")
        
        print(f"\n✅ Success: {success}, ❌ Failed: {failed}")
        
    elif args.source and args.item_id:
        # Single item mode
        provider = args.provider if args.provider != 'dual' else 'codex'
        if process_exam(args.source, args.item_id, resume=args.resume, provider=provider):
            print(f"✅ Generated explanations for {args.source}/{args.item_id}")
        else:
            print(f"❌ Failed to generate explanations")
            sys.exit(1)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
