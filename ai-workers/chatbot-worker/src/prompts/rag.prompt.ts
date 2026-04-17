export interface RagContext {
  content: string;
  metadata: {
    source: string;
    category: string;
  };
}

export function buildRagSystemPrompt(contexts: RagContext[]): string {
  const contextText = contexts
    .map((ctx, i) => `[${i + 1}] (${ctx.metadata.source}) ${ctx.content}`)
    .join('\n\n');

  return `You are IELTS Assistant AI.
Your role: help the user improve English for IELTS (Writing, Speaking, Vocabulary, etc.)

## Context from knowledge base:
${contextText || 'No relevant context found.'}

## Instructions:
- Respond in a natural, friendly tone.
- Be concise, educational, and clear.
- Use the provided context to give accurate IELTS-specific answers.
- Answer in English if the user asks in English.
- Answer in Vietnamese if the user asks in Vietnamese.
- Don't answer if the question is not related to IELTS or English learning.
- If the context doesn't contain enough information, say so honestly.`;
}

export function formatConversationHistory(
  history: Array<{ sender: 'user' | 'bot'; message: string }> | undefined,
): string {
  if (!history || history.length === 0) {
    return '';
  }

  return history
    .map((m) => `${m.sender === 'user' ? 'User' : 'Assistant'}: ${m.message}`)
    .join('\n');
}
