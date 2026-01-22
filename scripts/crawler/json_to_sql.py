#!/usr/bin/env python3
"""
JSON to SQL Converter
=====================
Converts validated exam JSON files to PostgreSQL SQL seed files.

Usage:
    python json_to_sql.py [JSON_FILE] [--output SQL_FILE]
    python json_to_sql.py --input-dir output/ --output-dir deploy/seeds/
"""

import json
import re
import uuid
import os
import sys
from pathlib import Path
from datetime import datetime
from typing import Optional
import logging

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

# Paths
SCRIPT_DIR = Path(__file__).parent
OUTPUT_DIR = SCRIPT_DIR / "output"
SEEDS_DIR = Path("/home/khoa/RiderProjects/Project_Langfens_Microservice/deploy/seeds")


def escape_sql(text: str) -> str:
    """Escape text for PostgreSQL E-string literals."""
    if not text:
        return ""
    # Escape single quotes -> ''
    text = text.replace("'", "''")
    # Escape backslashes -> \\
    text = text.replace("\\", "\\\\")
    return text


def generate_sql(data: dict) -> str:
    """Generate SQL insert statements from exam JSON data."""
    
    sql_lines = [
        "-- ============================================",
        "-- IELTS Exam Data Import SQL",
        f"-- Generated: {datetime.now().isoformat()}",
        "-- Source: json_to_sql.py (validated JSON)",
        "-- ============================================",
        "",
        "BEGIN;",
        "CREATE EXTENSION IF NOT EXISTS pgcrypto;",
        "",
    ]
    
    for exam in data.get('exams', []):
        sql_lines.extend(_generate_exam_sql(exam))
    
    sql_lines.extend(["", "COMMIT;", ""])
    
    return "\n".join(sql_lines)


def _generate_exam_sql(exam: dict) -> list[str]:
    """Generate SQL for a single exam."""
    lines = []
    
    slug = exam.get('slug', '')
    title = escape_sql(exam.get('title', ''))
    description = escape_sql(exam.get('descriptionMd', '') or f"IELTS Reading Practice: {title}")
    category = exam.get('category', 'IELTS')
    level = exam.get('level', 'B2')
    status = exam.get('status', 'PUBLISHED')
    duration = exam.get('durationMin', 20)
    
    # Cleanup old data
    lines.extend([
        f"-- Cleanup existing data for slug: {slug}",
        f"DELETE FROM exam_options WHERE \"QuestionId\" IN (",
        f"  SELECT q.\"Id\" FROM exam_questions q",
        f"  JOIN exam_sections s ON s.\"Id\" = q.\"SectionId\"",
        f"  JOIN exams e ON e.\"Id\" = s.\"ExamId\"",
        f"  WHERE e.\"Slug\" = '{slug}'",
        ");",
        "DELETE FROM exam_questions USING exam_sections s, exams e",
        "WHERE exam_questions.\"SectionId\" = s.\"Id\"",
        f"  AND s.\"ExamId\" = e.\"Id\"",
        f"  AND e.\"Slug\" = '{slug}';",
        "DELETE FROM exam_sections USING exams e",
        "WHERE exam_sections.\"ExamId\" = e.\"Id\"",
        f"  AND e.\"Slug\" = '{slug}';",
        "DELETE FROM exams",
        f"WHERE \"Slug\" = '{slug}';",
        "",
    ])
    
    # Begin DO block
    lines.extend([
        "DO $$",
        "DECLARE",
        "  exam_id uuid := gen_random_uuid();",
    ])
    
    # Declare section variables
    sections = exam.get('sections', [])
    for i, _ in enumerate(sections, 1):
        lines.append(f"  sec{i} uuid := gen_random_uuid();")
    
    lines.extend([
        "  qid uuid;",
        "BEGIN",
        "",
    ])
    
    # Insert exam
    lines.extend([
        f"  INSERT INTO exams (\"Id\",\"Slug\",\"Title\",\"DescriptionMd\",\"Category\",\"Level\",\"Status\",\"DurationMin\",\"UpdatedAt\")",
        "  VALUES (",
        f"    exam_id,",
        f"    '{slug}',",
        f"    E'{title}',",
        f"    E'{description}',",
        f"    '{category}',",
        f"    '{level}',",
        f"    '{status}',",
        f"    {duration},",
        "    now()",
        "  );",
        "",
    ])
    
    # Insert sections
    for i, section in enumerate(sections, 1):
        lines.extend(_generate_section_sql(section, i))
    
    lines.extend([
        "",
        "END$$;",
        "",
    ])
    
    return lines


def _generate_section_sql(section: dict, idx: int) -> list[str]:
    """Generate SQL for a section."""
    lines = []
    
    title = escape_sql(section.get('title', f'Section {idx}'))
    instructions = escape_sql(section.get('instructionsMd', ''))
    passage = escape_sql(section.get('passageMd', ''))
    
    # PassageMd = actual reading passage content
    # InstructionsMd = question instructions
    passage_content = passage if passage else ''
    
    lines.extend([
        f"  INSERT INTO exam_sections (\"Id\",\"ExamId\",\"Idx\",\"Title\",\"InstructionsMd\",\"PassageMd\")",
        "  VALUES (",
        f"    sec{idx},",
        "    exam_id,",
        f"    {idx},",
        f"    E'{title}',",
        f"    E'{instructions}',",
        f"    E'{passage_content}'",
        "  );",
        "",
    ])
    
    # Insert questions
    for question in section.get('questions', []):
        lines.extend(_generate_question_sql(question, idx))
    
    return lines


