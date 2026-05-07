import { Channel } from 'amqplib';
import { ChatbotAskMessage, EXCHANGES, ROUTING_KEYS } from '@ai-workers/shared/types/messages';
import { publishMessage } from '@ai-workers/shared/config/rabbitmq';
import { createSupabaseService } from '../services/supabase.service';
import { buildRagSystemPrompt, formatConversationHistory, IELTS_TOOLS } from '../prompts/rag.prompt';
import { AIKeyPool, AIKeyConfig, PoolStats } from '@ai-workers/shared/config/ai-pool';
import { RateLimiter, AICache, ChatbotLimitService } from '@ai-workers/shared/config/rate-limiter';

const TOOL_ROUTER_MODEL = 'llama-3.1-8b-instant';
const CHAT_RESPONSE_MODEL = 'llama-3.3-70b-versatile';
const CHEAP_MODEL = 'llama-3.1-8b-instant';

const FREE_TIER_LIMIT = 10;

interface ToolCall {
  id?: string;
  function?: {
    name?: string;
    arguments?: string;
  };
}

interface AIPoolConfig {
  chatbotPool: AIKeyPool;
  rateLimiter: RateLimiter;
  cache: AICache;
  limitService: ChatbotLimitService;
}

let poolConfig: AIPoolConfig | null = null;

export function initializeAIPool(config: {
  redisUrl: string;
  apiKeys: { apiKey: string; name: string }[];
}): void {
  const { redisUrl, apiKeys } = config;

  const keyConfigs: AIKeyConfig[] = apiKeys.map(k => ({
    apiKey: k.apiKey,
    name: k.name,
    isDisabled: false,
    dailyQuotaUsed: 0,
    dailyQuotaLimit: 10000,
    lastResetAt: new Date(),
    consecutiveFailures: 0,
  }));

  const chatbotPool = new AIKeyPool({
    keys: keyConfigs,
    rateLimitWindowMs: 30000,
    rateLimitMaxRequests: 30,
    dailyQuotaLimit: 10000,
    healthCheckIntervalMs: 60000,
  });

  const rateLimiter = new RateLimiter(null);
  const cache = new AICache(null);
  const limitService = new ChatbotLimitService(rateLimiter, cache, chatbotPool, FREE_TIER_LIMIT);

  poolConfig = {
    chatbotPool,
    rateLimiter,
    cache,
    limitService,
  };

  console.log(`AI Pool initialized with ${apiKeys.length} keys`);
}

export async function processChatbotAskWithPool(
  msg: ChatbotAskMessage,
  channel: Channel,
): Promise<void> {
  if (!poolConfig) {
    throw new Error('AI Pool not initialized. Call initializeAIPool first.');
  }

  const { chatbotPool, cache, limitService } = poolConfig;
  const supabase = createSupabaseService();

  try {
    const accessResult = await limitService.checkUserAccess(msg.userId);

    if (!accessResult.canAccess) {
      await publishReply(channel, msg.sessionId, msg.userId,
        'Bạn đã hết lượt hỏi miễn phí hôm nay. Vui lòng nâng cấp để tiếp tục.');
      return;
    }

    const cachedResponse = await cache.get(msg.message);
    if (cachedResponse) {
      console.log(`Cache hit for query: "${msg.message.substring(0, 50)}..."`);
      await publishReply(channel, msg.sessionId, msg.userId, cachedResponse);
      return;
    }

    const groqResult = await chatbotPool.getGroqClient();
    if (!groqResult) {
      console.error('No healthy AI key available, using fallback');
      await publishReply(channel, msg.sessionId, msg.userId,
        'Hệ thống đang bận, vui lòng thử lại sau 1-2 phút.');
      return;
    }

    const { client: groq, key: activeKey } = groqResult;
    let reply = '';

    try {
      reply = await processWithAI(groq, supabase, msg, activeKey.name);

      await cache.set(msg.message, reply);
      await limitService.recordUsage(msg.userId, accessResult.isFreeTier);
      chatbotPool.recordSuccess(activeKey.name);

    } catch (error: any) {
      const errorMsg = error.message || '';
      if (errorMsg.includes('429') || errorMsg.includes('rate limit') || errorMsg.includes('TOO_MANY_REQUESTS')) {
        console.error(`Rate limit hit for key ${activeKey.name}`);
        chatbotPool.recordRateLimitError(activeKey.name);
        await tryFallbackOrRetry(groq, supabase, msg, channel, chatbotPool, cache, limitService, accessResult);
        return;
      }
      if (errorMsg.includes('quota') || errorMsg.includes('exhausted')) {
        console.error(`Quota exhausted for key ${activeKey.name}`);
        chatbotPool.recordQuotaExhausted(activeKey.name);
        await tryFallbackOrRetry(groq, supabase, msg, channel, chatbotPool, cache, limitService, accessResult);
        return;
      }
      throw error;
    }

    await publishReply(channel, msg.sessionId, msg.userId, reply);
    console.log(`✅ Chatbot reply published for session: ${msg.sessionId}`);

  } catch (error: any) {
    console.error('Chatbot processing error:', error);
    await publishReply(
      channel,
      msg.sessionId,
      msg.userId,
      'Xin lỗi, tôi gặp lỗi khi xử lý tin nhắn của bạn. Vui lòng thử lại.',
      error.message
    );
    throw error;
  }
}

