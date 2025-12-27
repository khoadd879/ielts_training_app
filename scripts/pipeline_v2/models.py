#!/usr/bin/env python3
"""
Pydantic Models for IELTS Exam Data
Complete implementation for ALL IELTS question types.
Provides type-safe JSON parsing with detailed error messages.
"""
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field, field_validator, model_validator


# ============================================================================
# QUESTION TYPES - Full list from QuestionType.cs
# ============================================================================

class QuestionType(str, Enum):
    """All valid IELTS question types from the project."""
    # Multiple Choice
    MULTIPLE_CHOICE_SINGLE = "MULTIPLE_CHOICE_SINGLE"
    MULTIPLE_CHOICE_MULTIPLE = "MULTIPLE_CHOICE_MULTIPLE"
    MULTIPLE_CHOICE_SINGLE_IMAGE = "MULTIPLE_CHOICE_SINGLE_IMAGE"
    
    # True/False/Yes/No
    TRUE_FALSE_NOT_GIVEN = "TRUE_FALSE_NOT_GIVEN"
    YES_NO_NOT_GIVEN = "YES_NO_NOT_GIVEN"
    
    # Completion types (fill in blank)
    SUMMARY_COMPLETION = "SUMMARY_COMPLETION"
    TABLE_COMPLETION = "TABLE_COMPLETION"
    NOTE_COMPLETION = "NOTE_COMPLETION"
    FORM_COMPLETION = "FORM_COMPLETION"
    SENTENCE_COMPLETION = "SENTENCE_COMPLETION"
    SHORT_ANSWER = "SHORT_ANSWER"
    
    # Label types (diagram/map)
    DIAGRAM_LABEL = "DIAGRAM_LABEL"
    MAP_LABEL = "MAP_LABEL"
    
    # Matching types
    MATCHING_HEADING = "MATCHING_HEADING"
    MATCHING_INFORMATION = "MATCHING_INFORMATION"
    MATCHING_FEATURES = "MATCHING_FEATURES"
    MATCHING_ENDINGS = "MATCHING_ENDINGS"
    CLASSIFICATION = "CLASSIFICATION"
    
    # Flow chart
    FLOW_CHART = "FLOW_CHART"


# ============================================================================
# QUESTION TYPE CATEGORIES
# ============================================================================

# Types that need options with is_correct marking
SINGLE_CHOICE_TYPES = {
    QuestionType.MULTIPLE_CHOICE_SINGLE,
    QuestionType.MULTIPLE_CHOICE_SINGLE_IMAGE,
    QuestionType.TRUE_FALSE_NOT_GIVEN,
    QuestionType.YES_NO_NOT_GIVEN,
}

MULTIPLE_CHOICE_TYPES = {
    QuestionType.MULTIPLE_CHOICE_MULTIPLE,
}

# Types that are fill-in-the-blank (text answer)
COMPLETION_TYPES = {
    QuestionType.SUMMARY_COMPLETION,
    QuestionType.TABLE_COMPLETION,
    QuestionType.NOTE_COMPLETION,
    QuestionType.FORM_COMPLETION,
    QuestionType.SENTENCE_COMPLETION,
    QuestionType.SHORT_ANSWER,
    QuestionType.DIAGRAM_LABEL,
    QuestionType.MAP_LABEL,
    QuestionType.FLOW_CHART,
}

# Types that match items to options (dropdown/select letter)
MATCHING_TYPES = {
    QuestionType.MATCHING_HEADING,
    QuestionType.MATCHING_INFORMATION,
    QuestionType.MATCHING_FEATURES,
    QuestionType.MATCHING_ENDINGS,
    QuestionType.CLASSIFICATION,
}


# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class QuestionOption(BaseModel):
    """A single option for a question."""
    value: str = Field(..., description="Option identifier (A, B, C, i, ii, etc.)")
    label: str = Field(..., description="Full option text")
    is_correct: bool = Field(default=False, description="Whether this option is correct")


class BlankAcceptTexts(BaseModel):
    """Accepted answers for fill-in-the-blank questions (JSONB format)."""
    # Maps blank ID to list of accepted answers
    # e.g., {"blank-q1": ["answer1", "answer2"]}
    class Config:
        extra = "allow"  # Allow dynamic keys


