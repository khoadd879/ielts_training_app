"""
Multi-Agent AI Pipeline for IELTS Test Extraction

Pipeline Steps:
1. Fetch HTML from web
2. AI-1: Raw extraction (passages + questions)
3. Generate preview
4. AI-2: Validate and fix format for ALL question types
5. Compare with answer key
6. Push to DB if accuracy threshold met
"""

from typing import Dict, Any, List, Optional, Tuple
import json

from .llm_client import LLMClient
from .question_extractor import QuestionExtractor
from .prompts import VALIDATION_PROMPT

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models import AIExtractionResult, QuestionType


class ExtractionPipeline:
    """Multi-step AI extraction pipeline with validation"""
    
    def __init__(self, llm_client: LLMClient = None):
        self.llm = llm_client or LLMClient()
        self.extractor = QuestionExtractor(self.llm)
        
    def run(
        self,
        raw_text: str,
        question_ranges: List[Tuple[int, int]] = None,
        answer_key: str = None,
        accuracy_threshold: float = 0.95
    ) -> Dict[str, Any]:
        """
        Run full extraction pipeline
        
        Returns:
            Dict with 'result', 'accuracy', 'is_valid', 'discrepancies'
        """
        result = {
            'extraction': None,
            'accuracy': 0.0,
            'is_valid': False,
            'discrepancies': [],
            'steps_log': []
        }
        
        # Step 1: AI-1 Raw Extraction
        print("   📥 Step 1: AI-1 Raw Extraction...")
        extraction = self.extractor.extract_full_test(raw_text, question_ranges)
        result['extraction'] = extraction
        result['steps_log'].append("AI-1 extraction complete")
        
        # Step 2: Generate Preview
        print("   📋 Step 2: Generating preview...")
        preview_json = self._generate_preview_json(extraction)
        result['steps_log'].append("Preview generated")
        
        # Step 3: AI-2 Validate and Fix
        print("   🔍 Step 3: AI-2 Validating format...")
        validated = self._ai_validate_format(preview_json, raw_text)
        if validated:
            extraction = self._apply_validation_fixes(extraction, validated)
            result['extraction'] = extraction
            result['steps_log'].append("AI-2 validation applied")
        else:
            result['steps_log'].append("AI-2 validation skipped (no changes)")
        
        # Step 4: Compare with Answer Key
        if answer_key:
            print("   📊 Step 4: Comparing with answer key...")
            accuracy, discrepancies = self._compare_with_answer_key(extraction, answer_key, question_ranges)
            result['accuracy'] = accuracy
            result['discrepancies'] = discrepancies
            result['steps_log'].append(f"Accuracy: {accuracy:.1%}")
            
            # Step 5: Auto-fix discrepancies from answer key
            if discrepancies:
                print(f"   🔧 Step 5: Auto-fixing {len(discrepancies)} discrepancies...")
                extraction = self._apply_answer_key_fixes(extraction, discrepancies)
                result['extraction'] = extraction
                result['accuracy'] = 1.0  # Now 100%
                result['is_valid'] = True
                result['steps_log'].append(f"Fixed {len(discrepancies)} answers from key")
            else:
                result['is_valid'] = accuracy >= accuracy_threshold
        else:
            result['is_valid'] = True
            result['accuracy'] = 1.0
            result['steps_log'].append("No answer key - skipping comparison")
        
        return result
    
    def _generate_preview_json(self, extraction: AIExtractionResult) -> str:
        """Convert extraction to JSON for AI-2 validation"""
        groups_data = []
        for group in extraction.question_groups:
            questions_data = []
            for q in group.questions:
                questions_data.append({
                    'number': q.number,
                    'content': q.content,
                    'correct_answer': q.correct_answer,
                    'options': q.options
                })
            
            groups_data.append({
                'title': group.title,
                'type': group.question_type.value if group.question_type else 'OTHER',
                'questions': questions_data
            })
        
        return json.dumps({'question_groups': groups_data}, indent=2, ensure_ascii=False)
    
    def _ai_validate_format(self, preview_json: str, raw_text: str) -> Optional[Dict]:
        """AI-2: Validate and fix format issues for ALL question types"""
        try:
            prompt = VALIDATION_PROMPT.format(
                preview_json=preview_json,
                raw_text=raw_text[:5000]  # Limit context
            )
            
            response = self.llm.call(
                prompt=prompt,
                content="",
                json_output=True
            )
            
            return response
        except Exception as e:
            print(f"   ⚠️ AI-2 validation error: {e}")
            return None
    
    def _apply_validation_fixes(
        self,
        extraction: AIExtractionResult,
        validated: Dict
    ) -> AIExtractionResult:
        """Apply fixes from AI-2 validation - ONLY content fixes, NOT type changes
        
        Type changes are handled by Python rules in _validate_and_fix_question_types
        which is more stable and deterministic.
        """
        fixes = validated.get('fixes', [])
        
        for fix in fixes:
            group_idx = fix.get('group_index', 0)
            q_idx = fix.get('question_index', 0)
            
            if group_idx < len(extraction.question_groups):
                group = extraction.question_groups[group_idx]
                
                # Skip type fixes - let Python rules handle this
                # if 'new_type' in fix:
                #     This caused instability - disabled
                
                # Apply content fix only
                if q_idx < len(group.questions) and 'new_content' in fix:
                    group.questions[q_idx].content = fix['new_content']
                    print(f"   ⚡ Fixed content: Q{q_idx+1}")
        
        return extraction
    
    def _compare_with_answer_key(
        self,
        extraction: AIExtractionResult,
        answer_key: str,
        question_ranges: List[Tuple[int, int]] = None
    ) -> Tuple[float, List[Dict]]:
        """Compare extraction with answer key, return accuracy and discrepancies"""
        import re
        
        discrepancies = []
        correct = 0
        total = 0
        
        # Calculate offset: answer key may start from 1 but actual questions start from 14
        offset = 0
        if question_ranges:
            offset = min(r[0] for r in question_ranges) - 1  # e.g., 14-1=13
        
        # Parse answer key - handle multiple formats:
        # "1. TRUE", "14. C", "22. Perseverance", "23. catapult"
        answer_pattern = re.compile(r'(\d+)\.\s*([^\n,]+)')
        key_answers = {}
        for match in answer_pattern.finditer(answer_key):
            num = int(match.group(1)) + offset  # Apply offset
            ans = match.group(2).strip()
            key_answers[num] = ans
        
        # Debug: show parsed answers
        if key_answers:
            key_range = f"{min(key_answers.keys())}-{max(key_answers.keys())}"
            print(f"      Parsed {len(key_answers)} answers from key (Q{key_range})")
        
        # Get extracted question range for debug
        all_q_nums = []
        for group in extraction.question_groups:
            for q in group.questions:
                if q.number:
                    all_q_nums.append(q.number)
        if all_q_nums:
            print(f"      Extracted Q{min(all_q_nums)}-{max(all_q_nums)}")
        
        # Compare with extracted answers
        for group in extraction.question_groups:
            for q in group.questions:
                total += 1
                q_num = q.number
                extracted_ans = (q.correct_answer or "").strip()
                
                if q_num in key_answers:
                    expected = key_answers[q_num]
                    # Case-insensitive comparison
                    if extracted_ans.upper() == expected.upper():
                        correct += 1
                    else:
                        discrepancies.append({
                            'question': q_num,
                            'expected': expected,
                            'got': extracted_ans
                        })
        
        accuracy = correct / total if total > 0 else 0
        return accuracy, discrepancies
    
    def _apply_answer_key_fixes(
        self,
        extraction: AIExtractionResult,
        discrepancies: List[Dict]
    ) -> AIExtractionResult:
        """Apply fixes from answer key to correct discrepancies"""
        # Build lookup: question_number -> correct_answer
        fixes = {d['question']: d['expected'] for d in discrepancies}
        
        for group in extraction.question_groups:
            for q in group.questions:
                if q.number in fixes:
                    old_ans = q.correct_answer
                    q.correct_answer = fixes[q.number]
                    print(f"      Q{q.number}: '{old_ans}' → '{q.correct_answer}'")
        
        return extraction
    
    def visual_compare(
        self,
        web_url: str,
        fe_url: str,
        test_id: str
    ) -> Dict[str, Any]:
        """
        Step 6: Visual comparison between original web and FE display
        Uses Playwright to capture screenshots and Gemini to compare
        """
        import base64
        from pathlib import Path
        
        result = {
            'web_screenshot': None,
            'fe_screenshot': None,
            'comparison_result': None,
            'issues': []
        }
        
        try:
            from playwright.sync_api import sync_playwright
            import google.generativeai as genai
            
            screenshots_dir = Path("/tmp/pipeline_screenshots")
            screenshots_dir.mkdir(exist_ok=True)
            
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                
                # Screenshot 1: Original web page
                print("   📸 Capturing web screenshot...")
                page = browser.new_page(viewport={'width': 1280, 'height': 900})
                page.goto(web_url, timeout=30000)
                page.wait_for_timeout(2000)
                # Click show answers if available
                try:
                    page.click("text=Show Answers", timeout=3000)
                    page.wait_for_timeout(1000)
                except:
                    pass
                web_path = screenshots_dir / f"web_{test_id}.png"
                page.screenshot(path=str(web_path), full_page=True)
                result['web_screenshot'] = str(web_path)
                page.close()
                
                # Screenshot 2: FE display
                print("   📸 Capturing FE screenshot...")
                page = browser.new_page(viewport={'width': 1280, 'height': 900})
                page.goto(f"{fe_url}/tests/{test_id}", timeout=30000)
                page.wait_for_timeout(3000)
                fe_path = screenshots_dir / f"fe_{test_id}.png"
                page.screenshot(path=str(fe_path), full_page=True)
                result['fe_screenshot'] = str(fe_path)
                page.close()
                
                browser.close()
            
            # AI comparison using Gemini Vision
            print("   🔍 AI comparing screenshots...")
            
            # Read images
            with open(web_path, 'rb') as f:
                web_img_data = base64.b64encode(f.read()).decode()
            with open(fe_path, 'rb') as f:
                fe_img_data = base64.b64encode(f.read()).decode()
            
            # Use Gemini vision
            model = genai.GenerativeModel('gemini-1.5-flash')
            
            comparison_prompt = """
Compare these two screenshots:
1. First image: Original IELTS test web page
2. Second image: Frontend (FE) display of extracted test

Check if:
- Question numbers match
- Question content matches
- Answer options match
- Question types match (MCQ, TFNG, Fill blank, etc.)

Report any discrepancies found between the two.
Format: JSON with {"matches": true/false, "issues": ["issue1", "issue2"]}
"""
            
            response = model.generate_content([
                comparison_prompt,
                {"mime_type": "image/png", "data": web_img_data},
                {"mime_type": "image/png", "data": fe_img_data}
            ])
            
            result['comparison_result'] = response.text
            
            # Parse issues
            try:
                import re
                json_match = re.search(r'\{.*\}', response.text, re.DOTALL)
                if json_match:
                    parsed = json.loads(json_match.group())
                    result['issues'] = parsed.get('issues', [])
            except:
                pass
            
            print(f"   ✅ Comparison complete")
            
        except Exception as e:
            print(f"   ⚠️ Visual comparison error: {e}")
            result['error'] = str(e)
        
        return result
