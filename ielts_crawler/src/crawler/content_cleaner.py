import re
from typing import Optional, List
from bs4 import BeautifulSoup, NavigableString, Comment


class ContentCleaner:
    """Clean and extract main content from HTML"""
    
    # Tags to completely remove
    REMOVE_TAGS = [
        'script', 'style', 'noscript', 'iframe', 'svg', 'canvas',
        'nav', 'footer', 'header', 'aside', 'form', 'button',
        'input', 'select', 'textarea', 'meta', 'link'
    ]
    
    # Common ad/tracking class patterns
    AD_PATTERNS = [
        r'ad[-_]?', r'advertisement', r'banner', r'popup', r'modal',
        r'cookie', r'consent', r'overlay', r'sidebar', r'widget',
        r'social[-_]?share', r'newsletter', r'subscribe', r'comment'
    ]
    
    def __init__(self, parser: str = 'lxml'):
        """
        Initialize ContentCleaner
        
        Args:
            parser: BeautifulSoup parser ('lxml', 'html.parser', 'html5lib')
        """
        self.parser = parser
        self.ad_pattern = re.compile('|'.join(self.AD_PATTERNS), re.I)
    
    def clean_html(self, html: str) -> BeautifulSoup:
        """
        Clean HTML by removing unwanted elements
        
        Args:
            html: Raw HTML string
            
        Returns:
            Cleaned BeautifulSoup object
        """
        soup = BeautifulSoup(html, self.parser)
        
        # Remove comments
        for comment in soup.find_all(string=lambda text: isinstance(text, Comment)):
            comment.extract()
        
        # Remove unwanted tags
        for tag in self.REMOVE_TAGS:
            for element in soup.find_all(tag):
                element.decompose()
        
        # Remove elements with ad-like class names
        for element in soup.find_all(class_=self.ad_pattern):
            element.decompose()
        
        # Remove elements with ad-like IDs
        for element in soup.find_all(id=self.ad_pattern):
            element.decompose()
        
        return soup
    
    def extract_main_content(self, html: str) -> str:
        """
        Extract main content area from HTML
        
        Args:
            html: Raw HTML string
            
        Returns:
            Cleaned text content
        """
        soup = self.clean_html(html)
        
        # Try to find main content area
        main_content = None
        
        # Common main content selectors
        content_selectors = [
            'main',
            'article',
            '[role="main"]',
            '.content',
            '.main-content',
            '#content',
            '#main-content',
            '.post-content',
            '.entry-content',
            '.article-content',
            '.reading-passage',
            '.passage',
            '.test-content',
        ]
        
        for selector in content_selectors:
            main_content = soup.select_one(selector)
            if main_content:
                break
        
        # Fallback to body
        if not main_content:
            main_content = soup.find('body') or soup
        
        return self._extract_text(main_content)
    
    def extract_structured_content(self, html: str) -> dict:
        """
        Extract structured content with headings and paragraphs
        
        Args:
            html: Raw HTML string
            
        Returns:
            Dict with 'title', 'passages', 'questions' sections
        """
        # Use a copy for answer extraction before cleaning
        raw_soup = BeautifulSoup(html, self.parser)
        
        # Extract answer key BEFORE cleaning (it may be in special elements)
        answer_key = self._extract_answer_key(raw_soup)
        
        soup = self.clean_html(html)
        
        result = {
            'title': '',
            'raw_text': '',
            'passages': [],
            'question_sections': [],
            'answer_key': answer_key,
            'question_ranges': [],  # List of (start, end) tuples from "Questions 14-21"
        }
        
        # Get title
        title_tag = soup.find(['h1', 'title'])
        if title_tag:
            result['title'] = title_tag.get_text(strip=True)
        
        # Get full cleaned text
        body = soup.find('body') or soup
        result['raw_text'] = self._extract_text(body)
        
        # Append answer key to raw_text if found
        if answer_key:
            result['raw_text'] += f"\n\nANSWER KEY:\n{answer_key}"
        
        # Extract question ranges from text (e.g., "Questions 14-21", "Questions 22–25")
        range_pattern = re.compile(r'[Qq]uestions?\s+(\d+)\s*[-–]\s*(\d+)')
        for match in range_pattern.finditer(result['raw_text']):
            start = int(match.group(1))
            end = int(match.group(2))
            result['question_ranges'].append((start, end))
        
        # Try to find passage content
        passage_selectors = [
            '.passage', '.reading-passage', '.reading-text',
            '.passage-content', '.article-text', '.exam-passage'
        ]
        
        for selector in passage_selectors:
            passages = soup.select(selector)
            for p in passages:
                result['passages'].append(self._extract_text(p))
        
        # Try to find question sections
        question_selectors = [
            '.questions', '.question-section', '.question-group',
            '.exam-questions', '.test-questions'
        ]
        
        for selector in question_selectors:
            questions = soup.select(selector)
            for q in questions:
                result['question_sections'].append(self._extract_text(q))
        
        return result
    
    def _extract_answer_key(self, soup: BeautifulSoup) -> str:
        """Extract answer key section from HTML before cleaning"""
        answer_texts = []
        
        # Look for common answer key patterns - prioritize specific selectors
        answer_selectors = [
            '#answers',        # IELTS-up main answer div
            '#ans',            # Alternative ID
            'div.hint',        # IELTS-up class
            '.answers',
            '.answer-key',
            '.answer-section',
        ]
        
        for selector in answer_selectors:
            elements = soup.select(selector)
            for el in elements:
                # Check if it contains an ordered list (common pattern)
                ol = el.find('ol')
                if ol:
                    # Extract answers from li elements with their numbers
                    answers_list = []
                    for i, li in enumerate(ol.find_all('li'), 1):
                        answer_text = li.get_text(strip=True)
                        if answer_text:
                            answers_list.append(f"{i}. {answer_text}")
                    if answers_list:
                        answer_texts.append('\n'.join(answers_list))
                        break  # Found structured answers, stop looking
                else:
                    # Fallback: get all text
                    text = el.get_text(strip=True)
                    if text and len(text) > 10:
                        answer_texts.append(text)
            
            if answer_texts:
                break  # Found answers, stop searching
        
        # If no structured answers found, look for text patterns
        if not answer_texts:
            all_text = soup.get_text()
            answer_pattern = re.compile(
                r'(?:Answers?:?\s*)?(?:\d+\.\s*(?:True|False|Not Given|Yes|No|[A-Z])\s*[,\n]?\s*)+',
                re.IGNORECASE
            )
            
            for match in answer_pattern.finditer(all_text):
                matched_text = match.group().strip()
                if len(matched_text) > 10:
                    answer_texts.append(matched_text)
        
        return '\n'.join(set(answer_texts))
    
    def _extract_text(self, element) -> str:
        """
        Extract clean text from BeautifulSoup element
        
        Args:
            element: BeautifulSoup element
            
        Returns:
            Cleaned text string
        """
        if element is None:
            return ''
        
        # Get text with proper spacing
        text = element.get_text(separator='\n', strip=True)
        
        # Clean up whitespace
        lines = []
        for line in text.split('\n'):
            line = line.strip()
            if line:
                lines.append(line)
        
        return '\n'.join(lines)
    
    def extract_reading_test_content(self, html: str) -> dict:
        """
        Specialized extraction for IELTS Reading tests
        
        Args:
            html: Raw HTML string
            
        Returns:
            Dict with passage and question information
        """
        soup = self.clean_html(html)
        
        result = {
            'page_title': '',
            'content': '',
            'detected_passages': [],
            'detected_questions': [],
        }
        
        # Get page title
        title = soup.find('h1') or soup.find('title')
        if title:
            result['page_title'] = title.get_text(strip=True)
        
        # Get main content
        body = soup.find('body') or soup
        result['content'] = self._extract_text(body)
        
        # Look for numbered paragraphs (common in IELTS passages)
        paragraphs = soup.find_all(['p', 'div'], class_=re.compile(r'para|passage|text', re.I))
        for p in paragraphs:
            text = p.get_text(strip=True)
            if len(text) > 50:  # Filter out short non-content items
                result['detected_passages'].append(text)
        
        # Look for question patterns
        # Common patterns: "Questions 1-5", "1.", "Question 1"
        question_pattern = re.compile(
            r'(Questions?\s+\d+[-–]\d+|^\d+\.\s+|\d+\s+[A-D]\.)',
            re.MULTILINE
        )
        
        for match in question_pattern.finditer(result['content']):
            start = max(0, match.start() - 20)
            end = min(len(result['content']), match.end() + 200)
            context = result['content'][start:end]
            result['detected_questions'].append(context.strip())
        
        return result
