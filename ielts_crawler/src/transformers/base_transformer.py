"""
Transformers to convert AI extraction results to BE API format
"""
from typing import List
from abc import ABC, abstractmethod

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models import (
    QuestionType,
    AnswerData,
    QuestionData,
    ExtractedQuestion,
    ExtractedQuestionGroup
)


class BaseTransformer(ABC):
    """Base class for question type transformers"""
    
    @abstractmethod
    def transform(
        self,
        group: ExtractedQuestionGroup,
        id_group: str,
        id_part: str,
        start_number: int = 1
    ) -> List[QuestionData]:
        """
        Transform extracted questions to API format
        
        Args:
            group: Extracted question group
            id_group: GroupOfQuestions ID from API
            id_part: Part ID from API
            start_number: Starting question number
            
        Returns:
            List of QuestionData ready for API
        """
        pass


class MCQTransformer(BaseTransformer):
    """Transform MCQ questions"""
    
    def transform(
        self,
        group: ExtractedQuestionGroup,
        id_group: str,
        id_part: str,
        start_number: int = 1
    ) -> List[QuestionData]:
        questions = []
        
        for q in group.questions:
            answers = []
            
            # Extract options (A, B, C, D, etc.)
            for i, opt in enumerate(q.options or []):
                letter = chr(65 + i)  # A, B, C, D...
                
                # Clean option text (remove "A." prefix if present)
                opt_text = opt
                if opt.startswith(f"{letter}.") or opt.startswith(f"{letter} "):
                    opt_text = opt[2:].strip()
                
                # Check if this is the correct answer
                is_correct = False
                if q.correct_answer:
                    correct = q.correct_answer.upper().strip()
                    # Match by letter or full text
                    if correct == letter or correct == opt_text.upper() or letter in correct:
                        is_correct = True
                
                # FE expects: CORRECT for right, INCORRECT for wrong (MCQ only)
                answer = AnswerData(
                    answer_text=opt_text,
                    matching_key=letter,
                    matching_value="CORRECT" if is_correct else "INCORRECT"
                )
                answers.append(answer)
            
            question = QuestionData(
                numberQuestion=q.number or start_number,
                content=q.content,
                answers=answers,
                idGroupOfQuestions=id_group,
                idPart=id_part
            )
            questions.append(question)
        
        return questions


class TFNGTransformer(BaseTransformer):
    """Transform True/False/Not Given questions"""
    
    VALUE_MAP = {
        'true': 'TRUE',
        't': 'TRUE',
        'false': 'FALSE',
        'f': 'FALSE',
        'not given': 'NOT GIVEN',
        'notgiven': 'NOT GIVEN',
        'ng': 'NOT GIVEN',
    }
    
    def transform(
        self,
        group: ExtractedQuestionGroup,
        id_group: str,
        id_part: str,
        start_number: int = 1
    ) -> List[QuestionData]:
        questions = []
        
        for q in group.questions:
            # Normalize answer
            answer_value = None
            if q.correct_answer:
                answer_lower = q.correct_answer.lower().strip()
                answer_value = self.VALUE_MAP.get(answer_lower, q.correct_answer.upper())
            
            # FE expects: answer_text stores TRUE/FALSE/NOT GIVEN
            answers = [
                AnswerData(
                    answer_text=answer_value,
                    matching_key=None,
                    matching_value=None
                )
            ] if answer_value else []
            
            question = QuestionData(
                numberQuestion=q.number or start_number,
                content=q.content,
                answers=answers,
                idGroupOfQuestions=id_group,
                idPart=id_part
            )
            questions.append(question)
        
        return questions


class YesNoNotGivenTransformer(BaseTransformer):
    """Transform Yes/No/Not Given questions"""
    
    VALUE_MAP = {
        'yes': 'YES',
        'y': 'YES',
        'no': 'NO',
        'n': 'NO',
        'not given': 'NOT GIVEN',
        'notgiven': 'NOT GIVEN',
        'ng': 'NOT GIVEN',
    }
    
    def transform(
        self,
        group: ExtractedQuestionGroup,
        id_group: str,
        id_part: str,
        start_number: int = 1
    ) -> List[QuestionData]:
        questions = []
        
        for q in group.questions:
            # Normalize answer
            answer_value = None
            if q.correct_answer:
                answer_lower = q.correct_answer.lower().strip()
                answer_value = self.VALUE_MAP.get(answer_lower, q.correct_answer.upper())
            
            # FE expects: answer_text stores YES/NO/NOT GIVEN
            answers = [
                AnswerData(
                    answer_text=answer_value,
                    matching_key=None,
                    matching_value=None
                )
            ] if answer_value else []
            
            question = QuestionData(
                numberQuestion=q.number or start_number,
                content=q.content,
                answers=answers,
                idGroupOfQuestions=id_group,
                idPart=id_part
            )
            questions.append(question)
        
        return questions


