"""
Prompt templates for AI extraction of IELTS content
"""

PASSAGE_EXTRACTION_PROMPT = """
Extract the reading passage(s) from this IELTS test content.

IMPORTANT FORMATTING RULES:
1. If paragraphs have letter markers (A, B, C...), format as: "A\\t" (letter + TAB character)
2. Use EXACTLY TWO NEWLINES (\\n\\n) between each paragraph
3. Keep the original paragraph structure - do NOT merge paragraphs into one block

For each passage, provide:
- title: The passage title/heading
- content: The full passage text WITH paragraph breaks preserved

CORRECT FORMAT EXAMPLE:
"A\\tFirst paragraph text here about the topic...\\n\\nB\\tSecond paragraph continues...\\n\\nC\\tThird paragraph..."

Return as JSON:
{
  "passages": [
    {
      "title": "string",
      "content": "string (full text with paragraph breaks)",
      "paragraph_count": number
    }
  ]
}
"""

QUESTION_TYPE_DETECTION_PROMPT = """
Analyze this IELTS question section and identify the question type.

Common IELTS question types:
- MCQ: Multiple choice questions with A, B, C, D options
- TFNG: True/False/Not Given questions
- YES_NO_NOTGIVEN: Yes/No/Not Given questions
- FILL_BLANK: Fill in the blanks (sentence completion)
- MATCHING: Matching headings, features, or information
- SHORT_ANSWER: Short answer questions
- LABELING: Diagram/map labeling

Return as JSON:
{
  "question_type": "MCQ|TFNG|YES_NO_NOTGIVEN|FILL_BLANK|MATCHING|SHORT_ANSWER|LABELING",
  "confidence": 0.0-1.0,
  "indicators": ["list of text patterns that helped identify the type"]
}
"""

QUESTION_EXTRACTION_PROMPT = """
Extract all questions from this IELTS question section.

The question type is: {question_type}

For each question, extract:
- number: Question number
- content: The question text
- options: (for MCQ only) List of options A, B, C, D
- correct_answer: The correct answer if visible

Return as JSON:
{{
  "questions": [
    {{
      "number": 1,
      "content": "question text",
      "options": ["A. option", "B. option", ...] // MCQ only
      "correct_answer": "answer text or letter"
    }}
  ]
}}
"""

