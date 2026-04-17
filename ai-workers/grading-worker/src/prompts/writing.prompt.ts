export function buildWritingPrompt(
  submissionText: string,
  writingPrompt: string,
  type: 'Task1' | 'Task2',
): string {
  const taskTypeNote =
    type === 'Task1'
      ? `This is an IELTS Writing Task 1 (Report/Academic Writing).

CRITICAL: An image (chart/graph/diagram/table/map/process) has been provided.
You MUST carefully analyze the image to verify:
1. Whether the candidate accurately described the data/information shown in the image
2. Whether key features, trends, and comparisons match what's in the image
3. Whether the overview statement correctly summarizes the main trends/features
4. Whether specific numbers, percentages, or data points mentioned are accurate

DO NOT give a high Task Achievement score if:
- The essay describes data that doesn't exist in the image
- Key features visible in the image are completely missing from the essay
- The candidate fabricated data not shown in the image
- The overview doesn't match the actual main trends in the image

Evaluate strictly based on IELTS Task 1 criteria.`
      : 'This is an IELTS Writing Task 2 (Essay). Evaluate the arguments and ideas.';

  return `You are a certified IELTS Writing examiner.
${taskTypeNote}

RULES:
1. Act as a strict but fair IELTS examiner.
2. Follow IELTS public band descriptors.
3. For each of the 4 criteria (TR/TA, CC, LR, GRA), provide detailed feedback.
4. Identify specific mistakes. Provide: original text, correction, and explanation.
5. Return ONLY pure JSON.

JSON OUTPUT FORMAT:
{
  "score": number,
  "task_response": string,
  "coherence_and_cohesion": string,
  "lexical_resource": string,
  "grammatical_range_and_accuracy": string,
  "general_feedback": string,
  "detailed_corrections": [
    {
      "mistake": "string",
      "correct": "string",
      "explanation": "string",
      "type": "Grammar | Lexis | Spelling | Cohesion"
    }
  ]
}

### Writing Prompt:
${writingPrompt}

### Candidate's Essay:
${submissionText}
`;
}

export interface WritingGradingResult {
  score: number;
  task_response: string;
  coherence_and_cohesion: string;
  lexical_resource: string;
  grammatical_range_and_accuracy: string;
  general_feedback: string;
  detailed_corrections: Array<{
    mistake: string;
    correct: string;
    explanation: string;
    type: string;
  }>;
}
