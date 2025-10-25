import { PrismaClient, Level, Grammar } from '@prisma/client';

const prisma = new PrismaClient();

// ID của Admin user dùng để gán 'assignedBy'
const ADMIN_ASSIGNER_ID = '731328db-1b94-4f4e-acde-7a013a965a38';

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
      // ===== 3 BÀI HỌC THÊM VÀO (RẤT QUAN TRỌNG) =====
      {
        title: 'Present Perfect vs. Simple Past',
        explanation:
          'Simple Past is for finished actions at a specific time. Present Perfect is for unfinished actions or finished actions with a present result (time is not specified).',
        level: Level.Mid,
        examples: JSON.stringify([
          {
            sentence: 'I lived in Japan for 5 years.',
            note: 'Simple Past (I don-t live there now)',
          },
          {
            sentence: 'I have lived in Vietnam for 5 years.',
            note: 'Present Perfect (I still live here)',
          },
          {
            sentence: 'I have lost my keys.',
            note: 'Present Perfect (Result: I can-t get in now)',
          },
        ]),
        commonMistakes: JSON.stringify([
          {
            wrong: 'I have seen that movie yesterday.',
            right: 'I saw that movie yesterday.',
          },
        ]),
        order: 5,
      },
      {
        title: 'Past Perfect',
        explanation:
          'Used to describe an action that happened *before* another action in the past. (The "past of the past").',
        level: Level.High,
        examples: JSON.stringify([
          {
            sentence: 'When I arrived, the train had already left.',
            note: '1st action: train left. 2nd action: I arrived.',
          },
          {
            sentence: 'She told me she had finished her homework.',
            note: '1st action: finish homework. 2nd action: she told me.',
          },
        ]),
        commonMistakes: JSON.stringify([
          {
            wrong: 'When I arrived, the train left.',
            right: 'When I arrived, the train had left.',
          },
        ]),
        order: 6,
      },
      {
        title: 'Future Tenses (will vs. be going to)',
        explanation:
          '"Will" is for predictions or spontaneous decisions. "Be going to" is for plans or intentions made before speaking.',
        level: Level.Low,
        examples: JSON.stringify([
          {
            sentence: 'I think it will rain tomorrow.',
            note: 'Prediction',
          },
          {
            sentence: 'I am going to visit my aunt next weekend.',
            note: 'Plan',
          },
          {
            sentence: 'Oh no, I spilled the milk. I-ll clean it up.',
            note: 'Spontaneous decision',
          },
        ]),
        commonMistakes: JSON.stringify([
          {
            wrong: 'I will travel to Da Nang next month. (if it-s a plan)',
            right: 'I am going to travel to Da Nang next month.',
          },
        ]),
        order: 7,
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
      {
        title: 'Third Conditional',
        explanation:
          'Used for unreal situations in the past. Structure: If + Past Perfect, ... would have + Past Participle.',
        level: Level.High,
        examples: JSON.stringify([
          {
            sentence: 'If I had studied, I would have passed the exam.',
            note: 'Past regret',
          },
        ]),
        commonMistakes: JSON.stringify([
          {
            wrong: 'If I would have studied, I passed.',
            right: 'If I had studied, I would have passed.',
          },
        ]),
        order: 3,
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
  // ========================================================
  // ===== 4 DANH MỤC MỚI CỰC KỲ QUAN TRỌNG CHO IELTS =====
  // ========================================================

  // ==========================
  // ===== 8. (MỚI) SENTENCE STRUCTURE (Cấu trúc câu) =====
  // ==========================
  {
    category: {
      name: 'Sentence Structure',
      description:
        'Learn to build complex sentences using clauses and conjunctions for a higher grammar score.',
    },
    lessons: [
      {
        title: 'Relative Clauses (Defining vs. Non-defining)',
        explanation:
          'Clauses that start with "who, which, that, whose, where" to describe a noun. Defining clauses are essential; Non-defining add extra info (using commas).',
        level: Level.Mid,
        examples: JSON.stringify([
          {
            sentence: 'The man who lives next door is a doctor.',
            note: 'Defining (essential info)',
          },
          {
            sentence: 'My brother, who lives in London, is a doctor.',
            note: 'Non-defining (extra info, with commas)',
          },
        ]),
        commonMistakes: JSON.stringify([
          {
            wrong: 'My brother who lives in London is a doctor.',
            right: 'My brother, who lives in London, is a doctor.',
          },
          {
            wrong: 'The book, that I am reading, is good.',
            right: 'The book that I am reading is good. (no commas for "that")',
          },
        ]),
        order: 1,
      },
      {
        title: 'Subordinating Conjunctions',
        explanation:
          'Words that connect a dependent (subordinate) clause to an independent clause. (e.g., although, because, while, when, if, unless).',
        level: Level.Mid,
        examples: JSON.stringify([
          {
            sentence: 'Although it was raining, we went for a walk.',
            note: 'Contrast',
          },
          {
            sentence: 'He passed the exam because he studied hard.',
            note: 'Cause/Reason',
          },
          {
            sentence: 'While I was cooking, my phone rang.',
            note: 'Time',
          },
        ]),
        commonMistakes: JSON.stringify([
          {
            wrong: 'Although it was raining. We went for a walk.',
            right: 'Although it was raining, we went for a walk.',
          },
        ]),
        order: 2,
      },
    ],
  },
  // ==========================
  // ===== 9. (MỚI) PASSIVE VOICE (Thể Bị động) =====
  // ==========================
  {
    category: {
      name: 'Passive Voice',
      description:
        'Learn to use the passive voice (be + past participle) when the action is more important than the doer. Essential for academic writing.',
    },
    lessons: [
      {
        title: 'Forming the Passive Voice',
        explanation:
          'Used when the subject is unknown or unimportant. Structure: Subject + [form of "to be"] + [Past Participle].',
        level: Level.Mid,
        examples: JSON.stringify([
          {
            sentence:
              'The report was written by the manager. (Active: The manager wrote the report)',
            note: 'Simple Past Passive',
          },
          {
            sentence: 'The data is collected every year.',
            note: 'Simple Present Passive (Used in Task 1)',
          },
          {
            sentence: 'The problem will be solved soon.',
            note: 'Future Passive',
          },
        ]),
        commonMistakes: JSON.stringify([
          {
            wrong: 'The report written by the manager.',
            right: 'The report was written by the manager.',
          },
        ]),
        order: 1,
      },
    ],
  },
  // ==========================
  // ===== 10. (MỚI) REPORTED SPEECH (Câu tường thuật) =====
  // ==========================
  {
    category: {
      name: 'Reported Speech',
      description:
        'Learn how to report what someone else said, often by "shifting" the tenses back.',
    },
    lessons: [
      {
        title: 'Reported Statements (Tense Backshift)',
        explanation:
          'When reporting what someone said in the past, the verb tense often shifts one step back (e.g., Present -> Past, Past -> Past Perfect).',
        level: Level.High,
        examples: JSON.stringify([
          {
            sentence:
              'Direct: "I am hungry." -> Reported: He said (that) he was hungry.',
            note: 'Present -> Past',
          },
          {
            sentence:
              'Direct: "I finished the test." -> Reported: She said she had finished the test.',
            note: 'Past -> Past Perfect',
          },
        ]),
        commonMistakes: JSON.stringify([
          {
            wrong: 'He said he is hungry.',
            right: 'He said he was hungry.',
          },
        ]),
        order: 1,
      },
    ],
  },
  // ==========================
  // ===== 11. (MỚI) QUANTIFIERS (Lượng từ) =====
  // ==========================
  {
    category: {
      name: 'Quantifiers (Countable/Uncountable)',
      description:
        'Learn to use words that describe quantity (some, any, much, many, few, little).',
    },
    lessons: [
      {
        title: 'much/many vs. (a) few / (a) little',
        explanation:
          '"Many" & "(a) few" are for countable nouns. "Much" & "(a) little" are for uncountable nouns. "A few/A little" = some. "Few/Little" = almost none.',
        level: Level.Mid,
        examples: JSON.stringify([
          {
            sentence: 'There are many students in the class.',
            note: 'Countable',
          },
          {
            sentence: 'I don-t have much time.',
            note: 'Uncountable',
          },
          {
            sentence: 'I have a few apples. (some apples)',
            note: 'Countable, positive',
          },
          {
            sentence: 'I have few apples. (almost no apples)',
            note: 'Countable, negative',
          },
          {
            sentence: 'There is a little milk left.',
            note: 'Uncountable, positive',
          },
        ]),
        commonMistakes: JSON.stringify([
          {
            wrong: 'I don-t have many money.',
            right: 'I don-t have much money.',
          },
        ]),
        order: 1,
      },
    ],
  },
];

async function main() {
  console.log('🌱 Start RE-SEEDING system-level grammar...');

  // --- PHẦN MỚI: DỌN DẸP TRIỆT ĐỂ ---
  // BƯỚC 1: Xóa tất cả các *liên kết* N-N (GrammarsOnCategories)
  console.log('🗑️ Deleting ALL old links (GrammarsOnCategories)...');
  await prisma.grammarsOnCategories.deleteMany({});

  // BƯỚC 2: Xóa tất cả các *Bài học* (Grammar)
  console.log('🗑️ Deleting ALL old Grammar lesson records...');
  await prisma.grammar.deleteMany({});

  // BƯỚC 3: Xóa tất cả *Danh mục* của hệ thống (idUser: null)
  console.log('🗑️ Deleting ALL old system GrammarCategory records...');
  await prisma.grammarCategory.deleteMany({
    where: { idUser: null },
  });
  // --- KẾT THÚC PHẦN DỌN DẸP ---

  console.log('🌱 Seeding new grammar (24 lessons across 11 categories)...');

  for (const item of grammarData) {
    // 2. Tạo Category (cho hệ thống, idUser: null)
    const category = await prisma.grammarCategory.create({
      data: {
        name: item.category.name,
        description: item.category.description,
        idUser: null, // Quan trọng: Đây là data hệ thống
      },
    });
    console.log(`📚 Created category: ${category.name}`);

    // Khai báo rõ kiểu cho mảng
    const createdLessons: Grammar[] = [];

    // 3. Tạo tất cả bài học (Grammar)
    for (const lessonData of item.lessons) {
      const newLesson = await prisma.grammar.create({
        data: {
          title: lessonData.title,
          explanation: lessonData.explanation,
          level: lessonData.level,
          examples: lessonData.examples,
          commonMistakes: lessonData.commonMistakes,
          order: lessonData.order,
        },
      });
      createdLessons.push(newLesson);
    }
    console.log(
      `✏️ Created ${createdLessons.length} lessons for ${category.name}.`,
    );

    // 4. Tạo liên kết trong bảng GrammarsOnCategories
    await prisma.grammarsOnCategories.createMany({
      data: createdLessons.map((lesson) => ({
        idGrammarCategory: category.idGrammarCategory,
        idGrammar: lesson.idGrammar,
        assignedBy: ADMIN_ASSIGNER_ID, // Admin user ID
      })),
    });
    console.log(
      `🔗 Linked ${createdLessons.length} lessons to ${category.name}.`,
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