async function tryFallbackOrRetry(
  groq: any,
  supabase: any,
  msg: ChatbotAskMessage,
  channel: Channel,
  chatbotPool: AIKeyPool,
  cache: AICache,
  limitService: ChatbotLimitService,
  accessResult: { isFreeTier: boolean }
): Promise<void> {
  const cachedResponse = await cache.get(msg.message);
  if (cachedResponse) {
    await publishReply(channel, msg.sessionId, msg.userId, cachedResponse);
    return;
  }

  const retryResult = await chatbotPool.getGroqClient();
  if (!retryResult) {
    await publishReply(channel, msg.sessionId, msg.userId,
      'Hệ thống đang bận, vui lòng thử lại sau 1-2 phút.');
    return;
  }

  try {
    const { client: retryGroq, key: retryKey } = retryResult;
    const reply = await processWithAI(retryGroq, supabase, msg, retryKey.name);
    await cache.set(msg.message, reply);
    await limitService.recordUsage(msg.userId, accessResult.isFreeTier);
    chatbotPool.recordSuccess(retryKey.name);
    await publishReply(channel, msg.sessionId, msg.userId, reply);
  } catch (retryError) {
    console.error('Fallback also failed:', retryError);
    const cachedResponse = await cache.get(msg.message);
    if (cachedResponse) {
      await publishReply(channel, msg.sessionId, msg.userId, cachedResponse);
    } else {
      await publishReply(channel, msg.sessionId, msg.userId,
        'Hệ thống đang bận, vui lòng thử lại sau 1-2 phút.');
    }
  }
}

async function processWithAI(
  groq: any,
  supabase: any,
  msg: ChatbotAskMessage,
  keyName: string
): Promise<string> {
  const systemPrompt = buildRagSystemPrompt();

  const messages: Array<{
    role: 'system' | 'user' | 'assistant' | 'tool';
    content?: string | null;
    name?: string;
    tool_call_id?: string;
    tool_calls?: any[];
  }> = [systemPrompt as any];

  const historyText = formatConversationHistory(msg.conversationHistory);
  if (historyText) {
    messages.push({ role: 'user', content: historyText });
  }

  messages.push({ role: 'user', content: msg.message });

  const initialResponse = await groq.chat.completions.create({
    model: TOOL_ROUTER_MODEL,
    messages: messages as any,
    tools: IELTS_TOOLS,
    tool_choice: 'auto',
  });

  const toolCalls = initialResponse.choices[0]?.message?.tool_calls || [];

  if (toolCalls.length === 0) {
    return initialResponse.choices[0]?.message?.content || '';
  }

  const toolResults = await Promise.all(
    toolCalls.map(async (toolCall: ToolCall) => {
      const { functionName, query } = parseToolCall(toolCall);

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

        return {
          tool_call_id: toolCall.id || `call_${functionName}`,
          role: 'tool' as const,
          name: functionName,
          content: formatToolResults(results)
        };
      } catch (error: any) {
        return {
          tool_call_id: toolCall.id || `call_${functionName}`,
          role: 'tool' as const,
          name: functionName,
          content: `Error: ${error.message}`
        };
      }
    })
  );

  messages.push(initialResponse.choices[0]?.message);
  messages.push(...toolResults);

  const finalResponse = await groq.chat.completions.create({
    model: CHAT_RESPONSE_MODEL,
    messages: messages as any,
  });

  return finalResponse.choices[0]?.message?.content || '';
}

function parseToolCall(toolCall: ToolCall): { functionName: string; query: string } {
  const functionName = toolCall.function?.name || '';
  const rawArguments = toolCall.function?.arguments;

  if (!rawArguments) {
    return { functionName, query: '' };
  }

  try {
    const parsedArguments = JSON.parse(rawArguments);
    return {
      functionName,
      query: typeof parsedArguments?.query === 'string' ? parsedArguments.query : '',
    };
  } catch (error) {
    return { functionName, query: '' };
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

export function getPoolStats(): PoolStats | null {
  if (!poolConfig) return null;
  return poolConfig.limitService.getPoolStats();
}

export function isPoolInitialized(): boolean {
  return poolConfig !== null;
}