class MatchPair(BaseModel):
    """A match pair for matching questions."""
    option_value: str = Field(..., description="Matched option value (A, B, i, ii)")
    option_label: str = Field(default="", description="Full label text for display")


class Question(BaseModel):
    """A single IELTS question with type-specific validation."""
    idx: int = Field(..., ge=1, le=50, description="Question number 1-50")
    type: QuestionType = Field(..., description="Question type")
    prompt_md: str = Field(..., min_length=1, description="Question prompt in markdown")
    options: list[QuestionOption] = Field(default_factory=list, description="Answer options")
    correct_answers: list[str] = Field(default_factory=list, description="Correct answer(s)")
    blank_accept_texts: Optional[dict] = Field(default=None, description="Accepted answers for completion types")
    match_pairs: Optional[dict] = Field(default=None, description="Match pairs for matching types")
    
    @field_validator('prompt_md')
    @classmethod
    def prompt_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Question prompt cannot be empty")
        return v.strip()
    
    @model_validator(mode='after')
    def validate_question_by_type(self):
        """Validate question based on its type."""
        q_type = self.type
        
        # === SINGLE CHOICE VALIDATION ===
        if q_type in SINGLE_CHOICE_TYPES:
            if len(self.options) < 2:
                raise ValueError(
                    f"Q{self.idx}: {q_type.value} needs at least 2 options, found {len(self.options)}"
                )
            correct_count = sum(1 for opt in self.options if opt.is_correct)
            if correct_count != 1:
                raise ValueError(
                    f"Q{self.idx}: {q_type.value} must have exactly 1 correct option, found {correct_count}"
                )
        
        # === MULTIPLE CHOICE VALIDATION ===
        if q_type in MULTIPLE_CHOICE_TYPES:
            if len(self.options) < 3:
                raise ValueError(
                    f"Q{self.idx}: {q_type.value} needs at least 3 options, found {len(self.options)}"
                )
            correct_count = sum(1 for opt in self.options if opt.is_correct)
            if correct_count < 2:
                raise ValueError(
                    f"Q{self.idx}: {q_type.value} must have at least 2 correct options, found {correct_count}"
                )
        
        # === MATCHING HEADING VALIDATION ===
        if q_type == QuestionType.MATCHING_HEADING:
            if len(self.options) < 5:
                raise ValueError(
                    f"Q{self.idx}: MATCHING_HEADING needs at least 5 heading options (i, ii, iii...), found {len(self.options)}"
                )
        
        # === MATCHING TYPES VALIDATION ===
        if q_type in MATCHING_TYPES:
            if not self.correct_answers:
                raise ValueError(
                    f"Q{self.idx}: {q_type.value} must have correct_answers (matched option)"
                )
        
        # === COMPLETION TYPES VALIDATION ===
        if q_type in COMPLETION_TYPES:
            if not self.correct_answers and not self.blank_accept_texts:
                # Warning, not error - might be set in different field
                pass
        
        return self


class Section(BaseModel):
    """A section of the exam (passage + questions)."""
    idx: int = Field(..., ge=1, description="Section number")
    title: str = Field(..., min_length=1, description="Section title")
    passage_md: str = Field(..., description="Passage text in markdown")
    
    @field_validator('passage_md')
    @classmethod
    def passage_length_check(cls, v: str) -> str:
        if len(v) < 50:
            raise ValueError(f"Passage too short: {len(v)} chars (minimum 50)")
        return v


class Exam(BaseModel):
    """Exam metadata."""
    title: str = Field(..., min_length=1, description="Exam title")
    slug: str = Field(..., pattern=r'^[a-z0-9-]+$', description="URL-friendly slug")
    category: str = Field(default="IELTS", description="Exam category")
    level: str = Field(default="B2", description="CEFR level")
    duration_min: int = Field(default=20, ge=1, le=180, description="Duration in minutes")


