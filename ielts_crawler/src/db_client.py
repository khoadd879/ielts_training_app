"""
Direct PostgreSQL Database Client for IELTS Crawler
Inserts test data directly into the database without going through the API
Matches Prisma schema from ielts_training_app
"""
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Dict, Any, Optional
import uuid
from datetime import datetime

from models import TestData, PartData, GroupOfQuestionsData, QuestionData


class DatabaseClient:
    """Direct PostgreSQL database client for inserting tests"""
    
    # Default admin user ID for test creation
    DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000001"  # You can change this
    
    def __init__(self, database_url: str = None):
        """
        Initialize database client
        
        Args:
            database_url: PostgreSQL connection URL
        """
        self.database_url = database_url or os.getenv('DATABASE_URL')
        if not self.database_url:
            raise ValueError("DATABASE_URL is required")
        
        self.conn = None
    
    def connect(self):
        """Establish database connection"""
        if not self.conn or self.conn.closed:
            self.conn = psycopg2.connect(self.database_url)
        return self.conn
    
    def close(self):
        """Close database connection"""
        if self.conn and not self.conn.closed:
            self.conn.close()
    
    def generate_uuid(self) -> str:
        """Generate a UUID for database IDs"""
        return str(uuid.uuid4())
    
    def get_or_create_admin_user(self, cursor) -> str:
        """Get admin user ID, create if doesn't exist"""
        # First try to find an admin user
        cursor.execute("""
            SELECT "idUser" FROM "User" WHERE role = 'ADMIN' LIMIT 1
        """)
        result = cursor.fetchone()
        
        if result:
            return result['idUser']
        
        # If no admin, create one
        admin_id = self.generate_uuid()
        cursor.execute("""
            INSERT INTO "User" ("idUser", "email", "password", "nameUser", "role", "isActive")
            VALUES (%s, %s, %s, %s, 'ADMIN', true)
            ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
            RETURNING "idUser"
        """, (admin_id, 'crawler@ielts.local', 'crawler_password_hash', 'IELTS Crawler'))
        
        return cursor.fetchone()['idUser']
    
    def upload_test(self, test_data: TestData) -> Dict[str, Any]:
        """
        Upload a complete test to the database
        
        Args:
            test_data: TestData object with all parts, groups, and questions
            
        Returns:
            Dict with success status and test ID
        """
        cursor = None
        try:
            conn = self.connect()
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            # Get admin user ID
            user_id = self.get_or_create_admin_user(cursor)
            
            # Generate test ID
            test_id = self.generate_uuid()
            now = datetime.now()
            
            # Insert Test
            cursor.execute("""
                INSERT INTO "Test" (
                    "idTest", "idUser", "title", "testType", "level",
                    "duration", "numberQuestion", "createdAt", "updatedAt"
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                test_id,
                user_id,
                test_data.title,
                test_data.testType.value,
                test_data.level.value,
                60,  # duration in minutes
                test_data.numberQuestion,
                now,
                now
            ))
            
            # Insert Parts
            for part in test_data.parts:
                part_id = self.generate_uuid()
                
                # Insert Part
                cursor.execute("""
                    INSERT INTO "Part" (
                        "idPart", "idTest", "namePart", "createdAt", "updatedAt"
                    ) VALUES (%s, %s, %s, %s, %s)
                """, (
                    part_id,
                    test_id,
                    part.namePart,
                    now,
                    now
                ))
                
                # Insert Passage if exists
                if part.passage:
                    passage_id = self.generate_uuid()
                    # Count paragraphs
                    num_paragraphs = len([p for p in part.passage.content.split('\n\n') if p.strip()])
                    
                    cursor.execute("""
                        INSERT INTO "Passage" (
                            "idPassage", "idPart", "title", "content", 
                            "numberParagraph", "createdAt", "updatedAt"
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """, (
                        passage_id,
                        part_id,
                        part.passage.title or 'Untitled',
                        part.passage.content,
                        num_paragraphs,
                        now,
                        now
                    ))
                
                # Insert Groups of Questions
                for group in part.groups:
                    group_id = self.generate_uuid()
                    
                    cursor.execute("""
                        INSERT INTO "GroupOfQuestions" (
                            "idGroupOfQuestions", "idTest", "idPart", "title", 
                            "typeQuestion", "quantity", "createdAt", "updatedAt"
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        group_id,
                        test_id,
                        part_id,
                        group.title or 'Questions',
                        group.typeQuestion.value,
                        group.quantity,
                        now,
                        now
                    ))
                    
                    # Insert Questions
                    for question in group.questions:
                        question_id = self.generate_uuid()
                        
                        cursor.execute("""
                            INSERT INTO "Question" (
                                "idQuestion", "idGroupOfQuestions", "idPart",
                                "numberQuestion", "content", "createdAt", "updatedAt"
                            ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                        """, (
                            question_id,
                            group_id,
                            part_id,
                            question.numberQuestion,
                            question.content,
                            now,
                            now
                        ))
                        
                        # Insert Answers
                        for answer in question.answers:
                            answer_id = self.generate_uuid()
                            
                            cursor.execute("""
                                INSERT INTO "Answer" (
                                    "idAnswer", "idQuestion", "answer_text",
                                    "matching_key", "matching_value", "createdAt", "updatedAt"
                                ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                            """, (
                                answer_id,
                                question_id,
                                answer.answer_text,
                                answer.matching_key,
                                answer.matching_value,
                                now,
                                now
                            ))
            
            # Commit transaction
            conn.commit()
            
            print(f"   ✅ Inserted test: {test_id}")
            
            # Print summary of inserted data
            self._print_test_summary(test_data, test_id)
            
            return {
                'success': True,
                'test': {'idTest': test_id},
                'message': 'Test inserted successfully'
            }
            
        except Exception as e:
            if self.conn:
                self.conn.rollback()
            print(f"   ❌ Database error: {e}")
            return {
                'success': False,
                'error': str(e)
            }
        finally:
            if cursor:
                cursor.close()
    
    def _print_test_summary(self, test_data: TestData, test_id: str):
        """Print a summary of the test that was inserted"""
        import json
        
        print("\n" + "="*60)
        print("📊 TEST SUMMARY")
        print("="*60)
        print(f"ID: {test_id}")
        print(f"Title: {test_data.title}")
        print(f"Type: {test_data.testType.value}")
        print(f"Level: {test_data.level.value}")
        print(f"Total Questions: {test_data.numberQuestion}")
        print(f"Parts: {len(test_data.parts)}")
        
        for i, part in enumerate(test_data.parts, 1):
            print(f"\n--- Part {i}: {part.namePart} ---")
            if part.passage:
                print(f"    Passage: {part.passage.title[:50]}..." if len(part.passage.title) > 50 else f"    Passage: {part.passage.title}")
            
            for j, group in enumerate(part.groups, 1):
                print(f"    Group {j}: {group.title[:40]}..." if len(group.title) > 40 else f"    Group {j}: {group.title}")
                print(f"        Type: {group.typeQuestion.value}")
                print(f"        Questions: {group.quantity}")
                
                # Show first 3 questions as sample
                for k, q in enumerate(group.questions[:3], 1):
                    content_preview = q.content[:60].replace('\n', ' ')
                    if len(q.content) > 60:
                        content_preview += "..."
                    print(f"        Q{q.numberQuestion}: {content_preview}")
                    
                    # Show answer(s)
                    if q.answers:
                        for ans in q.answers[:2]:
                            if ans.matching_value and ans.matching_value != "INCORRECT":
                                print(f"            → Answer: {ans.matching_key or ''} {ans.matching_value or ans.answer_text or ''}")
                            elif ans.answer_text:
                                print(f"            → Answer: {ans.answer_text}")
                
                if len(group.questions) > 3:
                    print(f"        ... and {len(group.questions) - 3} more questions")
        
        print("="*60)

