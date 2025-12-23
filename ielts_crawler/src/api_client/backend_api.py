"""
Backend API Client for interacting with IELTS Training App API
"""
import requests
from typing import Optional, Dict, Any, List
import time

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import config
from models import (
    TestData,
    PartData,
    PassageData,
    GroupOfQuestionsData,
    QuestionData,
    TestType,
    QuestionType,
    Level
)


class BackendAPI:
    """Client for IELTS Training App Backend API"""
    
    def __init__(
        self,
        base_url: str = None,
        email: str = None,
        password: str = None
    ):
        """
        Initialize Backend API client
        
        Args:
            base_url: API base URL
            email: Admin email for authentication
            password: Admin password
        """
        self.base_url = (base_url or config.BACKEND_BASE_URL).rstrip('/')
        self.email = email or config.ADMIN_EMAIL
        self.password = password or config.ADMIN_PASSWORD
        
        self.session = requests.Session()
        self.access_token: Optional[str] = None
        self.user_id: Optional[str] = None
    
    def login(self) -> bool:
        """
        Login and get access token
        
        Returns:
            True if login successful
        """
        try:
            response = self.session.post(
                f"{self.base_url}/auth/login",
                json={
                    "email": self.email,
                    "password": self.password
                }
            )
            response.raise_for_status()
            
            data = response.json()
            
            # Extract token and user info
            if 'access_token' in data:
                self.access_token = data['access_token']
            elif 'data' in data and 'access_token' in data['data']:
                self.access_token = data['data']['access_token']
            
            if 'user' in data:
                self.user_id = data['user'].get('idUser')
            elif 'data' in data and 'user' in data['data']:
                self.user_id = data['data']['user'].get('idUser')
            
            if self.access_token:
                self.session.headers.update({
                    'Authorization': f'Bearer {self.access_token}'
                })
                print(f"✓ Logged in successfully as {self.email}")
                return True
            
            print("✗ Login failed: No access token in response")
            return False
            
        except Exception as e:
            print(f"✗ Login failed: {e}")
            return False
    
    def _ensure_auth(self):
        """Ensure authenticated before API calls"""
        if not self.access_token:
            if not self.login():
                raise Exception("Authentication required")
    
    def _make_request(
        self,
        method: str,
        endpoint: str,
        data: Dict = None,
        files: Dict = None
    ) -> Dict[str, Any]:
        """
        Make authenticated API request
        
        Args:
            method: HTTP method
            endpoint: API endpoint
            data: Request data
            files: Files to upload
            
        Returns:
            Response JSON
        """
        self._ensure_auth()
        
        url = f"{self.base_url}{endpoint}"
        
        try:
            if method.upper() == 'GET':
                response = self.session.get(url, params=data)
            elif method.upper() == 'POST':
                if files:
                    response = self.session.post(url, data=data, files=files)
                else:
                    response = self.session.post(url, json=data)
            elif method.upper() == 'PATCH':
                response = self.session.patch(url, json=data)
            elif method.upper() == 'DELETE':
                response = self.session.delete(url)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            response.raise_for_status()
            return response.json()
            
        except requests.HTTPError as e:
            print(f"API Error: {e}")
            print(f"Response: {e.response.text if e.response else 'No response'}")
            raise
    
    # ==================== Test API ====================
    
    def create_test(
        self,
        title: str,
        test_type: TestType,
        duration: int = 60,
        number_question: int = 40,
        level: Level = Level.Mid,
        description: str = None,
        image_file = None,
        audio_file = None
    ) -> Dict[str, Any]:
        """
        Create a new test
        
        Returns:
            Created test data with idTest
        """
        self._ensure_auth()
        
        data = {
            'idUser': self.user_id,
            'title': title,
            'testType': test_type.value if isinstance(test_type, TestType) else test_type,
            'duration': str(duration),
            'numberQuestion': str(number_question),
            'level': level.value if isinstance(level, Level) else level,
        }
        
        if description:
            data['description'] = description
        
        files = {}
        if image_file:
            files['files'] = image_file
        if audio_file:
            files['audioFile'] = audio_file
        
        # Use form data for file uploads
        response = self.session.post(
            f"{self.base_url}/test/create-test",
            data=data,
            files=files if files else None
        )
        response.raise_for_status()
        
        result = response.json()
        print(f"✓ Created test: {title}")
        return result.get('data', result)
    
    # ==================== Part API ====================
    
    def create_part(self, id_test: str, name_part: str) -> Dict[str, Any]:
        """Create a part for a test"""
        result = self._make_request('POST', '/part/create-part', {
            'idTest': id_test,
            'namePart': name_part
        })
        print(f"  ✓ Created part: {name_part}")
        return result.get('data', result)
    
    # ==================== Passage API ====================
    
    def create_passage(
        self,
        id_part: str,
        title: str,
        content: str,
        number_paragraph: int = 0,
        description: str = None
    ) -> Dict[str, Any]:
        """Create a passage for a part"""
        self._ensure_auth()
        
        data = {
            'idPart': id_part,
            'title': title,
            'content': content,
            'numberParagraph': str(number_paragraph),
        }
        
        if description:
            data['description'] = description
        
        response = self.session.post(
            f"{self.base_url}/passage/create-passage",
            data=data
        )
        response.raise_for_status()
        
        result = response.json()
        print(f"  ✓ Created passage: {title[:50]}...")
        return result.get('data', result)
    
    # ==================== Group of Questions API ====================
    
    def create_group_of_questions(
        self,
        id_test: str,
        id_part: str,
        title: str,
        type_question: QuestionType,
        quantity: int
    ) -> Dict[str, Any]:
        """Create a group of questions"""
        self._ensure_auth()
        
        type_value = type_question.value if isinstance(type_question, QuestionType) else type_question
        
        data = {
            'idTest': id_test,
            'idPart': id_part,
            'title': title,
            'typeQuestion': type_value,
            'quantity': str(quantity),
        }
        
        response = self.session.post(
            f"{self.base_url}/group-of-questions/create-group-question",
            data=data
        )
        response.raise_for_status()
        
        result = response.json()
        print(f"    ✓ Created group: {title[:40]}... ({type_value}, {quantity} questions)")
        return result.get('data', result)
    
    # ==================== Question API ====================
    
    def create_many_questions(
        self,
        questions: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Create multiple questions with answers"""
        result = self._make_request('POST', '/question/create-many-questions', {
            'questions': questions
        })
        print(f"      ✓ Created {len(questions)} questions")
        return result.get('data', result)
    
    # ==================== Full Test Creation ====================
    
    def create_full_test(self, test_data: TestData) -> Dict[str, Any]:
        """
        Create a complete test with all parts, passages, groups, and questions
        
        Args:
            test_data: Complete test data
            
        Returns:
            Created test info with all IDs
        """
        self._ensure_auth()
        
        print(f"\n{'='*60}")
        print(f"Creating test: {test_data.title}")
        print(f"{'='*60}")
        
        # 1. Create the test
        test_result = self.create_test(
            title=test_data.title,
            test_type=test_data.testType,
            duration=test_data.duration,
            number_question=test_data.numberQuestion,
            level=test_data.level,
            description=test_data.description
        )
        
        id_test = test_result.get('idTest')
        if not id_test:
            raise Exception("Failed to get test ID from response")
        
        created_data = {
            'test': test_result,
            'parts': []
        }
        
        # 2. Create parts
        for part_data in test_data.parts:
            part_result = self.create_part(id_test, part_data.namePart)
            id_part = part_result.get('idPart')
            
            part_info = {
                'part': part_result,
                'passage': None,
                'groups': []
            }
            
            # 3. Create passage if exists
            if part_data.passage:
                passage_result = self.create_passage(
                    id_part=id_part,
                    title=part_data.passage.title,
                    content=part_data.passage.content,
                    number_paragraph=part_data.passage.paragraph_count if hasattr(part_data.passage, 'paragraph_count') else part_data.passage.numberParagraph
                )
                part_info['passage'] = passage_result
            
            # 4. Create question groups
            for group_data in part_data.groups:
                group_result = self.create_group_of_questions(
                    id_test=id_test,
                    id_part=id_part,
                    title=group_data.title,
                    type_question=group_data.typeQuestion,
                    quantity=group_data.quantity
                )
                
                id_group = group_result.get('idGroupOfQuestions')
                
                group_info = {
                    'group': group_result,
                    'questions': []
                }
                
                # 5. Create questions with answers
                if group_data.questions:
                    questions_payload = []
                    for q in group_data.questions:
                        q_dict = {
                            'idGroupOfQuestions': id_group,
                            'idPart': id_part,
                            'numberQuestion': q.numberQuestion,
                            'content': q.content,
                            'answers': [a.model_dump() for a in q.answers]
                        }
                        questions_payload.append(q_dict)
                    
                    if questions_payload:
                        questions_result = self.create_many_questions(questions_payload)
                        group_info['questions'] = questions_result
                
                part_info['groups'].append(group_info)
            
            created_data['parts'].append(part_info)
        
        print(f"\n{'='*60}")
        print(f"✓ Test creation complete!")
        print(f"  Test ID: {id_test}")
        print(f"  Parts: {len(test_data.parts)}")
        print(f"  Questions: {test_data.numberQuestion}")
        print(f"{'='*60}\n")
        
        return created_data
