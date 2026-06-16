const GRAMMAR_TOPICS_PROMPT = `
GRAMMAR TOPICS (detect errors in these categories):
| topicId | Topic Name |
|---------|------------|
| subject_verb | Subject-Verb Agreement |
| verb_tenses | Verb Tenses |
| articles | Articles |
| prepositions | Prepositions |
| conditionals | Conditionals |
| passive_voice | Passive Voice |
| relative_clauses | Relative Clauses |
| sentence_structure | Sentence Structure |
| word_forms | Word Forms |
| connectors | Connectors/Coherence |
`;

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

GRAMMAR TOPIC DETECTION:
${GRAMMAR_TOPICS_PROMPT}

JSON OUTPUT FORMAT:
{
  "fluencyAndCoherence": { "score": 6.5, "comment": "..." },
  "lexicalResource": { "score": 6.0, "comment": "..." },
  "grammaticalRangeAndAccuracy": { "score": 5.5, "comment": "..." },
  "pronunciation": { "score": 7.0, "comment": "..." },
  "grammarBand": 5.5,
  "grammarViolations": [
    {
      "topicId": "verb_tenses",
      "userSentence": "Yesterday I go to the market",
      "correctedSentence": "Yesterday I went to the market",
      "explanation": "Past tense required for completed past action"
    }
  ],
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

export interface GrammarViolation {
  topicId: string;
  userSentence: string;
  correctedSentence: string;
  explanation: string;
}

export interface SpeakingGradingResult {
  fluencyAndCoherence: { score: number; comment: string };
  lexicalResource: { score: number; comment: string };
  grammaticalRangeAndAccuracy: { score: number; comment: string };
  pronunciation: { score: number; comment: string };
  grammarBand?: number;
  grammarViolations?: GrammarViolation[];
  generalFeedback: string;
  detailedCorrections: Array<{
    original: string;
    suggestion: string;
    explanation: string;
    criterion: 'FC' | 'LR' | 'GRA' | 'P';
  }>;
}
