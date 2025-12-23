from typing import Optional, List
from pydantic import BaseModel, Field
from enum import Enum


class TestType(str, Enum):
    LISTENING = "LISTENING"
    READING = "READING"
    WRITING = "WRITING"
    SPEAKING = "SPEAKING"


class QuestionType(str, Enum):
    MCQ = "MCQ"
    TFNG = "TFNG"
    YES_NO_NOTGIVEN = "YES_NO_NOTGIVEN"
    MATCHING = "MATCHING"
    FILL_BLANK = "FILL_BLANK"
    LABELING = "LABELING"
    SHORT_ANSWER = "SHORT_ANSWER"
    OTHER = "OTHER"


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
