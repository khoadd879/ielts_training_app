from typing import List, Dict, Any, Optional
from .llm_client import LLMClient
from .prompts import (
    QUESTION_EXTRACTION_PROMPT,
    QUESTION_TYPE_DETECTION_PROMPT,
    FULL_EXTRACTION_PROMPT
)

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models import (
    QuestionType,
    ExtractedQuestion,
    ExtractedQuestionGroup,
    AIExtractionResult,
    ExtractedPassage
)


class QuestionExtractor:
    """Extract questions and answers from IELTS content using AI"""
    
    QUESTION_TYPE_MAP = {
        'mcq': QuestionType.MCQ,
        'multiple choice': QuestionType.MCQ,
        'tfng': QuestionType.TFNG,
        'true/false/not given': QuestionType.TFNG,
        'true false not given': QuestionType.TFNG,
        'yes_no_notgiven': QuestionType.YES_NO_NOTGIVEN,
        'yes/no/not given': QuestionType.YES_NO_NOTGIVEN,
        'yes no not given': QuestionType.YES_NO_NOTGIVEN,
        'fill_blank': QuestionType.FILL_BLANK,
        'fill in the blank': QuestionType.FILL_BLANK,
        'gap fill': QuestionType.FILL_BLANK,
        'sentence completion': QuestionType.FILL_BLANK,
        'matching': QuestionType.MATCHING,
        'match': QuestionType.MATCHING,
        'short_answer': QuestionType.SHORT_ANSWER,
        'short answer': QuestionType.SHORT_ANSWER,
        'labeling': QuestionType.LABELING,
        'labelling': QuestionType.LABELING,
        'diagram': QuestionType.LABELING,
        'other': QuestionType.OTHER,
    }
    
    def __init__(self, llm_client: LLMClient = None):
        """
        Initialize QuestionExtractor
        
        Args:
            llm_client: LLM client instance
        """
        self.llm = llm_client or LLMClient()
    
    def _normalize_question_type(self, type_str: str) -> QuestionType:
        """Normalize question type string to enum"""
        if not type_str:
            return QuestionType.OTHER
        
        type_lower = type_str.lower().strip()
        
        # Direct match
        if type_lower in self.QUESTION_TYPE_MAP:
            return self.QUESTION_TYPE_MAP[type_lower]
        
        # Partial match
        for key, value in self.QUESTION_TYPE_MAP.items():
            if key in type_lower or type_lower in key:
                return value
        
        return QuestionType.OTHER
    
    def detect_question_type(self, text: str) -> QuestionType:
        """
        Detect question type from text
        
        Args:
            text: Question section text
            
        Returns:
            Detected QuestionType
        """
        try:
            result = self.llm.call(
                prompt=QUESTION_TYPE_DETECTION_PROMPT,
                content=text,
                json_output=True
            )
            
            type_str = result.get('question_type', 'OTHER')
            return self._normalize_question_type(type_str)
            
        except Exception as e:
            print(f"Error detecting question type: {e}")
            return QuestionType.OTHER
    
    def extract_questions(
        self,
        content: str,
        question_type: Optional[QuestionType] = None
    ) -> List[ExtractedQuestion]:
        """
        Extract questions from content
        
        Args:
            content: Question section text
            question_type: Known question type (will auto-detect if not provided)
            
        Returns:
            List of ExtractedQuestion objects
        """
        if question_type is None:
            question_type = self.detect_question_type(content)
        
        prompt = QUESTION_EXTRACTION_PROMPT.format(question_type=question_type.value)
        
        try:
            result = self.llm.call(
                prompt=prompt,
                content=content,
                json_output=True
            )
            
            questions = []
            for q in result.get('questions', []):
                question = ExtractedQuestion(
                    number=q.get('number', 0),
                    content=q.get('content', ''),
                    question_type=question_type,
                    options=q.get('options'),
                    correct_answer=q.get('correct_answer')
                )
                questions.append(question)
            
            return questions
            
        except Exception as e:
            print(f"Error extracting questions: {e}")
            return []
    
    def extract_full_test(self, content: str, question_ranges: list = None) -> AIExtractionResult:
        """
        Extract complete test content (passages + questions)
        
        Args:
            content: Full test content text
            question_ranges: List of (start, end) tuples from web page (e.g., [(14, 21), (22, 25)])
            
        Returns:
            AIExtractionResult with all extracted data
        """
        try:
            result = self.llm.call(
                prompt=FULL_EXTRACTION_PROMPT,
                content=content,
                json_output=True
            )
            
            # Handle case when result is a list instead of dict
            if isinstance(result, list):
                # If result is a list, wrap it in expected structure
                result = {'passages': [], 'question_groups': result}
            
            # Extract passages
            passages = []
            passages_data = result.get('passages', [])
            if isinstance(passages_data, list):
                for p in passages_data:
                    if isinstance(p, dict):
                        # Convert escaped newlines to actual line breaks
                        content = p.get('content', '')
                        content = content.replace('\\n\\n', '\n\n')
                        content = content.replace('\\n', '\n')
                        
                        passage = ExtractedPassage(
                            title=p.get('title', 'Untitled'),
                            content=content,
                            paragraph_count=p.get('paragraph_count', 0)
                        )
                        passages.append(passage)
            
            # Extract question groups
            question_groups = []
            for g in result.get('question_groups', []):
                q_type = self._normalize_question_type(g.get('question_type', 'OTHER'))
                
                questions = []
                for q in g.get('questions', []):
                    # Handle multiple correct answers for some question types
                    correct_answers = None
                    correct_answer = q.get('correct_answer')
                    
                    if isinstance(correct_answer, list):
                        correct_answers = correct_answer
                        correct_answer = correct_answers[0] if correct_answers else None
                    
                    question = ExtractedQuestion(
                        number=q.get('number', 0),
                        content=q.get('content', ''),
                        question_type=q_type,
                        options=q.get('options'),
                        correct_answer=correct_answer,
                        correct_answers=correct_answers
                    )
                    questions.append(question)
                
                group = ExtractedQuestionGroup(
                    title=g.get('title', ''),
                    instruction=g.get('instruction'),
                    question_type=q_type,
                    questions=questions,
                    matching_options=g.get('matching_options')  # For MATCHING type
                )
                question_groups.append(group)
            
            # ========== POST-PROCESSING VALIDATION ==========
            # Step 1: Validate and fix question types based on answer patterns
            question_groups = self._validate_and_fix_question_types(question_groups)
            
            # Step 2: Fix FILL_BLANK questions where content = answer
            question_groups = self._fix_fill_blank_questions(question_groups, content)
            
            # Step 3: Split groups if AI merged different question types
            question_groups = self._split_mismatched_groups(question_groups)
            
            # Step 4: Fix question numbers using ranges from web page
            question_groups = self._fix_question_numbers(question_groups, question_ranges or [])
            
            return AIExtractionResult(
                passages=passages,
                question_groups=question_groups
            )
            
        except Exception as e:
            print(f"Error extracting full test: {e}")
            raise
    
    def _fix_fill_blank_questions(
        self, 
        groups: List[ExtractedQuestionGroup], 
        raw_text: str
    ) -> List[ExtractedQuestionGroup]:
        """Fix FILL_BLANK questions where content = answer (AI extraction error)"""
        for group in groups:
            if group.question_type != QuestionType.FILL_BLANK:
                continue
            
            for q in group.questions:
                # Detect if content is just a single word/phrase (the answer)
                content = q.content.strip() if q.content else ""
                answer = q.correct_answer.strip() if q.correct_answer else ""
                
                # If content equals answer or content has no blank marker, try to fix
                if content and answer and (
                    content.lower() == answer.lower() or
                    '___' not in content 
                ):
                    # Try to find a sentence in raw_text containing the answer
                    fixed_sentence = self._find_sentence_for_answer(raw_text, answer, q.number)
                    if fixed_sentence:
                        q.content = fixed_sentence
        
        return groups
    
    def _find_sentence_for_answer(self, raw_text: str, answer: str, question_number: int) -> Optional[str]:
        """Find a sentence in raw_text that likely contains a blank for the given answer"""
        import re
        
        # Look for patterns like:
        # 1. Lines starting with question number
        # 2. Sentences containing blanks (___) near the answer
        
        lines = raw_text.split('\n')
        
        # Try to find line with question number
        num_patterns = [
            rf'^{question_number}[\.\)]?\s+(.+)',  # "22. sentence text"
            rf'Question\s+{question_number}[:\.]?\s*(.+)',  # "Question 22: text"
        ]
        
        for line in lines:
            line = line.strip()
            for pattern in num_patterns:
                match = re.search(pattern, line, re.IGNORECASE)
                if match:
                    sentence = match.group(1).strip()
                    # Check if it has blank marker or could be a sentence
                    if '___' in sentence or len(sentence) > 20:
                        # Add blank marker if missing
                        if '___' not in sentence and '_____' not in sentence:
                            # Try to find where answer would go (simple heuristic)
                            sentence = sentence + " ___"
                        return sentence
        
        # Fallback: Look for any line with blank near the answer
        for i, line in enumerate(lines):
            if '___' in line or '____' in line:
                # Check if answer is mentioned nearby (within 2 lines in answer key)
                nearby_text = ' '.join(lines[max(0, i-5):min(len(lines), i+5)])
                if answer.lower() in nearby_text.lower():
                    # Clean up the line
                    line = line.strip()
                    if len(line) > 10:
                        return line
        
        return None
    
    def _validate_and_fix_question_types(
        self, 
        groups: List[ExtractedQuestionGroup]
    ) -> List[ExtractedQuestionGroup]:
        """Validate and fix question types based on answer patterns"""
        
        for group in groups:
            # Analyze answers to detect correct type
            detected_type = self._detect_question_type_from_answers(group.questions)
            
            if detected_type and detected_type != group.question_type:
                print(f"   ⚡ Auto-fixing: {group.question_type} → {detected_type}")
                group.question_type = detected_type
        
        return groups
    
    def _detect_question_type_from_answers(self, questions: List[ExtractedQuestion]) -> Optional[QuestionType]:
        """Detect question type based on answer patterns"""
        if not questions:
            return None
        
        # Collect all answers
        answers = [q.correct_answer.upper().strip() if q.correct_answer else "" for q in questions]
        answers = [a for a in answers if a]
        
        if not answers:
            return None
    
        # Check patterns
        # Use FULL WORDS only for TFNG/YesNo (not single letters T/F/NG which could be MATCHING)
        tfng_pattern = all(a in ['TRUE', 'FALSE', 'NOT GIVEN', 'NOTGIVEN'] for a in answers)
        yesno_pattern = all(a in ['YES', 'NO', 'NOT GIVEN', 'NOTGIVEN'] for a in answers)
        letter_pattern = all(len(a) == 1 and a.isalpha() for a in answers)
        word_pattern = all(len(a) > 1 for a in answers)
        
        # Check letter_pattern FIRST to prevent F being detected as FALSE
        if letter_pattern and len(set(answers)) > 4:
            # Many different letters like A-H = MATCHING
            return QuestionType.MATCHING
        elif letter_pattern and len(set(answers)) <= 4:
            # Few letters A-D = MCQ
            return QuestionType.MCQ
        elif tfng_pattern:
            return QuestionType.TFNG
        elif yesno_pattern:
            return QuestionType.YES_NO_NOTGIVEN
        elif word_pattern:
            # Actual words = FILL_BLANK or SHORT_ANSWER
            return QuestionType.FILL_BLANK
        
        return None
    
    def _split_mismatched_groups(
        self, 
        groups: List[ExtractedQuestionGroup]
    ) -> List[ExtractedQuestionGroup]:
        """Split groups where questions have different answer patterns (AI merged wrongly)"""
        result = []
        
        for group in groups:
            if len(group.questions) <= 3:
                result.append(group)
                continue
            
            # Check if all questions have same answer pattern
            sub_groups = self._split_by_answer_pattern(group)
            result.extend(sub_groups)
        
        return result
    
    def _split_by_answer_pattern(
        self, 
        group: ExtractedQuestionGroup
    ) -> List[ExtractedQuestionGroup]:
        """Split a group into sub-groups based on answer patterns"""
        if not group.questions:
            return [group]
        
        # Categorize questions by answer type
        letter_qs = []  # A, B, C...
        word_qs = []    # perseverance, catapult...
        tfng_qs = []    # TRUE, FALSE...
        
        for q in group.questions:
            answer = q.correct_answer.upper().strip() if q.correct_answer else ""
            
            # Check single letter FIRST (MATCHING answers like A, B, C, F, G, H)
            # This prevents "F" being detected as FALSE
            if len(answer) == 1 and answer.isalpha():
                letter_qs.append(q)
            elif answer in ['TRUE', 'FALSE', 'NOT GIVEN', 'NOTGIVEN', 'YES', 'NO']:
                # Only full words count as TFNG (NOT single letters T/F/NG)
                tfng_qs.append(q)
            else:
                word_qs.append(q)
        
        # Create sub-groups
        sub_groups = []
        
        if letter_qs:
            # Keep as MATCHING (letters A-H)
            sub = ExtractedQuestionGroup(
                title=f"Questions {letter_qs[0].number}–{letter_qs[-1].number}",
                question_type=group.question_type,  # Keep original or MATCHING
                questions=letter_qs,
                matching_options=group.matching_options
            )
            sub_groups.append(sub)
        
        if word_qs:
            # Change to FILL_BLANK (word answers)
            nums = [q.number for q in word_qs if q.number]
            title = f"Questions {min(nums)}–{max(nums)}" if nums else "Fill in the Blanks"
            sub = ExtractedQuestionGroup(
                title=title,
                question_type=QuestionType.FILL_BLANK,
                questions=word_qs
            )
            sub_groups.append(sub)
        
        if tfng_qs:
            # Change to TFNG
            nums = [q.number for q in tfng_qs if q.number]
            title = f"Questions {min(nums)}–{max(nums)}" if nums else "True/False/Not Given"
            sub = ExtractedQuestionGroup(
                title=title,
                question_type=QuestionType.TFNG,
                questions=tfng_qs
            )
            sub_groups.append(sub)
        
        if not sub_groups:
            return [group]
        
        if len(sub_groups) > 1:
            print(f"   ⚡ Split group into {len(sub_groups)} sub-groups by answer pattern")
        
        return sub_groups
    
    def _fix_question_numbers(
        self, 
        groups: List[ExtractedQuestionGroup],
        question_ranges: list
    ) -> List[ExtractedQuestionGroup]:
        """Fix question numbers using ranges parsed from web page (e.g., [(14, 21), (22, 25)])"""
        
        if not question_ranges:
            return groups
        
        # Sort ranges by start number
        sorted_ranges = sorted(question_ranges, key=lambda x: x[0])
        
        # Calculate total questions per range for matching
        range_idx = 0
        current_pos = 0
        
        for group in groups:
            if range_idx >= len(sorted_ranges):
                break
            
            start_num, end_num = sorted_ranges[range_idx]
            range_size = end_num - start_num + 1
            group_size = len(group.questions)
            
            # Check if this group fits in current range
            if group_size <= (range_size - current_pos):
                # Renumber questions based on range
                actual_start = start_num + current_pos
                if group.questions and group.questions[0].number != actual_start:
                    print(f"   ⚡ Fixing Q numbers: {group.questions[0].number}→{actual_start} (web page range)")
                    for i, q in enumerate(group.questions):
                        q.number = actual_start + i
                
                # Update group title
                actual_end = actual_start + group_size - 1
                group.title = f"Questions {actual_start}–{actual_end}"
                
                current_pos += group_size
                
                # If we've filled this range, move to next
                if current_pos >= range_size:
                    range_idx += 1
                    current_pos = 0
            else:
                # Group spans multiple ranges - move to next range
                range_idx += 1
                current_pos = 0
        
        return groups
