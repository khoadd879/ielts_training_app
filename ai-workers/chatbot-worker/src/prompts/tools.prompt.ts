export const IELTS_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'search_reading',
      description: 'Search IELTS Reading practice content by query. Use this when user asks about reading techniques, questions types (True/False/Not Given, Multiple Choice, etc.), or reading passages.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query for reading content (e.g., "True False Not Given tips", "reading passage about science")'
          }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'search_listening',
      description: 'Search IELTS Listening practice content by query. Use this when user asks about listening test strategies, audio transcripts, or listening question types.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query for listening content'
          }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'search_speaking',
      description: 'Search IELTS Speaking practice content by query. Use this when user asks about speaking topics, cue cards, model answers, pronunciation, or speaking part 1/2/3.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query for speaking content'
          }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'search_writing',
      description: 'Search IELTS Writing practice content by query. Use this when user asks about writing task 1 or task 2, essay structures, sample answers, or writing tips.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query for writing content'
          }
        },
        required: ['query']
      }
    }
  }
];

export const TOOL_FUNCTIONS = {
  search_reading: 'search_reading',
  search_listening: 'search_listening',
  search_speaking: 'search_speaking',
  search_writing: 'search_writing'
};
