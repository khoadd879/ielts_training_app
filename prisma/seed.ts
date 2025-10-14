import { PrismaClient, Level } from '@prisma/client';

const prisma = new PrismaClient();

const grammarData = [
  // ==========================
  // ===== 1. TENSES (Các thì) =====
  // ==========================
  {
    category: {
      name: 'Tenses',
      description:
        'Learn about all the English verb tenses, from simple to perfect continuous.',
    },
    lessons: [
      {
        title: 'Simple Present',
        explanation:
          'The simple present is used to describe habits, unchanging situations, general truths, and fixed arrangements.',
        level: Level.Low,
        examples: JSON.stringify([
          { sentence: 'The sun rises in the east.', note: 'General truth' },
          { sentence: 'I play football every weekend.', note: 'Habit' },
        ]),
        commonMistakes: JSON.stringify([
          { wrong: "He don't like fish.", right: "He doesn't like fish." },
        ]),
        order: 1,
      },
      {
        title: 'Present Continuous',
        explanation:
          'The present continuous is used for actions happening at the moment of speaking or for temporary actions.',
        level: Level.Low,
        examples: JSON.stringify([
          {
            sentence: 'I am studying for my exam right now.',
            note: 'Action in progress',
          },
          {
            sentence: 'She is working in London this month.',
            note: 'Temporary situation',
          },
        ]),
        commonMistakes: JSON.stringify([
          { wrong: 'I am knowing the answer.', right: 'I know the answer.' },
        ]),
        order: 2,
      },
      {
        title: 'Simple Past',
        explanation:
          'The simple past is used to talk about a completed action in a time before now.',
        level: Level.Low,
        examples: JSON.stringify([
          {
            sentence: 'I visited my grandparents last week.',
            note: 'Completed action',
          },
          {
            sentence: 'He finished his homework an hour ago.',
            note: 'Finished event',
          },
        ]),
        commonMistakes: JSON.stringify([
          {
            wrong: 'I did not went to the party.',
            right: 'I did not go to the party.',
          },
        ]),
        order: 3,
      },
      {
        title: 'Past Continuous',
        explanation:
          'The past continuous is used to describe a past action that was in progress when another action interrupted it.',
        level: Level.Mid,
        examples: JSON.stringify([
          {
            sentence: 'I was watching TV when you called.',
            note: 'Interrupted action',
          },
          {
            sentence: 'They were playing tennis at 10 AM yesterday.',
            note: 'Action at a specific time in the past',
          },
        ]),
        commonMistakes: JSON.stringify([
          {
            wrong: 'When you called, I watch TV.',
            right: 'When you called, I was watching TV.',
          },
        ]),
        order: 4,
      },
    ],
  },
  // ==========================
  // ===== 2. ARTICLES (Mạo từ) =====
  // ==========================
  {
    category: {
      name: 'Articles',
      description:
        'Understand how to use indefinite (a/an) and definite (the) articles correctly.',
    },
    lessons: [
      {
        title: 'Indefinite Articles: A/An',
        explanation:
          'Use "a" before words that start with a consonant sound and "an" before words that start with a vowel sound. They are used for non-specific nouns.',
        level: Level.Low,
        examples: JSON.stringify([
          {
            sentence: 'I saw a cat in the garden.',
            note: 'A non-specific cat',
          },
          {
            sentence: 'She wants to eat an apple.',
            note: 'A non-specific apple',
          },
        ]),
        commonMistakes: JSON.stringify([
          {
            wrong: 'I need a hour to finish.',
            right: 'I need an hour to finish.',
          },
        ]),
        order: 1,
      },
      {
        title: 'Definite Article: The',
        explanation:
          'Use "the" when talking about a specific noun that both the speaker and listener know about.',
        level: Level.Low,
        examples: JSON.stringify([
          {
            sentence: 'The cat I saw yesterday was black.',
            note: 'A specific cat',
          },
          {
            sentence: 'The moon is very bright tonight.',
            note: 'A unique object',
          },
        ]),
        commonMistakes: JSON.stringify([
          {
            wrong: 'I love the music in general.',
            right: 'I love music.',
          },
        ]),
        order: 2,
      },
    ],
  },
  // ==========================
  // ===== 3. PREPOSITIONS (Giới từ) =====
  // ==========================
  {
    category: {
      name: 'Prepositions',
      description: 'Learn about prepositions of time, place, and movement.',
    },
    lessons: [
      {
        title: 'Prepositions of Time: in, on, at',
        explanation:
          'Use "in" for months, years, seasons. Use "on" for days and dates. Use "at" for specific times.',
        level: Level.Low,
        examples: JSON.stringify([
          { sentence: 'My birthday is in October.', note: 'Month' },
          { sentence: 'The meeting is on Monday.', note: 'Day' },
          { sentence: 'The class starts at 9 AM.', note: 'Specific time' },
        ]),
        commonMistakes: JSON.stringify([
          {
            wrong: 'I will see you on October.',
            right: 'I will see you in October.',
          },
        ]),
        order: 1,
      },
      {
        title: 'Prepositions of Place: in, on, at',
        explanation:
          'Use "in" for enclosed spaces or areas. Use "on" for surfaces. Use "at" for specific points or locations.',
        level: Level.Low,
        examples: JSON.stringify([
          { sentence: 'The cat is in the box.', note: 'Enclosed space' },
          { sentence: 'The book is on the table.', note: 'Surface' },
          {
            sentence: 'I will meet you at the bus stop.',
            note: 'Specific point',
          },
        ]),
        commonMistakes: JSON.stringify([
          { wrong: 'She is at the car.', right: 'She is in the car.' },
        ]),
        order: 2,
      },
    ],
  },
  // ==========================
  // ===== 4. MODAL VERBS (Động từ khiếm khuyết) =====
  // ==========================
  {
    category: {
      name: 'Modal Verbs',
      description:
        'Verbs that express necessity, possibility, permission, or ability.',
    },
    lessons: [
      {
        title: 'Modals of Ability: can / could',
        explanation:
          '"Can" is used for ability in the present. "Could" is used for ability in the past.',
        level: Level.Low,
        examples: JSON.stringify([
          { sentence: 'I can speak three languages.', note: 'Present ability' },
          {
            sentence: 'She could swim when she was five.',
            note: 'Past ability',
          },
        ]),
        commonMistakes: JSON.stringify([
          { wrong: 'I can to play guitar.', right: 'I can play guitar.' },
        ]),
        order: 1,
      },
      {
        title: 'Modals of Obligation: must / have to',
        explanation:
          '"Must" expresses a strong obligation, often from the speaker. "Have to" expresses an external obligation or rule.',
        level: Level.Mid,
        examples: JSON.stringify([
          {
            sentence: 'You must finish your report by Friday.',
            note: 'Strong obligation',
          },
          {
            sentence: 'I have to wear a uniform at work.',
            note: 'External rule',
          },
        ]),
        commonMistakes: JSON.stringify([
          {
            wrong: 'She must to study harder.',
            right: 'She must study harder.',
          },
        ]),
        order: 2,
      },
    ],
  },
  // ==========================
  // ===== 5. ADJECTIVES & ADVERBS (Tính từ & Trạng từ) =====
  // ==========================
  {
    category: {
      name: 'Adjectives & Adverbs',
      description:
        'Learn the difference between words that describe nouns and words that describe verbs.',
    },
    lessons: [
      {
        title: 'Comparative and Superlative Adjectives',
        explanation:
          'Comparatives (-er, more) compare two things. Superlatives (-est, most) compare three or more things.',
        level: Level.Low,
        examples: JSON.stringify([
          { sentence: 'She is taller than her brother.', note: 'Comparative' },
          {
            sentence: 'Mount Everest is the highest mountain in the world.',
            note: 'Superlative',
          },
          {
            sentence: 'This book is more interesting than the last one.',
            note: 'Comparative with long adjective',
          },
        ]),
        commonMistakes: JSON.stringify([
          {
            wrong: 'This is the most biggest house.',
            right: 'This is the biggest house.',
          },
          { wrong: 'He is more tall than me.', right: 'He is taller than me.' },
        ]),
        order: 1,
      },
    ],
  },
  // ==========================
  // ===== 6. CONDITIONALS (Câu điều kiện) =====
  // ==========================
  {
    category: {
      name: 'Conditionals (If Clauses)',
      description:
        'Sentences expressing hypothetical situations and their consequences.',
    },
    lessons: [
      {
        title: 'First Conditional',
        explanation:
          'Used for real possibilities in the future. Structure: If + Simple Present, ... will + base verb.',
        level: Level.Mid,
        examples: JSON.stringify([
          {
            sentence: 'If it rains tomorrow, we will stay at home.',
            note: 'Real future possibility',
          },
          {
            sentence: 'If you study hard, you will pass the exam.',
            note: 'Cause and effect',
          },
        ]),
        commonMistakes: JSON.stringify([
          {
            wrong: 'If it will rain, we stay home.',
            right: 'If it rains, we will stay home.',
          },
        ]),
        order: 1,
      },
      {
        title: 'Second Conditional',
        explanation:
          'Used for unreal or hypothetical situations in the present or future. Structure: If + Simple Past, ... would + base verb.',
        level: Level.Mid,
        examples: JSON.stringify([
          {
            sentence: 'If I won the lottery, I would travel the world.',
            note: 'Hypothetical situation',
          },
          {
            sentence: 'If I were you, I would take the job.',
            note: 'Giving advice',
          },
        ]),
        commonMistakes: JSON.stringify([
          {
            wrong: 'If I was you, I would go.',
            right: 'If I were you, I would go.',
          },
        ]),
        order: 2,
      },
    ],
  },
  // ==========================
  // ===== 7. GERUNDS & INFINITIVES (Danh động từ & Động từ nguyên mẫu) =====
  // ==========================
  {
    category: {
      name: 'Gerunds vs. Infinitives',
      description:
        'Understanding when to use the -ing form (gerund) or the "to" form (infinitive) of a verb.',
    },
    lessons: [
      {
        title: 'Verbs Followed by Gerunds (-ing)',
        explanation:
          'Some verbs must be followed by a gerund. Common examples include: enjoy, avoid, finish, suggest, mind, and practice.',
        level: Level.Mid,
        examples: JSON.stringify([
          {
            sentence: 'I enjoy listening to music.',
            note: 'Verb "enjoy"',
          },
          {
            sentence: 'He finished doing his homework.',
            note: 'Verb "finish"',
          },
        ]),
        commonMistakes: JSON.stringify([
          {
            wrong: 'I suggest to go to the park.',
            right: 'I suggest going to the park.',
          },
        ]),
        order: 1,
      },
      {
        title: 'Verbs Followed by Infinitives (to + verb)',
        explanation:
          'Some verbs must be followed by an infinitive. Common examples include: want, hope, decide, need, agree, and promise.',
        level: Level.Mid,
        examples: JSON.stringify([
          {
            sentence: 'She decided to move to a new city.',
            note: 'Verb "decide"',
          },
          {
            sentence: 'I need to buy some groceries.',
            note: 'Verb "need"',
          },
        ]),
        commonMistakes: JSON.stringify([
          {
            wrong: 'We agreed meeting at 8 PM.',
            right: 'We agreed to meet at 8 PM.',
          },
        ]),
        order: 2,
      },
    ],
  },
];