def _generate_question_sql(question: dict, section_idx: int) -> list[str]:
    """Generate SQL for a question."""
    lines = []
    
    q_idx = question.get('idx', 1)
    q_type = question.get('type', 'MULTIPLE_CHOICE_SINGLE')
    skill = question.get('skill', 'READING')
    difficulty = question.get('difficulty', 2)
    prompt = escape_sql(question.get('promptMd', ''))
    explanation = escape_sql(question.get('explanationMd', '') or 'Choose the correct answer.')
    
    # Handle different answer fields
    match_pairs = question.get('matchPairs', {})
    blank_accept = question.get('blankAcceptTexts', {})
    options = question.get('options', [])
    
    # Determine which answer field to use
    if q_type.startswith('MATCHING_') and match_pairs:
        answer_field = '"MatchPairs"'
        answer_value = f"'{json.dumps(match_pairs)}'::jsonb"
    elif q_type in ['SUMMARY_COMPLETION', 'NOTE_COMPLETION', 'TABLE_COMPLETION', 'SENTENCE_COMPLETION', 'FORM_COMPLETION'] and blank_accept:
        answer_field = '"BlankAcceptTexts"'
        answer_value = f"'{json.dumps(blank_accept)}'::jsonb"
    else:
        answer_field = None
        answer_value = None
    
    lines.extend([
        "  qid := gen_random_uuid();",
    ])
    
    if answer_field:
        lines.extend([
            f"  INSERT INTO exam_questions (\"Id\",\"SectionId\",\"Idx\",\"Type\",\"Skill\",\"Difficulty\",\"PromptMd\",\"ExplanationMd\",{answer_field})",
            "  VALUES (",
            f"    qid,",
            f"    sec{section_idx},",
            f"    {q_idx},",
            f"    '{q_type}',",
            f"    '{skill}',",
            f"    {difficulty},",
            f"    E'{prompt}',",
            f"    E'{explanation}',",
            f"    {answer_value}",
            "  );",
        ])
    else:
        lines.extend([
            f"  INSERT INTO exam_questions (\"Id\",\"SectionId\",\"Idx\",\"Type\",\"Skill\",\"Difficulty\",\"PromptMd\",\"ExplanationMd\",\"MatchPairs\")",
            "  VALUES (",
            f"    qid,",
            f"    sec{section_idx},",
            f"    {q_idx},",
            f"    '{q_type}',",
            f"    '{skill}',",
            f"    {difficulty},",
            f"    E'{prompt}',",
            f"    E'{explanation}',",
            "    NULL",
            "  );",
        ])
    
    # Insert options if present
    for opt in options:
        opt_content = escape_sql(opt.get('contentMd', ''))
        opt_correct = 'true' if opt.get('isCorrect') else 'false'
        opt_idx = opt.get('idx', 1)
        lines.append(
            f"  INSERT INTO exam_options (\"Id\",\"QuestionId\",\"Idx\",\"ContentMd\",\"IsCorrect\") "
            f"VALUES (gen_random_uuid(), qid, {opt_idx}, E'{opt_content}', {opt_correct});"
        )
    
    lines.append("")
    
    return lines


def convert_file(json_path: str, sql_path: str = None) -> bool:
    """Convert a JSON file to SQL."""
    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        logger.error(f"Failed to load JSON: {e}")
        return False
    
    sql = generate_sql(data)
    
    if sql_path is None:
        # Auto-generate output path
        json_name = Path(json_path).stem
        sql_path = SEEDS_DIR / f"seed_exam_{json_name}.sql"
    
    with open(sql_path, 'w', encoding='utf-8') as f:
        f.write(sql)
    
    logger.info(f"SQL saved to: {sql_path}")
    return True


def convert_all(input_dir: str = None, output_dir: str = None):
    """Convert all JSON files in input directory to SQL."""
    if input_dir is None:
        input_dir = OUTPUT_DIR
    if output_dir is None:
        output_dir = SEEDS_DIR
    
    input_path = Path(input_dir)
    output_path = Path(output_dir)
    
    count = 0
    for json_file in sorted(input_path.glob("*.json")):
        sql_name = f"seed_exam_{json_file.stem}.sql"
        sql_path = output_path / sql_name
        
        if convert_file(str(json_file), str(sql_path)):
            count += 1
    
    logger.info(f"Converted {count} files")


def main():
    """Main entry point."""
    if len(sys.argv) < 2:
        print(__doc__)
        return
    
    if sys.argv[1] == '--input-dir':
        input_dir = sys.argv[2] if len(sys.argv) > 2 else None
        output_dir = None
        if '--output-dir' in sys.argv:
            idx = sys.argv.index('--output-dir')
            output_dir = sys.argv[idx + 1] if len(sys.argv) > idx + 1 else None
        convert_all(input_dir, output_dir)
    else:
        json_path = sys.argv[1]
        sql_path = None
        if '--output' in sys.argv:
            idx = sys.argv.index('--output')
            sql_path = sys.argv[idx + 1] if len(sys.argv) > idx + 1 else None
        convert_file(json_path, sql_path)


if __name__ == "__main__":
    main()
