#!/usr/bin/env python3
"""
Pipeline V2 Complete Orchestrator
Runs full pipeline: 
Fetch → Clean → Parse → Normalize → Validate → Invariants → Repair → Export/Quarantine

Uses OLD CRAWLER functions for Parse and Export stages.
Includes caching for incremental processing.
"""
import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional

from config import get_logger, detect_source, QUARANTINE_DIR, RAW_DIR

logger = get_logger(__name__)

# Import all stages
from fetch import fetch_and_save, extract_id
from clean import clean_and_save
from extract import extract_and_save
from normalize import normalize_and_save
from validate import validate
from invariants import check
from repair import repair
from export import export_sql

# Import cache manager
from cache_manager import is_cache_valid, update_cache, get_file_hash


class PipelineResult:
    def __init__(self, url: str):
        self.url = url
        self.source = None
        self.item_id = None
        self.success = False
        self.stage_failed = None
        self.sql_path = None
        self.errors = []
        self.warnings = []
        self.repairs = []
    
    def fail(self, stage: str, error: str):
        self.success = False
        self.stage_failed = stage
        self.errors.append(f"[{stage}] {error}")
    
    def to_dict(self) -> dict:
        return {
            'url': self.url,
            'source': self.source,
            'item_id': self.item_id,
            'success': self.success,
            'stage_failed': self.stage_failed,
            'sql_path': str(self.sql_path) if self.sql_path else None,
            'errors': self.errors,
            'warnings': self.warnings,
            'repairs': self.repairs,
            'timestamp': datetime.now().isoformat(),
        }


def quarantine(result: PipelineResult) -> Path:
    """Move failed item to quarantine."""
    quarantine_dir = QUARANTINE_DIR / (result.source or 'unknown')
    quarantine_dir.mkdir(parents=True, exist_ok=True)
    
    report_path = quarantine_dir / f"{result.item_id or 'unknown'}.json"
    report_path.write_text(json.dumps(result.to_dict(), indent=2), encoding='utf-8')
    
    logger.warning(f"Quarantined: {report_path}")
    return report_path


