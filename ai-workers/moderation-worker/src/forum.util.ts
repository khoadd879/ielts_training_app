export function buildGeminiPrompt(content: string, threadTitle: string, hasAttachment: boolean): string {
  return `You are a forum moderator. Rate the following post for appropriateness on a scale 0-100.

Thread: ${threadTitle}
Post: ${content}
Has attachment: ${hasAttachment ? 'yes' : 'no'}

Respond in JSON only:
{
  "score": <0-100 integer>,
  "confidence": <0-1 float>,
  "explanation": "<one sentence>",
  "reasons": ["reason1", ...],
  "suggested_edits": ["edit1", ...]
}`;
}

export function cleanGeminiResponse(raw: string): string {
  return raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
