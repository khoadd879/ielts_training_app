import os
from dotenv import load_dotenv
from pathlib import Path

# Load .env file
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)


class Config:
    """Configuration settings for IELTS Crawler"""
    
    # Gemini API
    GEMINI_API_KEY: str = os.getenv('GEMINI_API_KEY', '')
    
    # URL to crawl
    URL_TO_CRAWL: str = os.getenv('URL_TO_CRAWL', '')
    
    # Backend API
    BACKEND_BASE_URL: str = os.getenv('BACKEND_BASE_URL', 'http://localhost:3000/api')
    
    # Crawler Authentication (primary)
    CRAWLER_EMAIL: str = os.getenv('CRAWLER_EMAIL', '')
    CRAWLER_PASSWORD: str = os.getenv('CRAWLER_PASSWORD', '')
    
    # Admin credentials (fallback for backwards compatibility)
    ADMIN_EMAIL: str = os.getenv('ADMIN_EMAIL', '')
    ADMIN_PASSWORD: str = os.getenv('ADMIN_PASSWORD', '')
    
    # Rate Limiting
    REQUEST_DELAY_MS: int = int(os.getenv('REQUEST_DELAY_MS', '2000'))
    
    # Database URL for direct insert
    DATABASE_URL: str = os.getenv('DATABASE_URL', '')
    
    # Default Test Title
    DEFAULT_TEST_TITLE: str = os.getenv('DEFAULT_TEST_TITLE', '')
    DEFAULT_TEST_LEVEL: str = os.getenv('DEFAULT_TEST_LEVEL', 'Mid')
    DEFAULT_TEST_TITLE: str = os.getenv('DEFAULT_TEST_TITLE', '')
    
    # Gemini Model
    GEMINI_MODEL: str = 'gemini-2.0-flash-exp'
    MAX_TOKENS: int = 8192
    
    @classmethod
    def validate(cls) -> bool:
        """Validate required configuration"""
        errors = []
        
        if not cls.GEMINI_API_KEY:
            errors.append("GEMINI_API_KEY is required")
        
        # Check for valid credentials (CRAWLER or ADMIN)
        has_crawler_creds = cls.CRAWLER_EMAIL and cls.CRAWLER_PASSWORD
        has_admin_creds = cls.ADMIN_EMAIL and cls.ADMIN_PASSWORD
        
        if not has_crawler_creds and not has_admin_creds:
            errors.append("CRAWLER_EMAIL/CRAWLER_PASSWORD or ADMIN_EMAIL/ADMIN_PASSWORD are required")
            
        if errors:
            print("Configuration Errors:")
            for e in errors:
                print(f"  - {e}")
            return False
        
        return True


config = Config()
