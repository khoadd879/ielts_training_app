"""
Main IELTS Crawler - Orchestrates the full crawling pipeline
"""
from typing import Optional, Dict, Any

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import config
from crawler import WebFetcher, ContentCleaner
from ai_pipeline import LLMClient, QuestionExtractor
from transformers import TransformerFactory
from api_client import BackendAPI
from models import (
    TestData,
    PartData,
    PassageData,
    GroupOfQuestionsData,
    QuestionData,
    TestType,
    QuestionType,
    Level,
    CrawlResult
)


class IELTSCrawler:
    """
    Main crawler class that orchestrates:
    1. Fetching web page
    2. Cleaning HTML content
    3. AI extraction of passages and questions
    4. Transformation to API format
    5. Upload to backend
    """
    
    def __init__(
        self,
        gemini_api_key: str = None,
        backend_url: str = None,
        admin_email: str = None,
        admin_password: str = None,
        use_browser: bool = False
    ):
        """
        Initialize IELTS Crawler
        
        Args:
            gemini_api_key: Gemini API key
            backend_url: Backend API base URL
            admin_email: Admin email for auth
            admin_password: Admin password
            use_browser: Use browser automation for protected sites
        """
        self.use_browser = use_browser
        self.browser_fetcher = None
        
        if use_browser:
            from crawler import BrowserFetcher
            self.browser_fetcher = BrowserFetcher(headless=True)
        else:
            self.fetcher = WebFetcher()
        
        self.cleaner = ContentCleaner()
        self.llm = LLMClient(api_key=gemini_api_key)
        self.question_extractor = QuestionExtractor(self.llm)
        self.api = BackendAPI(
            base_url=backend_url,
            email=admin_email,
            password=admin_password
        )
    
    def _fetch_html(self, url: str) -> str:
        """Fetch HTML using appropriate method"""
        if self.use_browser and self.browser_fetcher:
            return self.browser_fetcher.fetch_with_retry(url)
        else:
            return self.fetcher.fetch_with_retry(url)
    
    def close(self):
        """Cleanup resources"""
        if self.browser_fetcher:
            self.browser_fetcher.stop()
    
    def crawl_url(
        self,
        url: str,
        test_title: Optional[str] = None,
        test_type: TestType = TestType.READING,
        level: Level = Level.Mid
    ) -> CrawlResult:
        """
        Crawl a URL and extract IELTS test content
        
        Args:
            url: URL to crawl
            test_title: Custom test title (auto-generated if not provided)
            test_type: Type of test
            level: Difficulty level
            
        Returns:
            CrawlResult with extracted test data
        """
        print(f"\n🕷️ Crawling: {url}")
        print("-" * 60)
        
        try:
            # Step 1: Fetch HTML
            print("📥 Fetching page..." + (" (browser mode)" if self.use_browser else ""))
            html = self._fetch_html(url)
            if not html:
                return CrawlResult(
                    url=url,
                    success=False,
                    error_message="Failed to fetch URL"
                )
            
            # Step 2: Clean and extract content
            print("🧹 Cleaning content...")
            content_data = self.cleaner.extract_structured_content(html)
            
            # Debug: Show if answer key was found
            if content_data.get('answer_key'):
                print(f"   ✓ Found answer key")
            
            # Step 3: AI extraction
            print("🤖 AI analyzing content...")
            question_ranges = content_data.get('question_ranges', [])
            ai_result = self.question_extractor.extract_full_test(
                content_data['raw_text'],
                question_ranges=question_ranges
            )
            
            # Step 4: Build TestData
            print("🔧 Building test structure...")
            
            # Generate better title from passage
            if not test_title:
                if ai_result.passages:
                    passage_title = ai_result.passages[0].title
                    if passage_title:
                        test_title = f"IELTS Reading: {passage_title}"
                    else:
                        test_title = f"IELTS Reading Practice Test"
                else:
                    test_title = content_data.get('page_title', 'IELTS Reading Test')
            
            test_data = self._build_test_data(
                ai_result=ai_result,
                title=test_title,
                test_type=test_type,
                level=level
            )
            
            return CrawlResult(
                url=url,
                success=True,
                test_data=test_data,
                raw_html=html
            )
            
        except Exception as e:
            print(f"❌ Error: {e}")
            return CrawlResult(
                url=url,
                success=False,
                error_message=str(e)
            )
    
    def _build_test_data(
        self,
        ai_result,
        title: str,
        test_type: TestType,
        level: Level
    ) -> TestData:
        """Build TestData from AI extraction result"""
        
        # Count total questions
        total_questions = sum(
            len(g.questions) for g in ai_result.question_groups
        )
        
        # Create parts based on passages
        parts = []
        
        if test_type == TestType.READING:
            # For reading, create parts based on passages
            for i, passage in enumerate(ai_result.passages):
                part_name = f"Part {i + 1}"
                
                passage_data = PassageData(
                    title=passage.title,
                    content=passage.content,
                    numberParagraph=passage.paragraph_count
                )
                
                # Assign question groups to parts
                # (Simple heuristic: divide groups evenly among parts)
                groups_per_part = len(ai_result.question_groups) // max(len(ai_result.passages), 1)
                start_idx = i * groups_per_part
                end_idx = start_idx + groups_per_part if i < len(ai_result.passages) - 1 else len(ai_result.question_groups)
                
                groups = []
                for group in ai_result.question_groups[start_idx:end_idx]:
                    group_data = self._build_group_data(group)
                    groups.append(group_data)
                
                part = PartData(
                    namePart=part_name,
                    passage=passage_data,
                    groups=groups
                )
                parts.append(part)
            
            # If no passages, create single part with all groups
            if not parts:
                groups = [
                    self._build_group_data(g) for g in ai_result.question_groups
                ]
                parts.append(PartData(
                    namePart="Part 1",
                    groups=groups
                ))
        else:
            # For other test types, single part
            groups = [
                self._build_group_data(g) for g in ai_result.question_groups
            ]
            parts.append(PartData(
                namePart="Part 1",
                groups=groups
            ))
        
        return TestData(
            title=title,
            testType=test_type,
            duration=60,
            numberQuestion=total_questions or 40,
            level=level,
            parts=parts
        )
    
    def _build_group_data(self, group) -> GroupOfQuestionsData:
        """Build GroupOfQuestionsData from extracted group"""
        
        # Get transformer for question type
        transformer = TransformerFactory.get_transformer(group.question_type)
        
        # Transform questions (using empty IDs - will be replaced after API calls)
        transformed_questions = transformer.transform(
            group=group,
            id_group="",  # Will be set after API creation
            id_part="",   # Will be set after API creation
            start_number=1
        )
        
        return GroupOfQuestionsData(
            title=group.title,
            typeQuestion=group.question_type,
            quantity=len(group.questions),
            questions=transformed_questions
        )
    
    def crawl_and_upload(
        self,
        url: str,
        test_title: Optional[str] = None,
        test_type: TestType = TestType.READING,
        level: Level = Level.Mid
    ) -> Dict[str, Any]:
        """
        Crawl URL and upload to backend
        
        Args:
            url: URL to crawl
            test_title: Custom test title
            test_type: Type of test
            level: Difficulty level
            
        Returns:
            Upload result with test ID
        """
        # Crawl
        result = self.crawl_url(url, test_title, test_type, level)
        
        if not result.success:
            return {
                'success': False,
                'error': result.error_message
            }
        
        # Upload
        print("\n📤 Uploading to backend...")
        try:
            upload_result = self.api.create_full_test(result.test_data)
            return {
                'success': True,
                'test_id': upload_result['test'].get('idTest'),
                'data': upload_result
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def crawl_and_export_json(
        self,
        url: str,
        output_path: Optional[str] = None,
        test_title: Optional[str] = None,
        test_type: TestType = TestType.READING,
        level: Level = Level.Mid
    ) -> Dict[str, Any]:
        """
        Crawl URL and export to exam-import.schema.json format
        
        Args:
            url: URL to crawl
            output_path: Optional output file path (defaults to output/{slug}.json)
            test_title: Custom test title
            test_type: Type of test
            level: Difficulty level
            
        Returns:
            Dict with success status, output path, and normalized data
        """
        from pathlib import Path
        from transformers.schema_transformer import transform_to_exam_import_schema, save_normalized_exam
        
        # Crawl
        result = self.crawl_url(url, test_title, test_type, level)
        
        if not result.success:
            return {
                'success': False,
                'error': result.error_message
            }
        
        # Transform to exam-import schema
        print("\n📄 Transforming to exam-import.schema.json format...")
        try:
            normalized = transform_to_exam_import_schema(result.test_data)
            
            # Save to file
            if output_path:
                output_file = Path(output_path)
            else:
                output_file = None
            
            saved_path = save_normalized_exam(normalized, output_file)
            
            return {
                'success': True,
                'output_path': str(saved_path),
                'data': normalized
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def preview_extraction(self, url: str) -> Dict[str, Any]:
        """
        Preview what would be extracted without uploading
        
        Args:
            url: URL to analyze
            
        Returns:
            Preview of extracted content
        """
        result = self.crawl_url(url)
        
        if not result.success:
            return {
                'success': False,
                'error': result.error_message
            }
        
        test = result.test_data
        
        preview = {
            'success': True,
            'title': test.title,
            'type': test.testType.value,
            'total_questions': test.numberQuestion,
            'parts': []
        }
        
        for part in test.parts:
            part_preview = {
                'name': part.namePart,
                'passage': {
                    'title': part.passage.title,
                    'content': part.passage.content[:500] + '...' if len(part.passage.content) > 500 else part.passage.content
                } if part.passage else None,
                'groups': []
            }
            
            for group in part.groups:
                group_preview = {
                    'title': group.title,
                    'type': group.typeQuestion.value,
                    'question_count': group.quantity,
                    'questions': []
                }
                
                # Include question details
                for q in group.questions:
                    q_preview = {
                        'number': q.numberQuestion,
                        'content': q.content[:200] + '...' if len(q.content) > 200 else q.content,
                    }
                    if q.answers:
                        q_preview['answers'] = [a.dict() for a in q.answers[:5]]
                    group_preview['questions'].append(q_preview)
                
                part_preview['groups'].append(group_preview)
            
            preview['parts'].append(part_preview)
        
        return preview


def main():
    """CLI entry point"""
    import argparse
    import json
    
    parser = argparse.ArgumentParser(description='IELTS Crawler with AI Pipeline')
    parser.add_argument('url', nargs='?', help='URL to crawl (optional, can use URL_TO_CRAWL in .env)')
    parser.add_argument('--title', '-t', help='Test title (optional, can use DEFAULT_TEST_TITLE in .env)')
    parser.add_argument('--type', '-T', choices=['READING', 'LISTENING'], default='READING')
    parser.add_argument('--level', '-l', choices=['Low', 'Mid', 'High', 'Great'], default=None)
    parser.add_argument('--preview', '-p', action='store_true', help='Preview only, do not upload')
    parser.add_argument('--discover', '-d', action='store_true', help='Discover test links from index page')
    parser.add_argument('--crawl-all', '-a', action='store_true', help='Discover links and crawl all tests')
    parser.add_argument('--browser', '-b', action='store_true', help='Use browser for protected sites (requires playwright)')
    parser.add_argument('--db', action='store_true', help='Insert directly to database (requires DATABASE_URL in .env)')
    parser.add_argument('--validate', '-v', action='store_true', help='Use multi-agent AI validation pipeline')
    parser.add_argument('--threshold', type=float, default=0.95, help='Accuracy threshold for validation (default: 0.95)')
    parser.add_argument('--compare', '-c', action='store_true', help='Enable visual comparison between web and FE')
    parser.add_argument('--fe-url', type=str, default='http://localhost:3001', help='Frontend URL for visual comparison')
    parser.add_argument('--export-json', '-j', action='store_true', help='Export to JSON (exam-import.schema.json format) instead of uploading')
    parser.add_argument('--output', '-o', type=str, default=None, help='Output path for JSON export (used with --export-json)')
    
    args = parser.parse_args()
    
    # Get URL from args or config
    url = args.url or config.URL_TO_CRAWL
    if not url:
        print("❌ Không có URL! Thêm URL vào .env (URL_TO_CRAWL) hoặc truyền qua command line.")
        return
    
    # Validate config
    if not config.validate():
        print("\n❌ Configuration invalid. Please check your .env file.")
        return
    
    # Get level from args or config
    level_str = args.level or config.DEFAULT_TEST_LEVEL
    level = Level[level_str]
    
    print(f"📋 URL: {url}")
    
    # DISCOVER MODE - Find test links from index page
    if args.discover:
        from crawler import LinkDiscoverer
        discoverer = LinkDiscoverer(use_browser=args.browser)
        links = discoverer.discover_and_list(url)
        
        if links:
            print(f"\n📝 Để crawl tất cả, chạy với --crawl-all hoặc -a")
        return
    
    # CRAWL-ALL MODE - Discover and crawl all tests
    if args.crawl_all:
        from crawler import LinkDiscoverer
        import re
        
        discoverer = LinkDiscoverer(use_browser=args.browser)
        
        print("🔍 Đang tìm các đường dẫn đề thi...")
        links = discoverer.discover_and_list(url)
        
        if not links:
            print("❌ Không tìm thấy đường dẫn nào!")
            return
        
        # Group sections into complete tests (3 sections = 1 test)
        def group_sections_into_tests(links):
            """Group section links like 1.1, 1.2, 1.3 into complete tests"""
            tests = {}
            
            for link in links:
                url = link.get('url', '')
                # Extract test number from URL patterns like:
                # academic-reading-sample-1.1.html -> test "academic-1"
                # general-reading-sample-2.3.html -> test "general-2"
                match = re.search(r'(academic|general)-reading-sample-(\d+)\.(\d+)', url)
                if match:
                    test_type = match.group(1)  # academic or general
                    test_num = match.group(2)   # 1, 2, 3...
                    section_num = match.group(3)  # 1, 2, 3
                    
                    test_key = f"{test_type}-{test_num}"
                    
                    if test_key not in tests:
                        tests[test_key] = {
                            'title': f"IELTS {test_type.capitalize()} Reading Test {test_num}",
                            'type': 'READING',
                            'sections': {}
                        }
                    
                    tests[test_key]['sections'][int(section_num)] = link
                else:
                    # Non-standard URL, treat as individual test
                    tests[url] = {
                        'title': link.get('title', 'Unknown Test'),
                        'type': link.get('test_type', 'READING'),
                        'sections': {1: link}
                    }
            
            return tests
        
        grouped_tests = group_sections_into_tests(links)
        print(f"\n✓ Tìm thấy {len(links)} sections → {len(grouped_tests)} complete tests")
        
        # Close discoverer browser before starting crawler
        discoverer.close()
        
        # Initialize database client if --db flag is used
        db_client = None
        if args.db:
            from db_client import DatabaseClient
            db_client = DatabaseClient()
            print("   📦 Using direct database insert mode")
        
        crawler = IELTSCrawler(use_browser=args.browser)
        results = []
        
        for i, (test_key, test_info) in enumerate(grouped_tests.items(), 1):
            print(f"\n{'='*60}")
            print(f"[{i}/{len(grouped_tests)}] {test_info['title']}")
            print(f"   Sections: {sorted(test_info['sections'].keys())}")
            print(f"{'='*60}")
            
            # Crawl each section and combine into one test
            all_parts = []
            total_questions = 0
            combined_title = test_info['title']
            
            for section_num in sorted(test_info['sections'].keys()):
                section = test_info['sections'][section_num]
                print(f"\n   📖 Section {section_num}: {section.get('url', '')}")
                
                crawl_result = crawler.crawl_url(section['url'])
                
                if crawl_result.success and crawl_result.test_data:
                    # Rename parts to include section number
                    for part in crawl_result.test_data.parts:
                        part.namePart = f"Section {section_num}: {part.namePart}"
                        all_parts.append(part)
                        for group in part.groups:
                            total_questions += group.quantity
                    print(f"      ✓ Extracted {len(crawl_result.test_data.parts)} part(s)")
                else:
                    print(f"      ❌ Failed: {crawl_result.error_message}")
            
            if all_parts:
                # Create combined test
                combined_test = TestData(
                    title=combined_title,
                    testType=TestType.READING,
                    level=level,
                    totalTime=60,
                    parts=all_parts,
                    numberQuestion=total_questions
                )
                
                print(f"\n   📊 Combined: {len(all_parts)} parts, {total_questions} questions")
                
                if args.preview:
                    preview = {
                        'success': True,
                        'title': combined_title,
                        'total_questions': total_questions,
                        'sections': len(test_info['sections']),
                        'parts': [{'name': p.namePart, 'groups': len(p.groups)} for p in all_parts]
                    }
                    print(json.dumps(preview, indent=2, ensure_ascii=False))
                    results.append(preview)
                else:
                    # Upload combined test
                    try:
                        if db_client:
                            # Direct database insert
                            upload_result = db_client.upload_test(combined_test)
                        else:
                            # API upload (fallback)
                            upload_result = crawler.api.upload_test(combined_test)
                        
                        if upload_result.get('success'):
                            test_id = upload_result['test'].get('idTest')
                            print(f"   ✅ Uploaded! Test ID: {test_id}")
                            results.append({'success': True, 'test_id': test_id})
                        else:
                            print(f"   ❌ Upload failed: {upload_result.get('error')}")
                            results.append({'success': False, 'error': upload_result.get('error')})
                    except Exception as e:
                        print(f"   ❌ Upload error: {e}")
                        results.append({'success': False, 'error': str(e)})
            else:
                print(f"   ⚠️ No content extracted for this test")
                results.append({'success': False, 'error': 'No content'})
        
        # Summary
        success_count = sum(1 for r in results if r.get('success'))
        print(f"\n{'='*60}")
        print(f"📊 TỔNG KẾT: {success_count}/{len(results)} tests thành công")
        print(f"{'='*60}")
        return
    
    # SINGLE URL MODE (default)
    title = args.title or config.DEFAULT_TEST_TITLE or None
    if title:
        print(f"📋 Title: {title}")
    
    crawler = IELTSCrawler(use_browser=args.browser)
    
    if args.preview:
        result = crawler.preview_extraction(url)
        print("\n📋 Preview:")
        print(json.dumps(result, indent=2, ensure_ascii=False))
    elif args.export_json:
        # Export to JSON (exam-import.schema.json format)
        result = crawler.crawl_and_export_json(
            url=url,
            output_path=args.output,
            test_title=title,
            test_type=TestType[args.type],
            level=level
        )
        
        if result['success']:
            print(f"\n✅ Exported to: {result['output_path']}")
            print(f"   Title: {result['data']['exams'][0]['title']}")
            print(f"   Questions: {sum(len(s['questions']) for s in result['data']['exams'][0]['sections'])}")
        else:
            print(f"\n❌ Export failed: {result['error']}")
    elif args.validate:
        # Multi-Agent AI Validation Pipeline Mode
        from ai_pipeline.pipeline import ExtractionPipeline
        from db_client import DatabaseClient
        
        print("🔄 Using Multi-Agent AI Validation Pipeline...")
        
        # Fetch and clean content first
        if crawler.use_browser:
            html = crawler.browser_fetcher.fetch(url)
        else:
            html = crawler.fetcher.fetch(url)
        
        content_data = crawler.cleaner.extract_structured_content(html)
        
        if content_data.get('answer_key'):
            print(f"   ✓ Found answer key")
        
        # Run pipeline
        pipeline = ExtractionPipeline(crawler.llm)
        result = pipeline.run(
            raw_text=content_data['raw_text'],
            question_ranges=content_data.get('question_ranges', []),
            answer_key=content_data.get('answer_key'),
            accuracy_threshold=args.threshold
        )
        
        # Show results
        print(f"\n📊 Pipeline Results:")
        for log in result['steps_log']:
            print(f"   • {log}")
        
        if result['discrepancies']:
            print(f"\n⚠️ Discrepancies ({len(result['discrepancies'])}):")
            for d in result['discrepancies'][:5]:
                print(f"   Q{d['question']}: expected '{d['expected']}' got '{d['got']}'")
        
        if result['is_valid']:
            print(f"\n✅ Validation PASSED (accuracy: {result['accuracy']:.1%})")
            
            if args.db:
                db_client = DatabaseClient()
                # Get title from extraction if not provided
                final_title = title
                if not final_title and result['extraction'].passages:
                    final_title = f"IELTS Reading: {result['extraction'].passages[0].title}"
                if not final_title:
                    final_title = "IELTS Reading Practice Test"
                # Build test data from extraction
                test_data = crawler._build_test_data(result['extraction'], final_title, TestType[args.type], level)
                upload_result = db_client.upload_test(test_data)
                if upload_result.get('success'):
                    test_id = upload_result['test']['idTest']
                    print(f"✅ Inserted test: {test_id}")
                    
                    # Step 6: Visual comparison (if --compare flag)
                    if args.compare:
                        print(f"\n📷 Step 6: Visual Comparison (Web vs FE)...")
                        comparison = pipeline.visual_compare(url, args.fe_url, test_id)
                        if comparison.get('comparison_result'):
                            print(f"   📋 AI Analysis: {comparison['comparison_result'][:200]}...")
                        if comparison.get('issues'):
                            print(f"   ⚠️ Issues found: {len(comparison['issues'])}")
                            for issue in comparison['issues'][:3]:
                                print(f"      • {issue}")
                        else:
                            print(f"   ✅ No issues found!")
                else:
                    print(f"❌ DB Insert failed: {upload_result.get('error')}")
            else:
                print("   (use --db flag to insert to database)")
        else:
            print(f"\n❌ Validation FAILED (accuracy: {result['accuracy']:.1%} < {args.threshold:.1%})")
            print("   Fix discrepancies or lower threshold with --threshold 0.8")
    else:
        # Check if using direct database insert
        if args.db:
            from db_client import DatabaseClient
            db_client = DatabaseClient()
            print("   📦 Using direct database insert mode")
            
            # Crawl URL
            crawl_result = crawler.crawl_url(url, title, TestType[args.type], level)
            
            if crawl_result.success and crawl_result.test_data:
                upload_result = db_client.upload_test(crawl_result.test_data)
                if upload_result.get('success'):
                    print(f"\n✅ Success! Test ID: {upload_result['test']['idTest']}")
                else:
                    print(f"\n❌ Failed: {upload_result.get('error')}")
            else:
                print(f"\n❌ Failed: {crawl_result.error_message}")
        else:
            # Use API upload
            result = crawler.crawl_and_upload(
                url=url,
                test_title=title,
                test_type=TestType[args.type],
                level=level
            )
            
            if result['success']:
                print(f"\n✅ Success! Test ID: {result['test_id']}")
            else:
                print(f"\n❌ Failed: {result['error']}")


if __name__ == '__main__':
    main()