class AIReview(BaseModel):
    """AI quality assessment."""
    issues_found: list[str] = Field(default_factory=list, description="Issues found during review")
    fixes_applied: list[str] = Field(default_factory=list, description="Fixes applied by AI")
    quality_score: int = Field(default=0, ge=0, le=10, description="Quality score 1-10")
    notes: str = Field(default="", description="Additional notes")


class NormalizedExam(BaseModel):
    """Complete normalized exam data."""
    exam: Exam
    sections: list[Section] = Field(..., min_length=1, description="At least 1 section required")
    questions: list[Question] = Field(..., min_length=1, description="At least 1 question required")
    ai_review: Optional[AIReview] = Field(default=None, description="AI review results")
    metadata: Optional[dict] = Field(default=None, description="Processing metadata")
    
    @model_validator(mode='after')
    def validate_question_sequence(self):
        """Validate question indices are sequential with no large gaps."""
        if not self.questions:
            return self
        
        indices = sorted([q.idx for q in self.questions])
        for i in range(len(indices) - 1):
            gap = indices[i+1] - indices[i]
            if gap > 5:  # Allow small gaps (<=5) for section breaks
                raise ValueError(f"Large gap in question sequence: Q{indices[i]} -> Q{indices[i+1]}")
        
        return self


# ============================================================================
# PARSING FUNCTIONS
# ============================================================================

def parse_normalized_exam(data: dict) -> tuple[Optional[NormalizedExam], list[str]]:
    """
    Parse raw dict to NormalizedExam with type-safe validation.
    Returns (parsed_model, errors) tuple.
    """
    errors = []
    
    try:
        exam = NormalizedExam.model_validate(data)
        return exam, []
    except Exception as e:
        # Extract detailed error messages
        if hasattr(e, 'errors'):
            for err in e.errors():
                loc = ' -> '.join(str(x) for x in err.get('loc', []))
                msg = err.get('msg', 'Unknown error')
                errors.append(f"{loc}: {msg}")
        else:
            errors.append(str(e))
        
        return None, errors


def validate_for_render(exam: NormalizedExam) -> list[str]:
    """
    Additional validation for frontend rendering.
    Returns list of warnings/issues.
    """
    warnings = []
    
    # Check passage formatting for long passages
    for section in exam.sections:
        if len(section.passage_md) > 500:
            has_markers = any(f"**{c}**" in section.passage_md or f"**{c}." in section.passage_md 
                            for c in "ABCDEFGHIJ")
            if not has_markers:
                warnings.append(f"Section {section.idx}: Long passage may need paragraph markers (A, B, C...)")
    
    # Check question prompts by type
    for q in exam.questions:
        if len(q.prompt_md) < 5:
            warnings.append(f"Q{q.idx}: Prompt very short ({len(q.prompt_md)} chars)")
        
        # COMPLETION types should have blank marker
        if q.type in COMPLETION_TYPES:
            blank_markers = ['_______', '...', '____', '[blank]', '(blank)']
            if not any(m in q.prompt_md for m in blank_markers):
                warnings.append(f"Q{q.idx}: {q.type.value} may need blank marker (_______)")
        
        # MATCHING_HEADING prompt should be short (just section letter)
        if q.type == QuestionType.MATCHING_HEADING:
            if len(q.prompt_md) > 100:
                warnings.append(f"Q{q.idx}: MATCHING_HEADING prompt should be short (Section A/B/C)")
        
        # TRUE_FALSE and YES_NO should not have options in prompt
        if q.type in {QuestionType.TRUE_FALSE_NOT_GIVEN, QuestionType.YES_NO_NOT_GIVEN}:
            if 'A.' in q.prompt_md or 'B.' in q.prompt_md:
                warnings.append(f"Q{q.idx}: {q.type.value} should be statement only, not options")
    
    return warnings


def get_question_category(q_type: QuestionType) -> str:
    """Get the category of a question type for grouping."""
    if q_type in SINGLE_CHOICE_TYPES:
        return "single_choice"
    elif q_type in MULTIPLE_CHOICE_TYPES:
        return "multiple_choice"
    elif q_type in COMPLETION_TYPES:
        return "completion"
    elif q_type in MATCHING_TYPES:
        return "matching"
    else:
        return "other"
