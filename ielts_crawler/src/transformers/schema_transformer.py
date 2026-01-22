"""
Schema Transformer - Transform crawler data to exam-import.schema.json format

This module converts the internal TestData format from ielts_crawler
to the standardized exam-import.schema.json format used by the exam service.
"""
import uuid
import re
from typing import List, Dict, Any, Optional
from pathlib import Path

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import (
    TestData,
    PartData,
    PassageData,
    GroupOfQuestionsData,
    QuestionData,
    AnswerData,
    QuestionType,
    NewQuestionType,
    map_old_to_new_type,
    TestType,
    Level,
)


def generate_slug(title: str) -> str:
    """Generate URL-friendly slug from title"""
    slug = title.lower()
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'\s+', '-', slug)
    slug = re.sub(r'-+', '-', slug)
    slug = slug.strip('-')
    return slug[:128]


def map_level_to_cefr(level: Level) -> str:
    """Map internal Level to CEFR level"""
    mapping = {
        Level.Low: "A2",
        Level.Mid: "B1", 
        Level.High: "B2",
        Level.Great: "C1",
    }
    return mapping.get(level, "B2")


def map_skill(test_type: TestType) -> str:
    """Map TestType to exam-import skill"""
    return test_type.value.upper()  # READING, LISTENING, WRITING, SPEAKING


def transform_options(answers: List[AnswerData], q_type: NewQuestionType) -> List[Dict]:
    """Transform answer options to exam-import format"""
    options = []
    
    if q_type in [NewQuestionType.MULTIPLE_CHOICE_SINGLE, 
                  NewQuestionType.MULTIPLE_CHOICE_MULTIPLE,
                  NewQuestionType.MULTIPLE_CHOICE_SINGLE_IMAGE]:
        # MCQ: options with isCorrect flag
        for i, ans in enumerate(answers):
            letter = chr(ord('A') + i)
            is_correct = (ans.matching_value == "CORRECT" if ans.matching_value else False)
            options.append({
                "id": str(uuid.uuid4()),
                "idx": i + 1,
                "contentMd": ans.answer_text or "",
                "isCorrect": is_correct
            })
    
    elif q_type in [NewQuestionType.TRUE_FALSE_NOT_GIVEN, NewQuestionType.YES_NO_NOT_GIVEN]:
        # TFNG/YNNG: Three options TRUE/FALSE/NOT GIVEN
        if q_type == NewQuestionType.TRUE_FALSE_NOT_GIVEN:
            opt_labels = ["TRUE", "FALSE", "NOT GIVEN"]
        else:
            opt_labels = ["YES", "NO", "NOT GIVEN"]
        
        correct_value = None
        if answers:
            correct_value = answers[0].answer_text or answers[0].matching_value
        
        for i, label in enumerate(opt_labels):
            options.append({
                "id": str(uuid.uuid4()),
                "idx": i + 1,
                "contentMd": label,
                "isCorrect": label.upper().replace(" ", "_").replace("NOT_GIVEN", "NOT GIVEN") == (correct_value or "").upper().replace("_", " ")
            })
    
    return options


def transform_blank_accept_texts(answers: List[AnswerData], q_type: NewQuestionType, q_num: int) -> Dict:
    """Transform answers to blankAcceptTexts format for completion types"""
    if q_type not in [NewQuestionType.SUMMARY_COMPLETION, NewQuestionType.TABLE_COMPLETION,
                      NewQuestionType.NOTE_COMPLETION, NewQuestionType.FORM_COMPLETION,
                      NewQuestionType.SENTENCE_COMPLETION, NewQuestionType.SHORT_ANSWER,
                      NewQuestionType.DIAGRAM_LABEL, NewQuestionType.MAP_LABEL]:
        return {}
    
    blank_key = f"blank{q_num}"
    accepted_texts = []
    
    for ans in answers:
        if ans.answer_text:
            # Add both exact and normalized versions
            accepted_texts.append(ans.answer_text)
            # Also add lowercase version
            if ans.answer_text.lower() != ans.answer_text:
                accepted_texts.append(ans.answer_text.lower())
    
    if accepted_texts:
        return {blank_key: accepted_texts}
    return {}


def transform_match_pairs(answers: List[AnswerData], q_type: NewQuestionType) -> Dict:
    """Transform answers to matchPairs format for matching types"""
    if q_type not in [NewQuestionType.MATCHING_HEADING, NewQuestionType.MATCHING_INFORMATION,
                      NewQuestionType.MATCHING_FEATURES, NewQuestionType.MATCHING_ENDINGS,
                      NewQuestionType.CLASSIFICATION]:
        return {}
    
    match_pairs = {}
    for ans in answers:
        if ans.matching_key and ans.matching_value:
            # For matching, the value is the correct match
            key = ans.matching_key
            if key not in match_pairs:
                match_pairs[key] = []
            match_pairs[key].append(ans.matching_value)
    
    # Default key for simple matches
    if not match_pairs and answers:
        for ans in answers:
            if ans.answer_text:
                match_pairs["paragraph"] = [ans.answer_text]
                break
            elif ans.matching_value:
                match_pairs["paragraph"] = [ans.matching_value]
                break
    
    return match_pairs