def run_pipeline(url: str, use_ai: bool = True, skip_validation: bool = False, use_cache: bool = True, hints: dict = None) -> PipelineResult:
    """
    Run full pipeline for a single URL.
    
    Pipeline stages:
    1. Fetch - Download raw HTML
    2. Clean - Rule-based HTML cleaning
    3. Parse - Extract using old crawler functions
    4. Normalize - AI or rule-based normalization
    5. Validate - Schema gate
    6. Invariants - IELTS rules gate
    7. Repair - Auto-fix minor issues
    8. Export - Generate SQL
    
    Args:
        use_cache: If True, skip processing if valid cache exists
    """
    if hints is None:
        hints = {}
    
    result = PipelineResult(url)
    
    # Detect source and item_id early for cache check
    result.source = detect_source(url)
    if result.source == 'unknown':
        result.fail("DETECT", f"Unknown source for URL: {url}")
        return result
    
    result.item_id = extract_id(url, result.source)
    
    # Check cache - skip if already processed and HTML unchanged
    if use_cache:
        raw_path = RAW_DIR / result.source / f"{result.item_id}.html"
        if is_cache_valid(result.source, result.item_id, raw_path):
            logger.info(f"⏭️ CACHED - Skipping: {result.item_id}")
            # Load existing result
            from export import OUTPUT_DIR
            output_path = OUTPUT_DIR / result.source / f"{result.item_id}.json"
            if output_path.exists():
                result.success = True
                result.sql_path = Path(__file__).parent.parent.parent / "deploy" / "seeds" / f"seed_exam_{result.item_id}.sql"
                return result
    
    logger.info("=" * 60)
    logger.info(f"PIPELINE V2 COMPLETE START: {url}")
    logger.info("=" * 60)
    logger.info(f"Source: {result.source}, Item ID: {result.item_id}")
    
    # === Stage 1: Fetch ===
    logger.info("Stage 1: FETCH - Downloading raw HTML...")
    fetch_result = fetch_and_save(url)
    if not fetch_result or not fetch_result.get('success'):
        result.fail("FETCH", fetch_result.get('error', 'Unknown error'))
        quarantine(result)
        return result
    
    # Get HTML hash for cache
    raw_path = RAW_DIR / result.source / f"{result.item_id}.html"
    html_hash = get_file_hash(raw_path) if raw_path.exists() else None
    update_cache(result.source, result.item_id, url, 'fetch', html_hash)
    logger.info("  ✓ Fetch complete")
    
    # === Stage 2: Clean ===
    logger.info("Stage 2: CLEAN - Rule-based cleaning...")
    clean_result = clean_and_save(result.source, result.item_id)
    if not clean_result:
        result.fail("CLEAN", "Cleaning failed")
        quarantine(result)
        return result
    logger.info(f"  ✓ Clean complete ({clean_result.get('word_count', 0)} words)")
    
    # === Stage 3: Parse (using old crawler) ===
    logger.info("Stage 3: PARSE - Extracting with old crawler...")
    extract_result = extract_and_save(result.source, result.item_id, hints=hints)
    if not extract_result:
        result.fail("PARSE", "Extraction failed")
        quarantine(result)
        return result
    logger.info(f"  ✓ Parse complete ({len(extract_result.get('questions', []))} questions)")
    
    # === Stage 4: Normalize ===
    ai_label = "with AI" if use_ai else "rule-based"
    logger.info(f"Stage 4: NORMALIZE - Converting to schema ({ai_label})...")
    normalize_result = normalize_and_save(result.source, result.item_id, use_ai)
    if not normalize_result:
        result.fail("NORMALIZE", "Normalization failed")
        quarantine(result)
        return result
    method = normalize_result.get('_metadata', {}).get('normalized_by', 'unknown')
    logger.info(f"  ✓ Normalize complete ({method})")
    
    if not skip_validation:
        # === Stage 5: Validate (Schema Gate) ===
        logger.info("Stage 5: VALIDATE - Schema gate...")
        validation = validate(result.source, result.item_id)
        if not validation.is_valid():
            result.errors.extend(validation.errors)
            result.fail("VALIDATE", "Schema validation failed")
            quarantine(result)
            return result
        result.warnings.extend(validation.warnings)
        logger.info(f"  ✓ Schema valid ({len(validation.warnings)} warnings)")
        
        # === Stage 6: Invariants (IELTS Rules Gate) ===
        logger.info("Stage 6: INVARIANTS - IELTS rules gate...")
        invariants_result = check(result.source, result.item_id)
        if not invariants_result.is_valid():
            # Try repair before failing
            logger.info("  ⚠ Invariants failed, attempting repair...")
            
            # === Stage 7: Repair ===
            logger.info("Stage 7: REPAIR - Auto-fixing issues...")
            repaired_data, repair_result = repair(result.source, result.item_id)
            result.repairs.extend(repair_result.repairs_made)
            
            if repair_result.repairs_made:
                # Re-check invariants after repair
                invariants_result = check(result.source, result.item_id)
                if invariants_result.is_valid():
                    logger.info(f"  ✓ Repair fixed issues ({len(repair_result.repairs_made)} repairs)")
                else:
                    result.errors.extend(invariants_result.violations)
                    result.fail("INVARIANTS", "IELTS rules violated (after repair)")
                    quarantine(result)
                    return result
            else:
                result.errors.extend(invariants_result.violations)
                result.fail("INVARIANTS", "IELTS rules violated")
                quarantine(result)
                return result
        else:
            # Invariants passed, but still run repair if there are warnings
            if invariants_result.warnings:
                logger.info(f"  ⚠ Invariants valid but has warnings, running repair...")
                repaired_data, repair_result = repair(result.source, result.item_id)
                result.repairs.extend(repair_result.repairs_made)
                if repair_result.repairs_made:
                    logger.info(f"  ✓ Repair fixed {len(repair_result.repairs_made)} issues")
            else:
                logger.info(f"  ✓ Invariants valid (no warnings)")
            result.warnings.extend(invariants_result.warnings)
        
        # === Stage 6.5: Gemini QA (Optional Strict Gate) ===
        try:
            from gemini_qa import run_gemini_qa
            logger.info("Stage 6.5: GEMINI_QA - AI strict validation...")
            inv_dict = {
                'is_valid': invariants_result.is_valid(),
                'violations': invariants_result.violations,
                'warnings': invariants_result.warnings
            }
            gemini_result = run_gemini_qa(result.source, result.item_id, inv_dict)
            
            # Ensure gemini_result is a dict
            if not isinstance(gemini_result, dict):
                logger.warning(f"  ⚠ Gemini QA returned invalid type: {type(gemini_result)}")
            elif gemini_result.get('_fallback'):
                logger.info("  ⚠ Gemini QA unavailable, using rule-based only")
            elif gemini_result.get('decision') == 'FAIL':
                issues = gemini_result.get('issues', [])
                high_issues = [i for i in issues if isinstance(i, dict) and i.get('severity') == 'HIGH']
                if high_issues and gemini_result.get('recommended_next_step') == 'QUARANTINE':
                    result.errors.extend([f"[GEMINI] {i.get('message', 'Unknown')}" for i in high_issues])
                    result.fail("GEMINI_QA", "Gemini QA failed with HIGH severity issues")
                    quarantine(result)
                    return result
                else:
                    # REPAIR route - add as warnings
                    for i in issues:
                        if isinstance(i, dict):
                            result.warnings.append(f"[GEMINI-{i.get('severity', 'MED')}] {i.get('message', 'Unknown')}")
                    logger.info(f"  ⚠ Gemini QA: {len(issues)} issues (non-blocking)")
            else:
                conf = gemini_result.get('confidence', 0.0)
                logger.info(f"  ✓ Gemini QA: PASS (confidence: {conf:.0%})")
        except ImportError:
            logger.debug("Gemini QA module not available, skipping")
        except Exception as e:
            logger.warning(f"  ⚠ Gemini QA skipped: {e}")
    else:
        logger.info("Stage 5-7: SKIPPED (skip_validation=True)")
    
    # === Stage 8: Export ===
    logger.info("Stage 8: EXPORT - Generating SQL...")
    sql_path = export_sql(result.source, result.item_id)
    if not sql_path:
        result.fail("EXPORT", "SQL export failed")
        quarantine(result)
        return result
    
    result.success = True
    result.sql_path = sql_path
    
    # === Stage 8.5: Generate Explanations (Optional, Non-blocking) ===
    try:
        from generate_explanations import process_exam
        logger.info("Stage 8.5: EXPLANATIONS - Generating AI explanations...")
        # Use gemini by default, fall back to codex
        explanation_success = process_exam(result.source, result.item_id, resume=True, provider='gemini')
        if explanation_success:
            logger.info("  ✓ Explanations generated")
        else:
            logger.warning("  ⚠ Explanation generation failed (non-blocking)")
    except ImportError:
        logger.debug("Explanation generator module not available, skipping")
    except Exception as e:
        logger.warning(f"  ⚠ Explanation generation skipped: {e}")
    
    # Update cache with all completed stages
    update_cache(result.source, result.item_id, url, 'clean')
    update_cache(result.source, result.item_id, url, 'extract')
    update_cache(result.source, result.item_id, url, 'normalize')
    update_cache(result.source, result.item_id, url, 'validate')
    update_cache(result.source, result.item_id, url, 'gemini_qa')
    update_cache(result.source, result.item_id, url, 'repair')
    update_cache(result.source, result.item_id, url, 'explanations')
    update_cache(result.source, result.item_id, url, 'export')
    
    logger.info("=" * 60)
    logger.info(f"PIPELINE V2 SUCCESS: {url}")
    logger.info(f"Output: {sql_path}")
    logger.info("=" * 60)
    
    return result


