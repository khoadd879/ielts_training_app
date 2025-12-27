#!/usr/bin/env python3
"""Fix script for 1516-the-importance-of-law"""
import json
from pathlib import Path

NORMALIZED_PATH = Path("/home/khoa/RiderProjects/Project_Langfens_Microservice/data/normalized/mini-ielts/1516-the-importance-of-law.json")
EXTRACTED_PATH = Path("/home/khoa/RiderProjects/Project_Langfens_Microservice/data/extracted/mini-ielts/1516-the-importance-of-law.json")

extracted = json.loads(EXTRACTED_PATH.read_text())
passage = extracted.get('passage', '')
image_url = extracted.get('image_url', '')

HEADING_OPTIONS = [
    {"value": "i", "text": "Different areas of professional expertise"},
    {"value": "ii", "text": "Reasons why it is unfair to criticise lawyers"},
    {"value": "iii", "text": "The disadvantages of the legal system"},
    {"value": "iv", "text": "The law applies throughout our lives"},
    {"value": "v", "text": "The law has affected historical events"},
    {"value": "vi", "text": "A negative regard for lawyers"},
    {"value": "vii", "text": "Public's increasing ability to influence the law"},
    {"value": "viii", "text": "Growth in laws"},
]

MCQ_OPTIONS = [
    {"value": "A", "text": "There should be a person with legal training in every hospital."},
    {"value": "B", "text": "Lawyers with experience in commercial law are the most in demand."},
    {"value": "C", "text": "Knowledge of the law is as important as having computer skills."},
    {"value": "D", "text": "Society could not function effectively without legal experts."},
    {"value": "E", "text": "Schools should teach students about the law."},
]

def make_heading_options(correct):
    return [{"idx": i+1, "value": o["value"], "text": o["text"], "is_correct": o["value"] == correct} for i, o in enumerate(HEADING_OPTIONS)]

def make_mcq_options(correct):
    return [{"idx": i+1, "value": o["value"], "text": o["text"], "is_correct": o["value"] == correct} for i, o in enumerate(MCQ_OPTIONS)]

data = {
    "exam": {"title": "The importance of law", "category": "IELTS", "level": "B2", "duration_min": 20, "image_url": image_url},
    "sections": [{"idx": 1, "title": "The importance of law",
        "instruction_md": "**Questions 1-6:**\nChoose the correct heading for each paragraph from the list of headings below.",
        "passage_md": passage, "audio_url": None, "transcript_md": None,
        "questions": [
            {"idx": 1, "type": "MATCHING_HEADING", "skill": "reading", "difficulty": 2, "prompt_md": "Paragraph A", "explanation_md": "", "correct_answers": ["iv"], "options": make_heading_options("iv")},
            {"idx": 2, "type": "MATCHING_HEADING", "skill": "reading", "difficulty": 2, "prompt_md": "Paragraph B", "explanation_md": "", "correct_answers": ["vii"], "options": make_heading_options("vii")},
            {"idx": 3, "type": "MATCHING_HEADING", "skill": "reading", "difficulty": 2, "prompt_md": "Paragraph C", "explanation_md": "", "correct_answers": ["i"], "options": make_heading_options("i")},
            {"idx": 4, "type": "MATCHING_HEADING", "skill": "reading", "difficulty": 2, "prompt_md": "Paragraph D", "explanation_md": "", "correct_answers": ["viii"], "options": make_heading_options("viii")},
            {"idx": 5, "type": "MATCHING_HEADING", "skill": "reading", "difficulty": 2, "prompt_md": "Paragraph E", "explanation_md": "", "correct_answers": ["vi"], "options": make_heading_options("vi")},
            {"idx": 6, "type": "MATCHING_HEADING", "skill": "reading", "difficulty": 2, "prompt_md": "Paragraph F", "explanation_md": "", "correct_answers": ["ii"], "options": make_heading_options("ii")},
            {"idx": 7, "type": "MULTIPLE_CHOICE_SINGLE", "skill": "reading", "difficulty": 2, "prompt_md": "Which statement does the writer make about legal skills?", "explanation_md": "", "correct_answers": ["C"], "options": make_mcq_options("C")},
            {"idx": 8, "type": "MULTIPLE_CHOICE_SINGLE", "skill": "reading", "difficulty": 2, "prompt_md": "Which statement does the writer make about legal skills?", "explanation_md": "", "correct_answers": ["D"], "options": make_mcq_options("D")},
            {"idx": 9, "type": "SUMMARY_COMPLETION", "skill": "reading", "difficulty": 2, "prompt_md": "People sometimes say that _______ is of little interest to lawyers.", "explanation_md": "", "correct_answers": ["truth"], "options": []},
            {"idx": 10, "type": "SUMMARY_COMPLETION", "skill": "reading", "difficulty": 2, "prompt_md": "Some _______ or scientific experts may be driven by greed.", "explanation_md": "", "correct_answers": ["journalists"], "options": []},
            {"idx": 11, "type": "SUMMARY_COMPLETION", "skill": "reading", "difficulty": 2, "prompt_md": "Attacking IT staff or _______ for the same reason.", "explanation_md": "", "correct_answers": ["nurses"], "options": []},
            {"idx": 12, "type": "SUMMARY_COMPLETION", "skill": "reading", "difficulty": 2, "prompt_md": "Requires them to have _______ to their work.", "explanation_md": "", "correct_answers": ["dedication"], "options": []},
            {"idx": 13, "type": "SUMMARY_COMPLETION", "skill": "reading", "difficulty": 2, "prompt_md": "Time is spent writing _______ rather than dealing with misfortunes.", "explanation_md": "", "correct_answers": ["documents"], "options": []},
        ]}],
    "_metadata": {"source": "mini-ielts", "item_id": "1516-the-importance-of-law", "url": "https://mini-ielts.com/1516/reading/the-importance-of-law"}
}

NORMALIZED_PATH.write_text(json.dumps(data, indent=2, ensure_ascii=False))
print(f"✓ Fixed: {NORMALIZED_PATH}")
print(f"  - 13 questions (6 MATCHING_HEADING, 2 MCQ_SINGLE, 5 SUMMARY_COMPLETION)")
