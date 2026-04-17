import { Channel } from 'amqplib';
import { ChatbotAskMessage, EXCHANGES, ROUTING_KEYS } from '@ai-workers/shared/types/messages';
import { publishMessage } from '@ai-workers/shared/config/rabbitmq';
import { createGroqService } from '../services/groq.service';
import { createSupabaseService } from '../services/supabase.service';
import { buildRagSystemPrompt, formatConversationHistory } from '../prompts/rag.prompt';

const RETRY_CONFIG = {
  maxRetries: 3,
  backoffMs: [1000, 2000, 4000],
};

export async function processChatbotAsk(
  msg: ChatbotAskMessage,
  channel: Channel,
): Promise<void> {
  const groq = createGroqService();
  const supabase = createSupabaseService();

  let lastError: unknown;

  for (let attempt = 0; attempt < RETRY_CONFIG.maxRetries; attempt++) {
    try {
      // Step 1: Generate embedding for user message
      const embedding = await groq.createEmbedding(msg.message);

      // Step 2: Query Supabase pgvector for relevant context
      const contexts = await supabase.searchDocuments(embedding, 0.7, 5);

      // Step 3: Build RAG prompt
      const systemPrompt = buildRagSystemPrompt(contexts);
      const historyText = formatConversationHistory(msg.conversationHistory);

      // Step 4: Build messages array for Groq
      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'system', content: systemPrompt },
      ];

      // Add conversation history
      if (historyText) {
        messages.push({ role: 'user', content: historyText });
      }

      // Add current message
      messages.push({ role: 'user', content: msg.message });

      // Step 5: Call Groq LLM
      const reply = await groq.chatcompletion(messages);

      // Step 6: Publish reply to callback queue
      await publishMessage(channel, EXCHANGES.CHATBOT, ROUTING_KEYS.REPLY, {
        sessionId: msg.sessionId,
        userId: msg.userId,
        reply,
      });

      console.log(`✅ Chatbot reply published for session: ${msg.sessionId}`);
      return;
    } catch (error) {
      lastError = error;
      console.error(`Chatbot attempt ${attempt + 1} failed:`, error);

      if (attempt < RETRY_CONFIG.maxRetries - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_CONFIG.backoffMs[attempt]),
        );
      }
    }
  }

  // All retries failed - publish error reply
  await publishMessage(channel, EXCHANGES.CHATBOT, ROUTING_KEYS.REPLY, {
    sessionId: msg.sessionId,
    userId: msg.userId,
    reply: 'I apologize, but I encountered an error processing your message. Please try again.',
    error: lastError instanceof Error ? lastError.message : String(lastError),
  });

  throw lastError;
}
