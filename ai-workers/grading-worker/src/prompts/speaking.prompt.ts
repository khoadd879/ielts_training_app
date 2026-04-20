export function buildSpeakingPrompt(
  transcript: string,
  taskTitle: string,
  questionsText: string,
): string {
  return `You are a strict IELTS Speaking examiner.
Evaluate the candidate's response based on official IELTS criteria (0-9 scale, 0.5 increments).

### Candidate Submission:
- **Transcript**: "${transcript}"

*(INSTRUCTION: Use the transcript to check Vocabulary and Grammar accuracy.)*

### Task Info:
Task: ${taskTitle}
Questions: ${questionsText}

RULES:
1. Act as a strict but fair IELTS examiner.
2. Follow IELTS public band descriptors.
3. For each of the 4 criteria (FC, LR, GRA, P), provide BOTH a band score AND a detailed comment.
4. Identify specific mistakes. Provide: original text, suggestion, explanation, and which criterion.
5. Return ONLY pure JSON with camelCase field names.

JSON OUTPUT FORMAT:
{
  "fluencyAndCoherence": { "score": 6.5, "comment": "..." },
  "lexicalResource": { "score": 6.0, "comment": "..." },
  "grammaticalRangeAndAccuracy": { "score": 5.5, "comment": "..." },
  "pronunciation": { "score": 7.0, "comment": "..." },
  "generalFeedback": "...",
  "detailedCorrections": [
    {
      "original": "string",
      "suggestion": "string",
      "explanation": "string",
      "criterion": "FC | LR | GRA | P"
    }
  ]
}
`;
}

export interface SpeakingGradingResult {
  fluencyAndCoherence: { score: number; comment: string };
  lexicalResource: { score: number; comment: string };
  grammaticalRangeAndAccuracy: { score: number; comment: string };
  pronunciation: { score: number; comment: string };
  generalFeedback: string;
  detailedCorrections: Array<{
    original: string;
    suggestion: string;
    explanation: string;
    criterion: 'FC' | 'LR' | 'GRA' | 'P';
  }>;
}
