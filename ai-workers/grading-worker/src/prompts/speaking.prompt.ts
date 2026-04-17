export function buildSpeakingPrompt(
  transcript: string,
  taskTitle: string,
  questionsText: string,
): string {
  return `You are a strict IELTS Speaking examiner.
Evaluate the candidate's response based on official IELTS criteria.

### Candidate Submission:
- **Transcript**: "${transcript}"

*(INSTRUCTION: Use the transcript to check Vocabulary and Grammar accuracy.)*

### Task Info:
Task: ${taskTitle}
Questions: ${questionsText}

----------------------------------
Return valid JSON only (no markdown):
{
  "score_fluency": 6.5,
  "score_lexical": 6.0,
  "score_grammar": 5.5,
  "score_pronunciation": 7.0,
  "overall_score": 6.5,
  "comment_fluency": "...",
  "comment_lexical": "...",
  "comment_grammar": "...",
  "comment_pronunciation": "...",
  "general_feedback": "...",
  "detailed_corrections": [...]
}
`;
}

export interface SpeakingGradingResult {
  score_fluency: number;
  score_lexical: number;
  score_grammar: number;
  score_pronunciation: number;
  overall_score: number;
  comment_fluency: string;
  comment_lexical: string;
  comment_grammar: string;
  comment_pronunciation: string;
  general_feedback: string;
  detailed_corrections: Array<{
    mistake: string;
    correct: string;
    explanation: string;
    type: string;
  }>;
}