FULL_EXTRACTION_PROMPT = """
Extract complete IELTS Reading test content from the provided webpage.

=== STEP 1: IDENTIFY THE READING PASSAGE ===
Find the main reading text/article. Extract title and full content.

=== STEP 2: IDENTIFY QUESTION TYPES ===

CRUCIAL: Use these EXACT patterns to determine question type:

| Text Pattern | Question Type |
|--------------|---------------|
| "TRUE/FALSE/NOT GIVEN" | TFNG |
| "YES/NO/NOT GIVEN" | YES_NO_NOTGIVEN |
| "Choose the correct letter, A, B, C" | MCQ |
| "Choose TWO letters" | MCQ |
| "Complete the summary" | FILL_BLANK |
| "Complete the notes" | FILL_BLANK |
| "Complete the sentences" | FILL_BLANK |
| "Complete the table" | FILL_BLANK |
| "Fill in the blanks" | FILL_BLANK |
| "using NO MORE THAN THREE WORDS" | FILL_BLANK or SHORT_ANSWER |
| "Match the headings" | MATCHING |
| "Which paragraph contains" | MATCHING |
| "Match the following" | MATCHING |
| "match each statement" | MATCHING |
| "Label the diagram" | LABELING |
| "Label the map" | LABELING |

=== STEP 3: EXTRACT QUESTIONS ===

For each question group, extract ALL questions with their numbers and content.

SPECIAL HANDLING FOR FILL_BLANK:
**CRITICAL: "content" is THE SENTENCE with blank. "correct_answer" is THE WORD that fills the blank.**

- content = the FULL SENTENCE containing ___ (three underscores)
- correct_answer = the WORD/PHRASE that fills the blank
- NEVER put the answer word in content!

BAD EXAMPLE (WRONG):
{
  "number": 22,
  "content": "Perseverance",  ← WRONG! This is the answer, not the sentence!
  "correct_answer": "Perseverance"
}

GOOD EXAMPLE (CORRECT):
{
  "number": 22,
  "content": "Joaquin Guzman needed ___ to escape from prison.",  ← SENTENCE with blank
  "correct_answer": "Perseverance"  ← WORD that fills the blank
}

Look for sentences on the webpage that contain blanks like ___ (use EXACTLY 3 underscores).

SPECIAL HANDLING FOR MATCHING:
- "Match the headings": The HEADING TEXT is the question content, paragraph LETTER is the answer
  - Example: "14. Jailbreak with creative thinking" → content="Jailbreak with creative thinking", correct_answer="C"
- "Which paragraph contains": The statement is content, paragraph letter is answer
- Collect all available paragraph/heading letters as matching_options

=== STEP 4: FIND CORRECT ANSWERS ===

IMPORTANT: Look for the ANSWER KEY section. Common patterns:
- Text like "1. FALSE, 2. TRUE, 3. NOT GIVEN..."
- Sections labeled "Answers:", "Answer Key:", "Key:"
- For FILL_BLANK: "8. Vibrant, 9. Polar-opposite, 10. Grainy"
- For MCQ: "11. B, 12. D, 13. A"
- For MATCHING: "14. C, 15. G, 16. B" (letter matches to paragraphs)

=== OUTPUT FORMAT ===

Return ONLY valid JSON:
{
  "test_title": "Title extracted from passage or page",
  "passages": [
    {
      "title": "Passage title",
      "content": "Full passage with paragraph markers: (A) First para...\\n\\n(B) Second para...",
      "paragraph_count": 5
    }
  ],
  "question_groups": [
    {
      "title": "Questions 1-7: Do the following statements agree with the information?",
      "question_type": "TFNG",
      "questions": [
        {
          "number": 1,
          "content": "Statement text to evaluate",
          "options": [],
          "correct_answer": "TRUE"
        }
      ]
    },
    {
      "title": "Questions 8-13: Complete the sentences below",
      "question_type": "FILL_BLANK",
      "questions": [
        {
          "number": 8,
          "content": "The author's attitude is described as ___.",
          "options": [],
          "correct_answer": "enthusiastic"
        }
      ]
    },
    {
      "title": "Questions 14-21: Match the headings with paragraphs A-H",
      "question_type": "MATCHING",
      "matching_options": ["A. Paragraph A", "B. Paragraph B", "C. Paragraph C", "D. Paragraph D", "E. Paragraph E", "F. Paragraph F", "G. Paragraph G", "H. Paragraph H"],
      "questions": [
        {
          "number": 14,
          "content": "Jailbreak with creative thinking",
          "options": [],
          "correct_answer": "C"
        },
        {
          "number": 15,
          "content": "The importance of teamwork",
          "options": [],
          "correct_answer": "G"
        }
      ]
    },
    {
      "title": "Questions 22-25: Complete the sentences",
      "question_type": "FILL_BLANK",
      "questions": [
        {
          "number": 22,
          "content": "The 1990s was a period of ___ for legitimate businesses.",
          "options": [],
          "correct_answer": "expansion"
        }
      ]
    },
    {
      "title": "Question 26: Choose the correct letter A, B, C or D",
      "question_type": "MCQ",
      "questions": [
        {
          "number": 26,
          "content": "What is the main purpose of the passage?",
          "options": ["A. To describe", "B. To argue", "C. To inform", "D. To persuade"],
          "correct_answer": "C"
        }
      ]
    }
  ]
}

=== CRITICAL RULES ===

1. NEVER use "OTHER" as question type - always pick the closest match
2. For MATCHING (Match headings): 
   - content = the heading/statement text (NOT the letter)
   - correct_answer = the paragraph letter (A, B, C...)
   - matching_options = list of paragraph labels ["A.", "B.", "C."...] or ["A. Paragraph A", "B. Paragraph B"...]
3. For FILL_BLANK: Keep the blank marker (___) in content
4. For MCQ: Include ALL options in the options array with letter prefix (A., B., C., D.)
5. Extract ALL questions - don't skip any
6. If answer key exists, extract answers for ALL questions
7. correct_answer should be:
   - For TFNG: "TRUE", "FALSE", or "NOTGIVEN" (not "NOT GIVEN")
   - For YES_NO: "YES", "NO", or "NOTGIVEN"
   - For MCQ: Just the letter "A", "B", "C", or "D"
   - For MATCHING: Just the letter of the matching option
   - For FILL_BLANK: The word/phrase to fill in
8. PRESERVE ORIGINAL QUESTION NUMBERS from the web page!
   - If web says "Questions 14-21", the first question number should be 14, second 15, etc.
   - DO NOT renumber questions starting from 1
   - Example: "Questions 14-21" → numbers should be [14, 15, 16, 17, 18, 19, 20, 21]

Now extract from the content below:
"""

MCQ_ANSWER_FORMAT_PROMPT = """
For MCQ questions, format answers as:
{
  "answers": [
    {"answer_text": "Option A text", "matching_key": "A", "matching_value": "INCORRECT"},
    {"answer_text": "Option B text", "matching_key": "B", "matching_value": "CORRECT"},
    {"answer_text": "Option C text", "matching_key": "C", "matching_value": "INCORRECT"},
    {"answer_text": "Option D text", "matching_key": "D", "matching_value": "INCORRECT"}
  ]
}
"""

