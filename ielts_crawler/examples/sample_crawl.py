"""
Example: Crawl an IELTS Reading test from a URL
"""
import sys
import os

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from main import IELTSCrawler
from models import TestType, Level


def example_crawl_and_preview():
    """
    Example: Preview extraction from a URL
    """
    crawler = IELTSCrawler()
    
    # Example URL (replace with actual IELTS test URL)
    url = "https://ielts-mentor.com/reading-sample/academic-reading/"
    
    print("=" * 60)
    print("IELTS Crawler - Preview Mode")
    print("=" * 60)
    
    result = crawler.preview_extraction(url)
    
    if result['success']:
        print(f"\n📚 Title: {result['title']}")
        print(f"📝 Type: {result['type']}")
        print(f"❓ Total Questions: {result['total_questions']}")
        
        for part in result['parts']:
            print(f"\n  📖 {part['name']}")
            if part['passage']:
                print(f"     Passage: {part['passage']}")
            for group in part['groups']:
                print(f"     • {group['type']}: {group['question_count']} questions")
                print(f"       {group['title']}")
    else:
        print(f"\n❌ Error: {result['error']}")


def example_crawl_and_upload():
    """
    Example: Crawl and upload to backend
    """
    crawler = IELTSCrawler()
    
    # Example URL (replace with actual IELTS test URL)
    url = "https://ielts-mentor.com/reading-sample/academic-reading/123/"
    
    print("=" * 60)
    print("IELTS Crawler - Full Upload")
    print("=" * 60)
    
    result = crawler.crawl_and_upload(
        url=url,
        test_title="Cambridge IELTS 17 - Test 1 - Reading",
        test_type=TestType.READING,
        level=Level.Mid
    )
    
    if result['success']:
        print(f"\n✅ Test created successfully!")
        print(f"   Test ID: {result['test_id']}")
    else:
        print(f"\n❌ Error: {result['error']}")


def example_manual_test_creation():
    """
    Example: Create test manually from structured data
    """
    from api_client import BackendAPI
    from models import (
        TestData, PartData, PassageData, 
        GroupOfQuestionsData, QuestionData, AnswerData
    )
    
    api = BackendAPI()
    
    # Build test data manually
    test = TestData(
        title="Manual Test Example",
        testType=TestType.READING,
        duration=60,
        numberQuestion=5,
        level=Level.Mid,
        parts=[
            PartData(
                namePart="Part 1",
                passage=PassageData(
                    title="Example Passage",
                    content="This is an example passage about climate change...",
                    numberParagraph=3
                ),
                groups=[
                    GroupOfQuestionsData(
                        title="Questions 1-3: Choose TRUE, FALSE, or NOT GIVEN",
                        typeQuestion="TFNG",
                        quantity=3,
                        questions=[
                            QuestionData(
                                numberQuestion=1,
                                content="Climate change is caused by human activities.",
                                answers=[AnswerData(matching_key="A", matching_value="TRUE")]
                            ),
                            QuestionData(
                                numberQuestion=2,
                                content="The passage mentions specific dates.",
                                answers=[AnswerData(matching_key="A", matching_value="NOTGIVEN")]
                            ),
                            QuestionData(
                                numberQuestion=3,
                                content="Scientists agree on all aspects of climate change.",
                                answers=[AnswerData(matching_key="A", matching_value="FALSE")]
                            ),
                        ]
                    )
                ]
            )
        ]
    )
    
    print("=" * 60)
    print("IELTS Crawler - Manual Test Creation")
    print("=" * 60)
    
    result = api.create_full_test(test)
    print(f"\n✅ Test created: {result['test'].get('idTest')}")


if __name__ == '__main__':
    # Run preview example by default
    example_crawl_and_preview()
