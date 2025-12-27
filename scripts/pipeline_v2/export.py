#!/usr/bin/env python3
"""
Stage 5: Export
Exports extracted data to SQL using OLD CRAWLER generate_sql() function.
"""
import json
import re
import importlib.util
from pathlib import Path
from typing import Optional

from config import SEEDS_DIR, OUTPUT_DIR, get_logger

logger = get_logger(__name__)

# Directory for normalized data (after repair)
NORMALIZED_DIR = Path(__file__).parent.parent.parent / "data" / "normalized"

# Import old crawler modules
def load_crawler_module(name: str, filename: str):
    """Load old crawler module dynamically."""
    try:
        spec = importlib.util.spec_from_file_location(
            name,
            Path(__file__).parent.parent / "crawler" / filename
        )
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module
    except Exception as e:
        logger.error(f"Failed to import {filename}: {e}")
        return None

crawler_ieltsmentor = load_crawler_module("crawler_ieltsmentor", "crawler-ieltsmentor.py")
crawler_ieltswriting = load_crawler_module("crawler_ieltswriting", "crawler-ieltswriting.py")
crawler_miniielts = load_crawler_module("crawler_miniielts", "crawler-miniielts.py")

if crawler_ieltsmentor:
    logger.info("Successfully imported crawler-ieltsmentor.py")
if crawler_ieltswriting:
    logger.info("Successfully imported crawler-ieltswriting.py")


def load_normalized(source: str, item_id: str) -> Optional[dict]:
    """Load NORMALIZED data from disk (after validate/repair stages)."""
    source_dir = NORMALIZED_DIR / source
    data_path = source_dir / f"{item_id}.json"
    
    if not data_path.exists():
        logger.error(f"Normalized data not found: {data_path}")
        return None
    
    return json.loads(data_path.read_text(encoding='utf-8'))



def escape_sql_text(text: str) -> str:
    """Escape text for SQL E'' strings."""
    if not text:
        return ""
    return text.replace("\\", "\\\\").replace("'", "''").replace("\n", "\\n")

