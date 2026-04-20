export const EXCHANGES = {
  GRADING: 'grading.exchange',
  CHATBOT: 'chatbot.exchange',
} as const;

export const QUEUES = {
  GRADING_WRITE: 'grading.write',
  GRADING_SPEAK: 'grading.speak',
  CHATBOT_ASK: 'chatbot.ask',
  CHATBOT_EMBED: 'chatbot.embed',
  CHATBOT_REPLY: 'chatbot.reply',
} as const;

export const ROUTING_KEYS = {
  WRITE: 'grading.write',
  SPEAK: 'grading.speak',
  ASK: 'chatbot.ask',
  EMBED: 'chatbot.embed',
  REPLY: 'chatbot.reply',
} as const;