# CLI
if __name__ == "__main__":
    # Show help if requested
    if len(sys.argv) >= 2 and sys.argv[1] in ['--help', '-h', 'help']:
        print("""
╔══════════════════════════════════════════════════════════════════════════════╗
║                    IELTS PIPELINE ORCHESTRATOR                                ║
╠══════════════════════════════════════════════════════════════════════════════╣
║ Usage:                                                                        ║
║   python orchestrator.py <URL> [options]                                      ║
║                                                                               ║
║ Options:                                                                      ║
║   --full              Run FULL pipeline (fetch→export→seed)                   ║
║   --type listening    Process as listening exam                               ║
║   --no-ai             Skip AI-based normalization                             ║
║   --skip-validation   Skip validation steps                                   ║
║   --hints="..."       Specify question types (see below)                      ║
║                                                                               ║
╠══════════════════════════════════════════════════════════════════════════════╣
║ HINTS FORMAT: --hints="Q1-5:TYPE,Q6-10:TYPE,Q11-13:TYPE"                      ║
╠══════════════════════════════════════════════════════════════════════════════╣
║ Available Types:                                                              ║
║   MCQ_SINGLE           Choose ONE letter (A/B/C/D)                            ║
║   MCQ_MULTIPLE         Choose TWO/THREE letters                               ║
║   SUMMARY_COMPLETION   Fill in gaps / Write words                             ║
║   TABLE_COMPLETION     Complete a table                                       ║
║   SHORT_ANSWER         Write short answer                                     ║
║   MATCHING_HEADING     Match paragraphs with headings (i-x)                   ║
║   MATCHING_FEATURES    Match features with names                              ║
║   MATCHING_INFORMATION Match info / Label map or diagram                      ║
║   TRUE_FALSE_NOT_GIVEN TRUE/FALSE/NOT GIVEN questions                         ║
║   YES_NO_NOT_GIVEN     YES/NO/NOT GIVEN questions                             ║
╠══════════════════════════════════════════════════════════════════════════════╣
║ Examples:                                                                     ║
║   python orchestrator.py "https://mini-ielts.com/123/reading/xxx"             ║
║       --hints="Q1-6:MATCHING_HEADING,Q7-13:SUMMARY_COMPLETION"                ║
║                                                                               ║
║   python orchestrator.py "https://mini-ielts.com/456/listening/yyy"           ║
║       --type listening --hints="Q1-2:MCQ_MULTIPLE,Q3-7:SUMMARY_COMPLETION"    ║
╚══════════════════════════════════════════════════════════════════════════════╝
        """)
        sys.exit(0)

    if len(sys.argv) < 2:
        print("Usage: python orchestrator.py <URL> [--no-ai] [--skip-validation] [--hints='Q1-2:TYPE,Q3-7:TYPE']")
        print("       Run 'python orchestrator.py --help' to see available types")
        print("       python orchestrator.py --batch <file.txt> [--no-ai] [--skip-validation]")
        sys.exit(1)
    
    use_ai = '--no-ai' not in sys.argv
    skip_validation = '--skip-validation' in sys.argv
    
    # Parse --hints param: "Q1-2:MCQ_MULTIPLE,Q3-7:SUMMARY_COMPLETION"
    hints = {}
    for arg in sys.argv:
        if arg.startswith('--hints='):
            hints_str = arg.split('=', 1)[1]
            for hint in hints_str.split(','):
                if ':' in hint:
                    q_range, q_type = hint.split(':', 1)
                    hints[q_range.strip()] = q_type.strip()
    
    if sys.argv[1] == '--batch':
        # Batch mode
        if len(sys.argv) < 3:
            print("Batch mode requires a file with URLs")
            sys.exit(1)
        
        urls_file = Path(sys.argv[2])
        urls = [line.strip() for line in urls_file.read_text().splitlines() if line.strip()]
        
        success = 0
        for url in urls:
            result = run_pipeline(url, use_ai, skip_validation, hints)
            if result.success:
                success += 1
                print(f"✓ {url}")
            else:
                print(f"✗ {url}: {result.stage_failed}")
        
        print(f"\nCompleted: {success}/{len(urls)} succeeded")
    else:
        # Single URL mode
        url = sys.argv[1]
        result = run_pipeline(url, use_ai, skip_validation, hints)
        
        if result.success:
            print(f"\n✓ Pipeline completed successfully!")
            print(f"  SQL: {result.sql_path}")
            if result.repairs:
                print(f"  Repairs: {len(result.repairs)}")
            if result.warnings:
                print(f"  Warnings: {len(result.warnings)}")
        else:
            print(f"\n✗ Pipeline failed at stage: {result.stage_failed}")
            for error in result.errors:
                print(f"  • {error}")
            sys.exit(1)