def transform_question(
    q: QuestionData, 
    group: GroupOfQuestionsData, 
    skill: str,
    passage_md: str = ""
) -> Dict[str, Any]:
    """Transform a single question to exam-import format"""
    
    # Get context for type mapping
    context = {
        "title": group.title,
        "instruction": group.title,  # Use title as instruction context
    }
    
    new_type = map_old_to_new_type(group.typeQuestion, context)
    
    # Build prompt
    prompt_md = q.content or ""
    
    # Transform based on question type
    options = transform_options(q.answers, new_type)
    blank_accept_texts = transform_blank_accept_texts(q.answers, new_type, q.numberQuestion)
    match_pairs = transform_match_pairs(q.answers, new_type)
    
    # For short answer types, extract from answers
    short_answer_accept_texts = []
    if new_type == NewQuestionType.SHORT_ANSWER:
        for ans in q.answers:
            if ans.answer_text:
                short_answer_accept_texts.append(ans.answer_text)
    
    return {
        "id": str(uuid.uuid4()),
        "idx": q.numberQuestion,
        "type": new_type.value,
        "skill": skill,
        "difficulty": 2,  # Default difficulty
        "promptMd": prompt_md,
        "explanationMd": None,
        "options": options,
        "blankAcceptTexts": blank_accept_texts,
        "blankAcceptRegex": {},
        "matchPairs": match_pairs,
        "orderCorrects": [],
        "shortAnswerAcceptTexts": short_answer_accept_texts if short_answer_accept_texts else [],
        "shortAnswerAcceptRegex": []
    }


def transform_section(
    part: PartData, 
    idx: int, 
    skill: str
) -> Dict[str, Any]:
    """Transform a Part to an exam-import Section"""
    
    # Build passage content
    passage_md = ""
    if part.passage:
        passage_md = part.passage.content or ""
        # Add title if exists
        if part.passage.title:
            passage_md = f"# {part.passage.title}\n\n{passage_md}"
    
    # Build instructions from group titles
    instructions_parts = []
    for group in part.groups:
        instructions_parts.append(f"## {group.title}")
    instructions_md = "\n\n".join(instructions_parts) if instructions_parts else None
    
    # Transform all questions
    questions = []
    for group in part.groups:
        for q in group.questions:
            questions.append(transform_question(q, group, skill, passage_md))
    
    return {
        "id": str(uuid.uuid4()),
        "idx": idx,
        "title": part.namePart,
        "instructionsMd": instructions_md,
        "audioUrl": None,  # Set from test level if listening
        "transcriptMd": None,
        "questions": questions
    }


def transform_to_exam_import_schema(test_data: TestData) -> Dict[str, Any]:
    """
    Transform TestData to exam-import.schema.json format.
    
    Args:
        test_data: Internal TestData from crawler
        
    Returns:
        Dict matching exam-import.schema.json structure
    """
    exam_id = str(uuid.uuid4())
    skill = map_skill(test_data.testType)
    
    # Transform all parts to sections
    sections = []
    for i, part in enumerate(test_data.parts, start=1):
        section = transform_section(part, i, skill)
        # Add audio to first section if listening
        if i == 1 and test_data.audioUrl:
            section["audioUrl"] = test_data.audioUrl
        sections.append(section)
    
    return {
        "schemaVersion": "1.0.0",
        "exams": [{
            "id": exam_id,
            "slug": generate_slug(test_data.title),
            "title": test_data.title,
            "descriptionMd": test_data.description or f"IELTS {skill.title()} Practice Test",
            "category": "IELTS",
            "level": map_level_to_cefr(test_data.level),
            "status": "PUBLISHED",
            "durationMin": test_data.duration,
            "sections": sections
        }]
    }


def save_normalized_exam(normalized: Dict[str, Any], output_path: Optional[Path] = None) -> Path:
    """
    Save normalized exam to JSON file.
    
    Args:
        normalized: Dict in exam-import.schema.json format
        output_path: Optional output path, defaults to output/{slug}.json
        
    Returns:
        Path to saved file
    """
    import json
    
    if output_path is None:
        slug = normalized["exams"][0]["slug"]
        output_dir = Path(__file__).parent.parent / "output"
        output_dir.mkdir(parents=True, exist_ok=True)
        output_path = output_dir / f"{slug}.json"
    
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(normalized, f, indent=2, ensure_ascii=False)
    
    return output_path


# Convenience function for direct transformation
def transform_and_save(test_data: TestData, output_path: Optional[Path] = None) -> Path:
    """Transform TestData and save to JSON file"""
    normalized = transform_to_exam_import_schema(test_data)
    return save_normalized_exam(normalized, output_path)
