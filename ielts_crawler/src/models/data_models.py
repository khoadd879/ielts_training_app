from typing import Optional, List
from pydantic import BaseModel, Field
from enum import Enum


class TestType(str, Enum):
    LISTENING = "LISTENING"
    READING = "READING"
    WRITING = "WRITING"
    SPEAKING = "SPEAKING"


class QuestionType(str, Enum):
    """OLD question types - kept for backward compatibility"""
    MCQ = "MCQ"
    TFNG = "TFNG"
    YES_NO_NOTGIVEN = "YES_NO_NOTGIVEN"
    MATCHING = "MATCHING"
    FILL_BLANK = "FILL_BLANK"
    LABELING = "LABELING"
    SHORT_ANSWER = "SHORT_ANSWER"
    OTHER = "OTHER"


class NewQuestionType(str, Enum):
    """NEW question types matching exam-import.schema.json"""
    # Multiple Choice
    MULTIPLE_CHOICE_SINGLE = "MULTIPLE_CHOICE_SINGLE"
    MULTIPLE_CHOICE_MULTIPLE = "MULTIPLE_CHOICE_MULTIPLE"
    MULTIPLE_CHOICE_SINGLE_IMAGE = "MULTIPLE_CHOICE_SINGLE_IMAGE"
    
    # True/False/Yes/No
    TRUE_FALSE_NOT_GIVEN = "TRUE_FALSE_NOT_GIVEN"
    YES_NO_NOT_GIVEN = "YES_NO_NOT_GIVEN"
    
    # Completion types
    SUMMARY_COMPLETION = "SUMMARY_COMPLETION"
    TABLE_COMPLETION = "TABLE_COMPLETION"
    NOTE_COMPLETION = "NOTE_COMPLETION"
    FORM_COMPLETION = "FORM_COMPLETION"
    SENTENCE_COMPLETION = "SENTENCE_COMPLETION"
    SHORT_ANSWER = "SHORT_ANSWER"
    
    # Label types
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


def map_old_to_new_type(old_type: QuestionType, context: dict = None) -> NewQuestionType:
    """
    Map old question types to new schema types.
    
    Args:
        old_type: Old QuestionType enum value
        context: Optional context dict with 'instruction' or 'title' for better mapping
    
    Returns:
        NewQuestionType enum value
    """
    # Default mapping
    default_mapping = {
        QuestionType.MCQ: NewQuestionType.MULTIPLE_CHOICE_SINGLE,
        QuestionType.TFNG: NewQuestionType.TRUE_FALSE_NOT_GIVEN,
        QuestionType.YES_NO_NOTGIVEN: NewQuestionType.YES_NO_NOT_GIVEN,
        QuestionType.FILL_BLANK: NewQuestionType.SUMMARY_COMPLETION,
        QuestionType.SHORT_ANSWER: NewQuestionType.SHORT_ANSWER,
        QuestionType.LABELING: NewQuestionType.DIAGRAM_LABEL,
        QuestionType.MATCHING: NewQuestionType.MATCHING_INFORMATION,
        QuestionType.OTHER: NewQuestionType.SHORT_ANSWER,
    }
    
    # Context-aware mapping for ambiguous types
    if context:
        instruction = context.get("instruction", "").lower()
        title = context.get("title", "").lower()
        combined = instruction + " " + title
        
        # MATCHING type disambiguation
        if old_type == QuestionType.MATCHING:
            if "heading" in combined:
                return NewQuestionType.MATCHING_HEADING
            elif "feature" in combined or "writer" in combined or "person" in combined:
                return NewQuestionType.MATCHING_FEATURES
            elif "ending" in combined or "sentence ending" in combined:
                return NewQuestionType.MATCHING_ENDINGS
            else:
                return NewQuestionType.MATCHING_INFORMATION
        
        # FILL_BLANK type disambiguation
        if old_type == QuestionType.FILL_BLANK:
            if "table" in combined:
                return NewQuestionType.TABLE_COMPLETION
            elif "note" in combined:
                return NewQuestionType.NOTE_COMPLETION
            elif "form" in combined:
                return NewQuestionType.FORM_COMPLETION
            elif "sentence" in combined:
                return NewQuestionType.SENTENCE_COMPLETION
            else:
                return NewQuestionType.SUMMARY_COMPLETION
        
        # LABELING type disambiguation
        if old_type == QuestionType.LABELING:
            if "map" in combined:
                return NewQuestionType.MAP_LABEL
            else:
                return NewQuestionType.DIAGRAM_LABEL
        
        # MCQ type disambiguation
        if old_type == QuestionType.MCQ:
            if "choose two" in combined or "choose three" in combined:
                return NewQuestionType.MULTIPLE_CHOICE_MULTIPLE
    
    return default_mapping.get(old_type, NewQuestionType.SHORT_ANSWER)


