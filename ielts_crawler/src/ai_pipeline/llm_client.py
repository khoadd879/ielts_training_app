import json
from typing import Optional, Dict, Any
from google import genai

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import config


class LLMClient:
    """Client for Google Gemini API"""
    
    def __init__(self, api_key: str = None, model: str = None):
        """
        Initialize LLM Client
        
        Args:
            api_key: Gemini API key (defaults to config)
            model: Model name (defaults to config.GEMINI_MODEL)
        """
        self.api_key = api_key or config.GEMINI_API_KEY
        self.model_name = model or config.GEMINI_MODEL
        self.max_tokens = config.MAX_TOKENS
        
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY is required")
        
        self.client = genai.Client(api_key=self.api_key)
    
    def call(
        self,
        prompt: str,
        content: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0,  # Set to 0 for deterministic results
        json_output: bool = True
    ) -> Dict[str, Any]:
        """
        Call Gemini API with prompt and content
        """
        system = system_prompt or self._get_default_system_prompt(json_output)
        
        full_prompt = f"""{system}

{prompt}

---

CONTENT TO ANALYZE:

{content}"""
        
        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=full_prompt,
                config={
                    "temperature": temperature,
                    "max_output_tokens": self.max_tokens,
                }
            )
            
            result_text = response.text
            
            if json_output:
                return self._parse_json_response(result_text)
            
            return {"text": result_text}
            
        except Exception as e:
            print(f"LLM API Error: {e}")
            raise
    
    def _get_default_system_prompt(self, json_output: bool) -> str:
        """Get default system prompt"""
        base = """You are an expert at analyzing IELTS exam content. 
You can accurately identify and extract:
- Reading passages with their titles and content
- Question types (MCQ, TFNG, YES_NO_NOTGIVEN, FILL_BLANK, MATCHING, SHORT_ANSWER, LABELING)
- Questions with their numbers and content
- Correct answers for each question

Be precise and thorough in your extraction."""
        
        if json_output:
            base += """

IMPORTANT: Always respond with valid JSON only. No markdown, no explanations outside JSON.
Your response should be parseable by json.loads()."""
        
        return base
    
    def _parse_json_response(self, text: str) -> Dict[str, Any]:
        """Parse JSON from response text"""
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass
        
        import re
        json_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', text)
        if json_match:
            try:
                return json.loads(json_match.group(1))
            except json.JSONDecodeError:
                pass
        
        for start_char, end_char in [('{', '}'), ('[', ']')]:
            start = text.find(start_char)
            if start != -1:
                depth = 0
                for i, char in enumerate(text[start:], start):
                    if char == start_char:
                        depth += 1
                    elif char == end_char:
                        depth -= 1
                        if depth == 0:
                            try:
                                return json.loads(text[start:i+1])
                            except json.JSONDecodeError:
                                break
        
        raise ValueError(f"Could not parse JSON from response: {text[:200]}...")
    
    def analyze_ielts_content(self, content: str) -> Dict[str, Any]:
        """Analyze IELTS content and extract structured data"""
        from .prompts import FULL_EXTRACTION_PROMPT
        
        return self.call(
            prompt=FULL_EXTRACTION_PROMPT,
            content=content,
            json_output=True
        )
