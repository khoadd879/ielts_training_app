#!/usr/bin/env python3
"""
Generate SQL for Multi-Section IELTS Reading Tests.
Supports full tests with 3 sections (3 passages).
"""
import json
import re
from datetime import datetime
from pathlib import Path
from typing import List, Dict

from config import SEEDS_DIR, get_logger

logger = get_logger(__name__)


def escape_sql(text: str) -> str:
    """Escape text for SQL."""
    if not text:
        return ""
    return text.replace("'", "''").replace("\\", "\\\\").replace("\n", "\\n")


def generate_multi_section_sql(data: dict) -> str:
    """
    Generate SQL for multi-section exam (full IELTS reading test).
    
    Expected data format:
    {
        "exam": {"title": "...", "slug": "...", ...},
        "sections": [
            {"idx": 1, "title": "...", "passage_md": "...", "instruction_md": "...", "question_groups": [...]},
            {"idx": 2, ...},
            {"idx": 3, ...}
        ],
        "questions": [
            {"idx": 1, "type": "...", "prompt_md": "...", "correct_answers": [...], ...},
            ...
        ]
    }
    """
    exam = data.get('exam', {})
    sections = data.get('sections', [])
    questions = data.get('questions', [])
    
    title = exam.get('title', 'IELTS Reading Full Test')
    slug = exam.get('slug', 'full-test')
    slug = f"ielts-mentor-{re.sub(r'[^a-z0-9]+', '-', slug.lower()).strip('-')}"
    
    image_url = escape_sql(exam.get('image_url', ''))
    
    sql_lines = [
        "-- ============================================",
        f"-- IELTS Full Test Import SQL (Multi-Section)",
        f"-- Generated: {datetime.now().isoformat()}",
        f"-- Source: ielts-mentor.com",
        f"-- Title: {title}",
        f"-- Sections: {len(sections)}",
        f"-- Questions: {len(questions)}",
        "-- ============================================",
        "",
        "BEGIN;",
        "CREATE EXTENSION IF NOT EXISTS pgcrypto;",
        "",
        f"-- Cleanup existing data for slug: {slug}",
        f"DELETE FROM exam_options WHERE \"QuestionId\" IN (",
        f"  SELECT q.\"Id\" FROM exam_questions q",
        f"  JOIN exam_sections s ON s.\"Id\" = q.\"SectionId\"",
        f"  JOIN exams e ON e.\"Id\" = s.\"ExamId\"",
        f"  WHERE e.\"Slug\" = '{slug}'",
        ");",
        f"DELETE FROM exam_question_groups WHERE \"SectionId\" IN (",
        f"  SELECT s.\"Id\" FROM exam_sections s",
        f"  JOIN exams e ON e.\"Id\" = s.\"ExamId\"",
        f"  WHERE e.\"Slug\" = '{slug}'",
        ");",
        f"DELETE FROM exam_questions USING exam_sections s, exams e",
        f"WHERE exam_questions.\"SectionId\" = s.\"Id\"",
        f"  AND s.\"ExamId\" = e.\"Id\"",
        f"  AND e.\"Slug\" = '{slug}';",
        f"DELETE FROM exam_sections USING exams e",
        f"WHERE exam_sections.\"ExamId\" = e.\"Id\"",
        f"  AND e.\"Slug\" = '{slug}';",
        f"DELETE FROM exams WHERE \"Slug\" = '{slug}';",
        "",
        "DO $$",
        "DECLARE",
        "  exam_id uuid := gen_random_uuid();",
    ]
    
    # Declare section variables
    for i, section in enumerate(sections, 1):
        sql_lines.append(f"  sec{i} uuid := gen_random_uuid();")
    
    sql_lines.extend([
        "  qid uuid;",
        "BEGIN",
        "",
    ])
    
    # Insert exam
    sql_lines.extend([
        f"  INSERT INTO exams (\"Id\",\"Slug\",\"Title\",\"DescriptionMd\",\"Category\",\"Level\",\"Status\",\"DurationMin\",\"ImageUrl\",\"UpdatedAt\")",
        "  VALUES (",
        f"    exam_id,",
        f"    '{slug}',",
        f"    '{escape_sql(title)}',",
        f"    'Full IELTS Academic Reading Test with 3 passages',",
        f"    'IELTS',",
        f"    'B2',",
        f"    'PUBLISHED',",
        f"    60,",  # Full test = 60 min
        f"    '{image_url}'," if image_url else "    NULL,",
        f"    now()",
        "  );",
        "",
    ])
    
    # Build map: question idx -> section idx
    question_to_section = {}
    for section in sections:
        sec_idx = section.get('idx', 1)
        groups = section.get('question_groups', [])
        for grp in groups:
            for q_idx in range(grp['start_idx'], grp['end_idx'] + 1):
                question_to_section[q_idx] = sec_idx
    
    # If no groups, distribute questions evenly
    if not question_to_section and questions:
        q_per_section = len(questions) // len(sections)
        for i, q in enumerate(questions):
            sec_idx = min((i // q_per_section) + 1, len(sections))
            question_to_section[q['idx']] = sec_idx
    
    # Insert sections
    for section in sections:
        sec_idx = section.get('idx', 1)
        sec_title = escape_sql(section.get('title', f'Section {sec_idx}'))
        passage_md = escape_sql(section.get('passage_md', '')[:8000])
        instruction_md = escape_sql(section.get('instruction_md', ''))
        
        sql_lines.extend([
            f"  -- Section {sec_idx}",
            f"  INSERT INTO exam_sections (\"Id\",\"ExamId\",\"Idx\",\"Title\",\"InstructionsMd\",\"PassageMd\")",
            "  VALUES (",
            f"    sec{sec_idx},",
            f"    exam_id,",
            f"    {sec_idx},",
            f"    '{sec_title}',",
            f"    E'{instruction_md}',",
            f"    E'{passage_md}'",
            "  );",
            "",
        ])
    
    # Insert questions
    for q in questions:
        q_idx = q.get('idx', 1)
        q_type = q.get('type', 'SUMMARY_COMPLETION')
        q_prompt = escape_sql(q.get('prompt_md', q.get('prompt', '')))
        explanation = escape_sql(q.get('explanation_md', ''))
        correct_answers = q.get('correct_answers', [])
        correct = correct_answers[0] if correct_answers else q.get('correct_answer', '')
        options = q.get('options', [])
        
        # Find which section this question belongs to
        sec_idx = question_to_section.get(q_idx, 1)
        sec_var = f"sec{sec_idx}"
        
        if q_type in ['TRUE_FALSE_NOT_GIVEN', 'YES_NO_NOT_GIVEN', 'MCQ_SINGLE', 'MULTIPLE_CHOICE_SINGLE', 
                      'MATCHING_HEADING', 'MATCHING_FEATURES', 'MATCHING_INFORMATION']:
            # Build MatchPairs for MATCHING_* types
            match_pairs_sql = 'NULL'
            if q_type in ['MATCHING_INFORMATION', 'MATCHING_FEATURES'] and correct:
                prompt_key = f"info-q{q_idx}"
                match_pairs_sql = f"'{{\"{prompt_key}\": [\"{correct.upper()}\", \"{correct.lower()}\"]}}'::jsonb"
            elif q_type == 'MATCHING_HEADING' and correct:
                prompt_key = f"heading-q{q_idx}"
                match_pairs_sql = f"'{{\"{prompt_key}\": [\"{correct.lower()}\", \"{correct.lower()}\"]}}'::jsonb"
            
            sql_lines.extend([
                f"  qid := gen_random_uuid();",
                f"  INSERT INTO exam_questions (\"Id\",\"SectionId\",\"Idx\",\"Type\",\"Skill\",\"Difficulty\",\"PromptMd\",\"ExplanationMd\",\"MatchPairs\")",
                f"  VALUES (",
                f"    qid,",
                f"    {sec_var},",
                f"    {q_idx},",
                f"    '{q_type}',",
                f"    'READING',",
                f"    2,",
                f"    E'{q_prompt}',",
                f"    E'{explanation}'," if explanation else f"    '',",
                f"    {match_pairs_sql}",
                f"  );",
            ])
            
            # Insert options
            for i, opt in enumerate(options):
                is_correct = 'true' if opt.get('is_correct') else 'false'
                opt_content = escape_sql(opt.get('label', opt.get('value', '')))
                sql_lines.append(
                    f"  INSERT INTO exam_options (\"Id\",\"QuestionId\",\"Idx\",\"ContentMd\",\"IsCorrect\") VALUES "
                    f"(gen_random_uuid(), qid, {i+1}, E'{opt_content}', {is_correct});"
                )
            sql_lines.append("")
            
        else:  # SUMMARY_COMPLETION, SHORT_ANSWER, etc.
            blank_key = f"blank-q{q_idx}"
            answers = []
            if correct:
                if ' / ' in str(correct):
                    answers = [v.strip() for v in str(correct).split(' / ')]
                elif isinstance(correct, list):
                    answers = correct
                else:
                    answers.append(str(correct))
            
            sql_lines.extend([
                f"  qid := gen_random_uuid();",
                f"  INSERT INTO exam_questions (\"Id\",\"SectionId\",\"Idx\",\"Type\",\"Skill\",\"Difficulty\",\"PromptMd\",\"ExplanationMd\",\"BlankAcceptTexts\")",
                f"  VALUES (",
                f"    qid,",
                f"    {sec_var},",
                f"    {q_idx},",
                f"    '{q_type}',",
                f"    'READING',",
                f"    2,",
                f"    E'{q_prompt}',",
                f"    E'{explanation}'," if explanation else f"    '',",
                f"    '{{\"{blank_key}\": {json.dumps(answers)}}}'::jsonb",
                f"  );",
                "",
            ])
    
    # Insert question groups
    for section in sections:
        sec_idx = section.get('idx', 1)
        groups = section.get('question_groups', [])
        for grp in groups:
            grp_idx = grp.get('idx', 1)
            start_idx = grp.get('start_idx', 1)
            end_idx = grp.get('end_idx', 1)
            instruction = escape_sql(grp.get('instruction_md', ''))
            
            sql_lines.extend([
                f"  INSERT INTO exam_question_groups (\"Id\",\"SectionId\",\"Idx\",\"StartIdx\",\"EndIdx\",\"InstructionMd\")",
                f"  VALUES (gen_random_uuid(), sec{sec_idx}, {grp_idx}, {start_idx}, {end_idx}, E'{instruction}');",
            ])
    
    sql_lines.extend([
        "",
        "END$$;",
        "",
        "COMMIT;",
    ])
    
    return '\n'.join(sql_lines)


def export_multi_section(data: dict, output_id: str) -> Path:
    """Export multi-section exam to SQL file."""
    sql = generate_multi_section_sql(data)
    
    slug = f"ielts-mentor-{re.sub(r'[^a-z0-9]+', '-', output_id.lower()).strip('-')}"
    sql_path = SEEDS_DIR / f"seed_exam_{slug}.sql"
    sql_path.write_text(sql, encoding='utf-8')
    
    logger.info(f"Saved multi-section SQL: {sql_path}")
    return sql_path


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 3:
        print("Usage: python multi_section_export.py <source> <item_id>")
        sys.exit(1)
    
    source, item_id = sys.argv[1], sys.argv[2]
    data_path = Path(__file__).parent.parent.parent / "data" / "normalized" / source / f"{item_id}.json"
    
    if not data_path.exists():
        print(f"Not found: {data_path}")
        sys.exit(1)
    
    data = json.loads(data_path.read_text(encoding='utf-8'))
    sql_path = export_multi_section(data, item_id)
    print(f"✓ Exported: {sql_path}")
