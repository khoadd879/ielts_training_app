import { Channel } from 'amqplib';
import { ChatbotAskMessage, EXCHANGES, ROUTING_KEYS } from '@ai-workers/shared/types/messages';
import { publishMessage } from '@ai-workers/shared/config/rabbitmq';
import { createGroqService } from '../services/groq.service';
import { createSupabaseService } from '../services/supabase.service';
import { buildRagSystemPrompt, formatConversationHistory, IELTS_TOOLS } from '../prompts/rag.prompt';

interface ToolCall {
  id?: string;
  name: string;
  arguments: { query: string };
}

export async function processChatbotAsk(
  msg: ChatbotAskMessage,
  channel: Channel,
): Promise<void> {
  const groq = createGroqService();
  const supabase = createSupabaseService();

  try {
    // Step 1: Get system prompt with tools
    const systemPrompt = buildRagSystemPrompt();

    // Step 2: Build messages array
    const messages: Array<{ role: 'system' | 'user' | 'assistant' | 'tool'; content: string; name?: string; tool_call_id?: string }> = [
      systemPrompt as any
    ];

    // Add conversation history
    const historyText = formatConversationHistory(msg.conversationHistory);
    if (historyText) {
      messages.push({ role: 'user', content: historyText });
    }

    // Add current message
    messages.push({ role: 'user', content: msg.message });

    // Step 3: First LLM call - detect which skills needed
    const initialResponse = await groq.chatcompletion(
      messages,
      'llama-3.3-70b-versatile',
      IELTS_TOOLS,
      'auto'
    );

    // Step 4: Check if LLM called any tools
    const toolCalls = initialResponse.choices[0]?.message?.tool_calls || [];

    if (toolCalls.length === 0) {
      // No tool calls - return direct response
      const reply = initialResponse.choices[0]?.message?.content || '';
      await publishReply(channel, msg.sessionId, msg.userId, reply);
      return;
    }

    // Step 5: Execute tool calls in parallel
    console.log(`🔧 Processing ${toolCalls.length} tool calls...`);

    const toolResults = await Promise.all(
      toolCalls.map(async (toolCall: ToolCall) => {
        const functionName = toolCall.name;
        const query = toolCall.arguments?.query || '';

        console.log(`  Calling ${functionName} with query: "${query}"`);

        try {
          let results: any[] = [];

          switch (functionName) {
            case 'search_reading':
              results = await supabase.searchReading(query);
              break;
            case 'search_listening':
              results = await supabase.searchListening(query);
              break;
            case 'search_speaking':
              results = await supabase.searchSpeaking(query);
              break;
            case 'search_writing':
              results = await supabase.searchWriting(query);
              break;
            default:
              console.error(`Unknown function: ${functionName}`);
          }

          console.log(`  ${functionName}: ${results.length} results`);

          return {
            tool_call_id: toolCall.id || `call_${functionName}`,
            role: 'tool' as const,
            name: functionName,
            content: formatToolResults(results)
          };
        } catch (error: any) {
          console.error(`  ${functionName} error:`, error.message);
          return {
            tool_call_id: toolCall.id || `call_${functionName}`,
            role: 'tool' as const,
            name: functionName,
            content: `Error: ${error.message}`
          };
        }
      })
    );

    // Step 6: Add tool results to messages
    messages.push(initialResponse.choices[0]?.message);
    messages.push(...toolResults);

    // Step 7: Second LLM call - generate final answer with tool results
    const finalResponse = await groq.chatcompletion(
      messages,
      'llama-3.3-70b-versatile'
    );

    const reply = finalResponse.choices[0]?.message?.content || '';

    // Step 8: Publish reply
    await publishReply(channel, msg.sessionId, msg.userId, reply);

    console.log(`✅ Chatbot reply published for session: ${msg.sessionId}`);

  } catch (error: any) {
    console.error('Chatbot processing error:', error);
    await publishReply(
      channel,
      msg.sessionId,
      msg.userId,
      'I apologize, but I encountered an error processing your message. Please try again.',
      error.message
    );
    throw error;
  }
}

function formatToolResults(results: any[]): string {
  if (results.length === 0) {
    return 'No relevant content found for this query.';
  }

  return results.map((r, i) => {
    const content = r.content || r.document || '';
    const source = r.metadata?.source || r.metadata?.file || 'unknown';
    return `[${i + 1}] Source: ${source}\n${content}`;
  }).join('\n\n');
}

async function publishReply(
  channel: Channel,
  sessionId: string,
  userId: string,
  reply: string,
  error?: string
): Promise<void> {
  await publishMessage(channel, EXCHANGES.CHATBOT, ROUTING_KEYS.REPLY, {
    sessionId,
    userId,
    reply,
    ...(error && { error })
  });
}