class Level(str, Enum):
    Low = "Low"
    Mid = "Mid"
    High = "High"
    Great = "Great"


class AnswerData(BaseModel):
    """Answer data model matching BE API format"""
    answer_text: Optional[str] = None
    matching_key: Optional[str] = None
    matching_value: Optional[str] = None


class QuestionData(BaseModel):
    """Question data model"""
    numberQuestion: int
    content: str
    answers: List[AnswerData] = Field(default_factory=list)
    
    # Internal fields (not sent to API)
    idQuestion: Optional[str] = None
    idGroupOfQuestions: Optional[str] = None
    idPart: Optional[str] = None


class GroupOfQuestionsData(BaseModel):
    """Group of questions data model"""
    title: str
    typeQuestion: QuestionType
    quantity: int
    img: Optional[str] = None
    questions: List[QuestionData] = Field(default_factory=list)
    
    # Internal fields
    idGroupOfQuestions: Optional[str] = None
    idTest: Optional[str] = None
    idPart: Optional[str] = None


class PassageData(BaseModel):
    """Passage data for Reading tests"""
    title: str
    content: str
    description: Optional[str] = None
    numberParagraph: int = 0
    image: Optional[str] = None
    
    # Internal fields
    idPassage: Optional[str] = None
    idPart: Optional[str] = None


class PartData(BaseModel):
    """Part data model"""
    namePart: str
    passage: Optional[PassageData] = None
    groups: List[GroupOfQuestionsData] = Field(default_factory=list)
    
    # Internal fields
    idPart: Optional[str] = None
    idTest: Optional[str] = None


class TestData(BaseModel):
    """Complete test data model"""
    title: str
    testType: TestType
    duration: int = 60  # minutes
    numberQuestion: int = 40
    level: Level = Level.Mid
    description: Optional[str] = None
    img: Optional[str] = None
    audioUrl: Optional[str] = None  # for Listening tests
    
    parts: List[PartData] = Field(default_factory=list)
    
    # Internal fields
    idTest: Optional[str] = None
    idUser: Optional[str] = None


class CrawlResult(BaseModel):
    """Result from crawling a URL"""
    url: str
    success: bool
    test_data: Optional[TestData] = None
    error_message: Optional[str] = None
    raw_html: Optional[str] = None


class ExtractedPassage(BaseModel):
    """AI-extracted passage data"""
    title: str
    content: str
    paragraph_count: int


class ExtractedQuestion(BaseModel):
    """AI-extracted question data"""
    number: int
    content: str = ""  # Default empty string if AI returns null
    question_type: QuestionType
    options: Optional[List[str]] = None  # For MCQ
    correct_answer: Optional[str] = None
    correct_answers: Optional[List[str]] = None  # For multiple correct answers


class ExtractedQuestionGroup(BaseModel):
    """AI-extracted question group"""
    title: str
    instruction: Optional[str] = None
    question_type: QuestionType
    questions: List[ExtractedQuestion] = Field(default_factory=list)
    matching_options: Optional[List[str]] = None  # For MATCHING: ["A. Option", "B. Option"]


class AIExtractionResult(BaseModel):
    """Complete AI extraction result"""
    passages: List[ExtractedPassage] = Field(default_factory=list)
    question_groups: List[ExtractedQuestionGroup] = Field(default_factory=list)
