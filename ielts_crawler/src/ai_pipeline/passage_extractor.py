from typing import List, Dict, Any
from .llm_client import LLMClient
from .prompts import PASSAGE_EXTRACTION_PROMPT

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models import ExtractedPassage


class PassageExtractor:
    """Extract reading passages from IELTS content using AI"""
    
    def __init__(self, llm_client: LLMClient = None):
        """
        Initialize PassageExtractor
        
        Args:
            llm_client: LLM client instance
        """
        self.llm = llm_client or LLMClient()
    
    def extract(self, content: str) -> List[ExtractedPassage]:
        """
        Extract passages from content
        
        Args:
            content: Raw text content
            
        Returns:
            List of ExtractedPassage objects
        """
        try:
            result = self.llm.call(
                prompt=PASSAGE_EXTRACTION_PROMPT,
                content=content,
                json_output=True
            )
            
            passages = []
            for p in result.get('passages', []):
                passage = ExtractedPassage(
                    title=p.get('title', 'Untitled Passage'),
                    content=p.get('content', ''),
                    paragraph_count=p.get('paragraph_count', 0)
                )
                passages.append(passage)
            
            return passages
            
        except Exception as e:
            print(f"Error extracting passages: {e}")
            return []
    
    def extract_from_html_sections(
        self,
        sections: List[str]
    ) -> List[ExtractedPassage]:
        """
        Extract passages from pre-identified HTML sections
        
        Args:
            sections: List of text sections that might be passages
            
        Returns:
            List of ExtractedPassage objects
        """
        passages = []
        
        for i, section in enumerate(sections):
            # Filter out very short sections
            if len(section) < 200:
                continue
            
            # Try to extract title from first line
            lines = section.split('\n')
            title = lines[0] if lines else f"Passage {i + 1}"
            
            if len(title) > 100:  # Title too long, probably not a title
                title = f"Passage {i + 1}"
            
            # Count paragraphs
            paragraphs = [p for p in section.split('\n\n') if p.strip()]
            
            passage = ExtractedPassage(
                title=title,
                content=section,
                paragraph_count=len(paragraphs)
            )
            passages.append(passage)
        
        return passages
