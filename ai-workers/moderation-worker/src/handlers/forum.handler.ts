import { ai } from '../gemini.client';
import { prisma } from '../db.client';
import { buildGeminiPrompt, cleanGeminiResponse, clamp } from '../forum.util';

interface ModerationForumMessage {
  postId: string;
  userId: string;
  content: string;
  threadTitle: string;
  hasAttachment: boolean;
  enqueuedAt: string;
}

export async function handleModerationForum(payload: ModerationForumMessage): Promise<void> {
  const prompt = buildGeminiPrompt(payload.content, payload.threadTitle, payload.hasAttachment);
  const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
  const raw = response.text?.trim() ?? '';
  const cleaned = cleanGeminiResponse(raw);

  let parsed: { score?: number; reasons?: string[]; explanation?: string; confidence?: number };
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    console.error('Gemini returned invalid JSON:', err, cleaned);
    throw new Error('invalid_gemini_json');
  }

  const score = clamp(Math.round(parsed.score ?? 50), 0, 100);
  const status = score >= 70 ? 'APPROVED' : score >= 40 ? 'NEEDS_REVIEW' : 'REJECTED';

  await prisma.forumPost.update({
    where: { idForumPost: payload.postId },
    data: {
      moderationStatus: status,
      moderationScore: score,
      moderationMeta: parsed,
    },
  });
}