# ============ FULL PIPELINE MODE ============
def run_full_pipeline(url: str, exam_type: str = 'reading', hints: dict = None):
    """
    Run FULL pipeline: orchestrator → cloudinary → export → seed
    No manual intervention needed!
    """
    import subprocess
    
    result = run_pipeline(url, use_ai=True, skip_validation=False, hints=hints)
    
    if not result.success:
        print(f"\\n✗ Pipeline failed at: {result.stage_failed}")
        return False
    
    source = result.source
    item_id = result.item_id
    
    print(f"\\n🔄 Running full pipeline for: {item_id}")
    
    # Step: Cloudinary upload
    print("📸 Uploading images to Cloudinary...")
    try:
        subprocess.run(['python', 'upload_images.py', source, item_id], check=True, capture_output=True)
        print("  ✓ Images uploaded")
    except Exception as e:
        print(f"  ⚠ Image upload failed (non-blocking): {e}")
    
    # Step: Export
    print("📤 Exporting SQL...")
    try:
        subprocess.run(['python', 'export.py', source, item_id, '--type', exam_type], check=True, capture_output=True)
        print("  ✓ SQL exported")
    except Exception as e:
        print(f"  ✗ Export failed: {e}")
        return False
    
    # Find SQL file
    from pathlib import Path
    seeds_dir = Path(__file__).parent.parent.parent / "deploy" / "seeds"
    slug = item_id.replace('/', '-').lstrip('-').rstrip('-')
    sql_pattern = f"seed_exam_{source}-{exam_type}-{slug.split('-', 1)[1] if '-' in slug else slug}.sql"
    
    # Find matching SQL
    sql_files = list(seeds_dir.glob(f"*{slug.split('-', 1)[1] if '-' in slug else slug}*.sql"))
    if not sql_files:
        sql_files = list(seeds_dir.glob(f"*{exam_type}*{slug.split('-')[-1]}*.sql"))
    
    if sql_files:
        sql_path = sql_files[0]
        print(f"💾 Seeding database: {sql_path.name}")
        try:
            import os
            os.environ['PGPASSWORD'] = 'exam'
            subprocess.run([
                'psql', '-h', 'localhost', '-p', '5433', '-U', 'exam', '-d', 'exam-db',
                '-f', str(sql_path)
            ], check=True, capture_output=True)
            print("  ✓ Database seeded")
        except Exception as e:
            print(f"  ✗ Seed failed: {e}")
            return False
    else:
        print(f"  ⚠ No SQL file found for seeding")
    
    print(f"\\n✅ FULL PIPELINE COMPLETE: {item_id}")
    return True


# CLI extension for --full
if '--full' in sys.argv:
    url = [arg for arg in sys.argv[1:] if not arg.startswith('--')][0]
    exam_type = 'listening' if '--type' in sys.argv and 'listening' in ' '.join(sys.argv) else 'reading'
    
    # Parse hints
    hints = {}
    for arg in sys.argv:
        if arg.startswith('--hints='):
            hints_str = arg.split('=', 1)[1]
            for hint in hints_str.split(','):
                if ':' in hint:
                    q_range, q_type = hint.split(':', 1)
                    hints[q_range.strip()] = q_type.strip()
    
    success = run_full_pipeline(url, exam_type, hints)
    sys.exit(0 if success else 1)