class FillBlankTransformer(BaseTransformer):
    """Transform Fill in the Blank questions"""
    
    def transform(
        self,
        group: ExtractedQuestionGroup,
        id_group: str,
        id_part: str,
        start_number: int = 1
    ) -> List[QuestionData]:
        questions = []
        
        for q in group.questions:
            answers = []
            
            if q.correct_answer:
                answer = AnswerData(
                    answer_text=q.correct_answer.strip()
                )
                answers.append(answer)
            elif q.correct_answers:
                for ans in q.correct_answers:
                    answer = AnswerData(answer_text=ans.strip())
                    answers.append(answer)
            
            question = QuestionData(
                numberQuestion=q.number or start_number,
                content=q.content,
                answers=answers,
                idGroupOfQuestions=id_group,
                idPart=id_part
            )
            questions.append(question)
        
        return questions


class MatchingTransformer(BaseTransformer):
    """Transform Matching questions - builds options pool for FE"""
    
    def transform(
        self,
        group: ExtractedQuestionGroup,
        id_group: str,
        id_part: str,
        start_number: int = 1
    ) -> List[QuestionData]:
        questions = []
        
        # Build options pool from matching_options if available
        options_pool = []
        if hasattr(group, 'matching_options') and group.matching_options:
            for opt in group.matching_options:
                # Parse "A. Option text" format
                if '. ' in opt:
                    key, text = opt.split('. ', 1)
                else:
                    key = opt[0] if opt else 'A'
                    text = opt[2:].strip() if len(opt) > 2 else opt
                
                options_pool.append(AnswerData(
                    matching_key=key.strip(),
                    answer_text=text.strip(),
                    matching_value=None  # Will mark CORRECT for correct answer
                ))
        
        for q in group.questions:
            # Create answers array with options pool
            answers = []
            
            if options_pool:
                # Clone options pool and mark correct answer
                for opt in options_pool:
                    is_correct = False
                    if q.correct_answer:
                        # Compare answer (could be just letter like "A" or full text)
                        correct = q.correct_answer.upper().strip()
                        if correct == opt.matching_key or correct.startswith(opt.matching_key):
                            is_correct = True
                    
                    # FE expects: CORRECT for right, null for wrong
                    answers.append(AnswerData(
                        matching_key=opt.matching_key,
                        answer_text=opt.answer_text,
                        matching_value="CORRECT" if is_correct else None
                    ))
            elif q.correct_answer:
                # No options pool, just store the correct answer
                answer = AnswerData(
                    matching_key=str(q.number or start_number),
                    matching_value=q.correct_answer.upper().strip()
                )
                answers.append(answer)
            
            question = QuestionData(
                numberQuestion=q.number or start_number,
                content=q.content,
                answers=answers,
                idGroupOfQuestions=id_group,
                idPart=id_part
            )
            questions.append(question)
        
        return questions


class ShortAnswerTransformer(BaseTransformer):
    """Transform Short Answer questions"""
    
    def transform(
        self,
        group: ExtractedQuestionGroup,
        id_group: str,
        id_part: str,
        start_number: int = 1
    ) -> List[QuestionData]:
        questions = []
        
        for q in group.questions:
            answers = []
            
            if q.correct_answer:
                answer = AnswerData(
                    answer_text=q.correct_answer.strip()
                )
                answers.append(answer)
            
            question = QuestionData(
                numberQuestion=q.number or start_number,
                content=q.content,
                answers=answers,
                idGroupOfQuestions=id_group,
                idPart=id_part
            )
            questions.append(question)
        
        return questions


class LabelingTransformer(BaseTransformer):
    """Transform Labeling questions"""
    
    def transform(
        self,
        group: ExtractedQuestionGroup,
        id_group: str,
        id_part: str,
        start_number: int = 1
    ) -> List[QuestionData]:
        questions = []
        
        for q in group.questions:
            answers = []
            
            if q.correct_answer:
                answer = AnswerData(
                    answer_text=q.correct_answer.strip(),
                    matching_key=str(q.number or start_number)
                )
                answers.append(answer)
            
            question = QuestionData(
                numberQuestion=q.number or start_number,
                content=q.content,
                answers=answers,
                idGroupOfQuestions=id_group,
                idPart=id_part
            )
            questions.append(question)
        
        return questions


class TransformerFactory:
    """Factory to get appropriate transformer for question type"""
    
    _transformers = {
        QuestionType.MCQ: MCQTransformer(),
        QuestionType.TFNG: TFNGTransformer(),
        QuestionType.YES_NO_NOTGIVEN: YesNoNotGivenTransformer(),
        QuestionType.FILL_BLANK: FillBlankTransformer(),
        QuestionType.MATCHING: MatchingTransformer(),
        QuestionType.SHORT_ANSWER: ShortAnswerTransformer(),
        QuestionType.LABELING: LabelingTransformer(),
        QuestionType.OTHER: ShortAnswerTransformer(),  # Default to short answer
    }
    
    @classmethod
    def get_transformer(cls, question_type: QuestionType) -> BaseTransformer:
        """Get transformer for question type"""
        return cls._transformers.get(question_type, ShortAnswerTransformer())