async function main() {
  console.log('🌱 Start seeding system-level grammar...');

  for (const item of grammarData) {
    let category;

    // 1. Tìm category trước
    const existingCategory = await prisma.grammarCategory.findFirst({
      where: {
        idUser: null,
        name: item.category.name,
      },
    });

    if (existingCategory) {
      // 2a. Nếu đã tồn tại, dùng nó
      category = existingCategory;
      console.log(`📚 Category "${category.name}" already exists.`);
    } else {
      // 2b. Nếu không, tạo mới
      category = await prisma.grammarCategory.create({
        data: {
          name: item.category.name,
          description: item.category.description,
          // idUser mặc định là null
        },
      });
      console.log(`📚 Created category: ${category.name}`);
    }

    // 3. Xóa các bài học cũ để đảm bảo dữ liệu luôn mới (tùy chọn)
    await prisma.grammar.deleteMany({
      where: { idGrammarCategory: category.idGrammarCategory },
    });

    // 4. Tạo mới tất cả bài học trong danh mục
    await prisma.grammar.createMany({
      data: item.lessons.map((lesson) => ({
        idGrammarCategory: category.idGrammarCategory,
        title: lesson.title,
        explanation: lesson.explanation,
        level: lesson.level,
        examples: lesson.examples,
        commonMistakes: lesson.commonMistakes,
        order: lesson.order,
      })),
    });
    console.log(
      `✏️ Created ${item.lessons.length} lessons for ${category.name}.`,
    );
  }

  console.log('✅ Seeding grammar completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