def export_sql(source: str, item_id: str) -> Optional[Path]:
    """
    Export NORMALIZED data to SQL using OLD CRAWLER generate_sql().
    Uses data from normalize/repair stages, not raw extracted data.
    """
    data = load_normalized(source, item_id)
    if not data:
        return None
    
    logger.info(f"Exporting SQL: {source}/{item_id}")
    
    # Handle both old flat format and new normalized nested format
    # Normalized format: {exam: {...}, sections: [...], questions: [...]}
    # Flat format: {title, exam_id, passages, questions}
    
    if 'exam' in data:
        # Normalized format
        exam = data.get('exam', {})
        sections = data.get('sections', [])
        questions = data.get('questions', [])
        
        # Convert sections to passages format expected by old crawler
        passages = []
        for section in sections:
            passages.append({
                'text': section.get('passage_md', section.get('title', '')),
                'instruction_md': section.get('instruction_md', ''),
                'audio_url': section.get('audio_url', ''),
            })
        
        # Convert questions from normalized format (prompt_md, correct_answers)
        # to old crawler format (prompt, correct_answer)
        converted_questions = []
        for q in questions:
            # For SHORT_ANSWER, pass full array as correct_answer for ShortAnswerAcceptTexts
            correct_answers = q.get('correct_answers', [])
            if q.get('type') == 'SHORT_ANSWER' and len(correct_answers) > 1:
                correct_answer = correct_answers  # Pass full list
            else:
                correct_answer = correct_answers[0] if correct_answers else q.get('correct_answer', '')
            
            converted_q = {
                'idx': q.get('idx'),
                'type': q.get('type'),
                'prompt': q.get('prompt_md', q.get('prompt', '')),
                'correct_answer': correct_answer,
                'options': q.get('options', []),
                'explanation_md': q.get('explanation_md', ''),  # AI-generated explanation
            }
            
            # Add matchPairs for MATCHING_* question types
            q_type = q.get('type', '')
            if q_type.startswith('MATCHING_'):
                # Build matchPairs from correct_answers and prompt
                prompt_key = q.get('prompt_md', q.get('prompt', '')).strip()[:50].lower().replace(' ', '-')
                if not prompt_key:
                    prompt_key = f"q{q.get('idx')}"
                
                # Get match_pairs if already present, otherwise build from correct_answers
                match_pairs = q.get('match_pairs', {})
                if not match_pairs and correct_answers:
                    # Build matchPairs: {"prompt-key": ["answer", "answer-display"]}
                    match_pairs = {prompt_key: [correct_answers[0], correct_answers[0]]}
                
                if match_pairs:
                    converted_q['matchPairs'] = match_pairs
            
            converted_questions.append(converted_q)
        
        # Detect exam type from metadata or exam object
        exam_type = exam.get('category', 'IELTS')
        is_listening = 'listen' in exam_type.lower() or exam.get('audio_url')
        
        sql_data = {
            'title': exam.get('title', 'IELTS Reading Test'),
            'exam_id': data.get('_metadata', {}).get('item_id', item_id),
            'passages': passages,
            'questions': converted_questions,
            'exam_type': 'listening' if is_listening else 'reading',
            'audio_url': exam.get('audio_url', ''),
            'image_url': exam.get('image_url', ''),  # Thumbnail/cover image
        }
    else:
        # Flat format (legacy)
        sql_data = {
            'title': data.get('title', 'IELTS Reading Test'),
            'exam_id': data.get('exam_id', item_id),
            'passages': data.get('passages', []),
            'questions': data.get('questions', []),
        }
    
    # Use OLD CRAWLER generate_sql function directly
    if source == 'ielts-mentor':
        sql = crawler_ieltsmentor.generate_sql(sql_data)
        title = sql_data['title']
        slug = re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')
        slug = f"ielts-mentor-{slug}"
    elif source == 'ielts-writing':
        sql = crawler_ieltswriting.generate_sql(sql_data)
        title = sql_data['title']
        slug = re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')
        slug = f"ielts-writing-{slug}"
    elif source == 'mini-ielts':
        # Use ieltsmentor generate_sql (same format)
        sql = crawler_ieltsmentor.generate_sql(sql_data)
        title = sql_data['title']
        base_slug = re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')
        
        # Determine reading vs listening from exam_type
        exam_type = sql_data.get('exam_type', 'reading')
        old_slug = f"ielts-mentor-{base_slug}"
        slug = f"mini-ielts-{exam_type}-{base_slug}"
        
        # Replace slug in generated SQL
        sql = sql.replace(old_slug, slug)
        sql = sql.replace('ielts-mentor.com', 'mini-ielts.com')
        
        # For listening exams, fix Skill and add AudioUrl
        if exam_type == 'listening':
            sql = sql.replace("'READING'", "'LISTENING'")
            sql = sql.replace("'Reading Passage -", "'Listening Test -")
            
            # Add AudioUrl to section if available
            audio_url = sql_data.get('audio_url', '')
            if not audio_url and sql_data.get('passages'):
                audio_url = sql_data['passages'][0].get('audio_url', '')
            
            if audio_url:
                # Insert AudioUrl into exam_sections INSERT
                sql = sql.replace(
                    '"Id","ExamId","Idx","Title","InstructionsMd","PassageMd")',
                    '"Id","ExamId","Idx","Title","InstructionsMd","PassageMd","AudioUrl")'
                )
                # Find the section INSERT end marker and add audio_url value
                # Section INSERT is the first occurrence after "INSERT INTO exam_sections"
                # Look for the closing ");\\n" after section INSERT and add audio_url before
                section_marker = 'INSERT INTO exam_sections'
                if section_marker in sql:
                    # Find the position after section marker
                    section_start = sql.find(section_marker)
                    # Find the first ");\\n" after section marker (end of VALUES(...))
                    # This could be ");\\n\\n" or ");\\n  qid" etc.
                    search_start = section_start + len(section_marker)
                    # Find pattern ");\n" which ends the section INSERT
                    end_marker = ");\n"
                    end_pos = sql.find(end_marker, search_start)
                    if end_pos > 0:
                        # Insert audio_url value just before the );
                        # Current: ...E'passage content')\n  );
                        # Need: ...E'passage content',\n    'audio_url'\n  );
                        # Find the last ')' before the ');'
                        insert_pos = end_pos
                        sql = sql[:insert_pos] + f",\n    '{audio_url}'" + sql[insert_pos:]
    else:
        logger.error(f"Unknown source: {source}")
        return None
    
    # === ADD QUESTION_GROUPS SQL ===
    # Get question_groups from normalized sections
    question_groups = []
    for section in sections:
        grps = section.get('question_groups', [])
        question_groups.extend(grps)
    
    if question_groups:
        # Add DELETE and INSERT statements for exam_question_groups
        # Insert before END$$; / COMMIT;
        qg_sql_lines = []
        qg_sql_lines.append("")
        qg_sql_lines.append(f"  -- Delete old question groups for this exam")
        qg_sql_lines.append(f"  DELETE FROM exam_question_groups WHERE \"SectionId\" = sec1;")
        qg_sql_lines.append("")
        qg_sql_lines.append(f"  -- Insert question groups")
        
        for grp in sorted(question_groups, key=lambda g: g.get('idx', 0)):
            grp_idx = grp.get('idx', 1)
            start_idx = grp.get('start_idx', 1)
            end_idx = grp.get('end_idx', 1)
            instruction = escape_sql_text(grp.get('instruction_md', ''))
            
            qg_sql_lines.append(f"  INSERT INTO exam_question_groups (\"Id\",\"SectionId\",\"Idx\",\"StartIdx\",\"EndIdx\",\"InstructionMd\")")
            qg_sql_lines.append(f"  VALUES (gen_random_uuid(), sec1, {grp_idx}, {start_idx}, {end_idx}, E'{instruction}');")
            qg_sql_lines.append("")
        
        qg_sql = "\n".join(qg_sql_lines)
        
        # Insert before END$$;
        sql = sql.replace("END$$;", qg_sql + "\nEND$$;")
    
    # Save SQL to seeds directory
    sql_path = SEEDS_DIR / f"seed_exam_{slug}.sql"
    sql_path.write_text(sql, encoding='utf-8')
    
    # Also save final JSON to output directory
    output_dir = OUTPUT_DIR / source
    output_dir.mkdir(parents=True, exist_ok=True)
    json_path = output_dir / f"{item_id}.json"
    json_path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding='utf-8')
    
    logger.info(f"Saved SQL: {sql_path}")
    logger.info(f"Saved JSON: {json_path}")
    
    return sql_path


# CLI
if __name__ == "__main__":
    import sys
    if len(sys.argv) < 3:
        print("Usage: python export.py <source> <item_id>")
        sys.exit(1)
    
    source, item_id = sys.argv[1], sys.argv[2]
    path = export_sql(source, item_id)
    if path:
        print(f"✓ Exported: {path}")
    else:
        print("✗ Export failed")
        sys.exit(1)
