// Type declarations for @ai-workers/shared
declare module '@ai-workers/shared' {
  export * from './config/health';
  export * from './config/rabbitmq';
  export * from './types/messages';
}

declare module '@ai-workers/shared/config/health' {
  export function getHealthStatus(): any;
  export function setRabbitMQStatus(status: boolean): void;
}

declare module '@ai-workers/shared/config/rabbitmq' {
  export function setupRabbitMQ(url: string): Promise<{ conn: any; channel: any }>;
  export function publishMessage(channel: any, exchange: string, routingKey: string, message: any): Promise<void>;
}

declare module '@ai-workers/shared/types/messages' {
  export const EXCHANGES: {
    readonly GRADING: "grading.exchange";
    readonly CHATBOT: "chatbot.exchange";
  };

  export const QUEUES: {
    readonly GRADING_WRITE: "grading.write";
    readonly GRADING_SPEAK: "grading.speak";
    readonly CHATBOT_ASK: "chatbot.ask";
    readonly CHATBOT_EMBED: "chatbot.embed";
    readonly CHATBOT_REPLY: "chatbot.reply";
    readonly GRADING_FAILED: "grading.failed";
  };

  export const ROUTING_KEYS: {
    readonly WRITE: "grading.write";
    readonly SPEAK: "grading.speak";
    readonly ASK: "chatbot.ask";
    readonly EMBED: "chatbot.embed";
    readonly REPLY: "chatbot.reply";
    readonly FAILED: "grading.failed";
  };

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
    conversationHistory?: Array<{
      sender: 'user' | 'bot';
      message: string;
    }>;
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
}