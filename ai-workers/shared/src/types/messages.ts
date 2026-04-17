// Exchange names
export const EXCHANGES = {
  GRADING: 'grading.exchange',
  CHATBOT: 'chatbot.exchange',
} as const;

// Queues
export const QUEUES = {
  GRADING_WRITE: 'grading.write',
  GRADING_SPEAK: 'grading.speak',
  CHATBOT_ASK: 'chatbot.ask',
  CHATBOT_EMBED: 'chatbot.embed',
  CHATBOT_REPLY: 'chatbot.reply',
  GRADING_FAILED: 'grading.failed',
} as const;

// Routing keys
export const ROUTING_KEYS = {
  WRITE: 'grading.write',
  SPEAK: 'grading.speak',
  ASK: 'chatbot.ask',
  EMBED: 'chatbot.embed',
  REPLY: 'chatbot.reply',
  FAILED: 'grading.failed',
} as const;

// Message types
export interface GradingWriteMessage {
  submissionId: string;
  userId: string;
  type: 'Task1' | 'Task2';
  submissionText: string;
  prompt: string;
  imageUrl?: string;
}

export interface GradingSpeakMessage {
  submissionId: string;
  userId: string;
  audioUrl: string;
  transcript?: string;
  taskTitle: string;
  questionsText: string;
}

export interface ChatbotAskMessage {
  sessionId: string;
  userId: string;
  message: string;
  conversationHistory?: Array<{sender: 'user' | 'bot'; message: string}>;
}

export interface ChatbotEmbedMessage {
  documentId: string;
  content: string;
  metadata: {
    source: string;
    category: 'ielts_tips' | 'grammar' | 'vocabulary' | 'sample_answers';
    userId?: string;
  };
}

export interface ChatbotReplyMessage {
  sessionId: string;
  userId: string;
  reply: string;
}

export interface GradingFailedMessage {
  originalMessage: GradingWriteMessage | GradingSpeakMessage;
  error: string;
  failedAt: string;
}