TFNG_ANSWER_FORMAT_PROMPT = """
For True/False/Not Given questions, format answers as:
{
  "answers": [
    {"matching_key": "A", "matching_value": "TRUE|FALSE|NOTGIVEN"}
  ]
}
Note: matching_value should be the CORRECT answer for this question.
"""

FILL_BLANK_ANSWER_FORMAT_PROMPT = """
For Fill in the Blank questions, format answers as:
{
  "answers": [
    {"answer_text": "correct word or phrase"}
  ]
}
"""

MATCHING_ANSWER_FORMAT_PROMPT = """
For Matching questions, format answers as:
{
  "answers": [
    {"matching_key": "1", "matching_value": "A"},
    {"matching_key": "2", "matching_value": "C"}
  ]
}
Where matching_key is the question number and matching_value is the correct letter match.
"""

FILL_BLANK_VERIFICATION_PROMPT = """
You are verifying FILL_BLANK questions extracted from an IELTS test.

PROBLEM: Some questions have "content" = answer word instead of the actual sentence with a blank.

Your task: For each FILL_BLANK question, check if "content" is just a single word/phrase (the answer).
If so, find the ACTUAL SENTENCE from the original text and return the fixed question.

INPUT:
Original text from webpage:
{original_text}

Extracted questions to verify:
{questions_json}

OUTPUT: Return fixed JSON with proper sentence content for each question.
Each content should be a FULL SENTENCE containing ___ (blank marker).

Example fix:
BEFORE: {"number": 22, "content": "Perseverance", "correct_answer": "Perseverance"}
AFTER:  {"number": 22, "content": "Joaquin Guzman needed ___ to escape from prison.", "correct_answer": "Perseverance"}

Return ONLY valid JSON array of fixed questions.
"""

VALIDATION_PROMPT = """
You are an AI validator checking the output of another AI's IELTS test extraction.

## YOUR TASK
Review the extracted questions and check if they match the REQUIRED FORMAT below.
If any issues found, return fixes.

## REQUIRED ANSWER FORMAT BY QUESTION TYPE (from FE database)

### 1. TFNG / YES_NO_NOTGIVEN
- content: Full statement text
- answers: [{{answer_text: "TRUE/FALSE/NOT GIVEN", matching_key: null, matching_value: null}}]

### 2. MCQ (Multiple Choice)
- content: Question text
- answers: Full options pool, each with:
  - answer_text: option text
  - matching_key: "A"/"B"/"C"/"D"
  - matching_value: "CORRECT" or "INCORRECT" (NOT null!)

### 3. MATCHING / LABELING (Match Headings, Match Features)
- content: Statement/question text (NOT just a letter!)
- answers: Full options pool (A-H), each with:
  - answer_text: heading/option text (can be empty "")
  - matching_key: "A"/"B"/"C"/"D"/"E"/"F"/"G"/"H"
  - matching_value: "CORRECT" or null

### 4. FILL_BLANK
- content: FULL SENTENCE with blank marker ___ (NOT just the answer word!)
- answers: [{{answer_text: "answer word", matching_key: null, matching_value: null}}]

### 5. SHORT_ANSWER
- content: Question text
- answers: [{{answer_text: "answer text", matching_key: null, matching_value: null}}]

## COMMON ISSUES TO FIX

1. FILL_BLANK content = answer word instead of sentence
   WRONG: {{"content": "Perseverance", "correct_answer": "Perseverance"}}
   RIGHT: {{"content": "He needed ___ to escape.", "correct_answer": "Perseverance"}}

2. MATCHING content = letter instead of statement text
   WRONG: {{"content": "C", "correct_answer": "C"}}
   RIGHT: {{"content": "how electroreception can be used to help fish reproduce", "correct_answer": "C"}}

3. Wrong question type based on answers
   - Answers are TRUE/FALSE/NOTGIVEN → type should be TFNG
   - Answers are single letters A-H → type should be MATCHING
   - Answers are words/phrases → type should be FILL_BLANK or SHORT_ANSWER

## INPUT

Extracted questions:
{preview_json}

Original text (for finding correct content):
{raw_text}

## OUTPUT FORMAT

Return JSON:
{{
  "has_issues": true/false,
  "fixes": [
    {{
      "group_index": 0,
      "question_index": 0,
      "issue": "content is answer word, not sentence",
      "new_content": "Full sentence with ___ blank",
      "new_type": "FILL_BLANK"
    }}
  ]
}}

If no issues found, return: {{"has_issues": false, "fixes": []}}
"""
