#!/usr/bin/env python3
"""
Pipeline V2 Configuration
Wraps old crawlers into modular pipeline stages.
"""
import sys
from pathlib import Path

# Paths
PROJECT_ROOT = Path(__file__).parent.parent.parent
SCRIPTS_DIR = PROJECT_ROOT / "scripts"
CRAWLER_DIR = SCRIPTS_DIR / "crawler"
PIPELINE_V2_DIR = SCRIPTS_DIR / "pipeline_v2"
DATA_DIR = PROJECT_ROOT / "data"
SEEDS_DIR = PROJECT_ROOT / "deploy" / "seeds"

# Add crawler directory to path for imports
sys.path.insert(0, str(CRAWLER_DIR))

# Stage output directories
RAW_DIR = DATA_DIR / "raw"
EXTRACTED_DIR = DATA_DIR / "extracted"
NORMALIZED_DIR = DATA_DIR / "normalized"
OUTPUT_DIR = DATA_DIR / "output"
QUARANTINE_DIR = DATA_DIR / "quarantine"
LOGS_DIR = DATA_DIR / "logs"

# Ensure directories exist
for d in [RAW_DIR, EXTRACTED_DIR, NORMALIZED_DIR, OUTPUT_DIR, QUARANTINE_DIR, LOGS_DIR]:
    d.mkdir(parents=True, exist_ok=True)

# HTTP settings
REQUEST_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
}
REQUEST_TIMEOUT = 30

# Source detection
def detect_source(url: str) -> str:
    """Detect source from URL."""
    if 'ielts-mentor.com' in url:
        return 'ielts-mentor'
    elif 'ielts-writing.info' in url:
        return 'ielts-writing'
    elif 'mini-ielts.com' in url:
        return 'mini-ielts'
    else:
        return 'unknown'

def detect_exam_type(url: str) -> str:
    """Detect exam type (reading/listening) from URL."""
    if '/listening/' in url or '/listening?' in url:
        return 'listening'
    elif '/reading/' in url or '/reading?' in url:
        return 'reading'
    else:
        return 'reading'  # default

# Logging
import logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(LOGS_DIR / "pipeline_v2.log"),
        logging.StreamHandler()
    ]
)

def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
