// seed-grammar-topics.js
// Sources:
//   - British Council: https://www.britishcouncil.org/exam-ielts/prepare-your-ielts/grammar (6 topics)
//   - IELTS Liz: https://ieltsliz.com/ielts-grammar/ (4 topics)
// Crawled: 2026-05-21
// Total topics: 10

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const GRAMMAR_TOPICS = [
  // From British Council (6 topics)
  {
    title: 'Adding a Clause - Complex Sentences',
    explanation: 'The tutorial shows how to improve IELTS Task 2 scores by turning a simple sentence into a complex one using a clause. Demonstrating a range of grammar, including the ability to use clauses, helps achieve a good score.',
    level: 'Mid',
    commonMistakes: JSON.stringify(['Writing only short, simple sentences', 'Failing to link ideas with subordinating words (because, which, when)']),
    examples: JSON.stringify(['Adding a clause to a sentence to form complex sentence structure', 'Using relative clauses, participle clauses, and dependent clauses']),
    order: 1
  },
  {
    title: 'Gerund Noun Phrases',
    explanation: 'A gerund (-ing form) functioning as a noun is always grammatically singular, even when describing plural concepts. "Building wider roads" is a gerund noun phrase and always singular.',
    level: 'Low',
    commonMistakes: JSON.stringify(['Treating gerund noun phrases as plural', 'Using plural verb with gerund subject: "Building wider roads solves" vs "Building wider roads solve"']),
    examples: JSON.stringify(['Building wider roads solves traffic congestion', 'The noun is "building wider roads"']),
    order: 2
  },
  {
    title: 'Relative Clauses - Which vs That',
    explanation: 'Use "which" for non-restrictive clauses (with commas) and "that" for restrictive ones (no commas). Both introduce dependent clauses.',
    level: 'Mid',
    commonMistakes: JSON.stringify(['Interchanging them incorrectly', 'Omitting commas for non-restrictive clauses', 'Using "that" after commas']),
    examples: JSON.stringify(['The book, which I read, was interesting', 'The book that I bought was expensive']),
    order: 3
  },
  {
    title: 'In Which Usage',
    explanation: 'When the relative pronoun follows a preposition-linked noun (situation, case, way), "in which" is preferred over plain "which" in formal writing.',
    level: 'Mid',
    commonMistakes: JSON.stringify(['Using "which" without required preposition', 'Placing preposition at end of clause']),
    examples: JSON.stringify(['The situation in which the error occurred', 'A case in which this applies']),
    order: 4
  },
  {
    title: 'Past Tense - Find vs Found',
    explanation: '"Found" is the simple past tense of "find" meaning discovered. "Founded" means established. "Found" is NOT the past of find in the "established" sense.',
    level: 'Low',
    commonMistakes: JSON.stringify(['Confusing find/found (discovered) with found (established)', 'I founded the website (established) vs I found the website (discovered)']),
    examples: JSON.stringify(['I found the error in the code', 'The company was founded in 2020']),
    order: 5
  },
  {
    title: 'Spelling and Word Choice',
    explanation: 'Even small spelling errors undermine the impression of grammatical competence. Common issues: homophones (their/there/they\'re), typos, and vocabulary in context.',
    level: 'Low',
    commonMistakes: JSON.stringify(['there/their/they\'re', 'your/you\'re', 'affect/effect', 'practice/practise']),
    examples: JSON.stringify(['Your writing affects your score', 'Their argument is compelling']),
    order: 6
  },
  // From IELTS Liz (4 topics)
  {
    title: 'Subject-Verb Agreement with Gerunds',
    explanation: 'A gerund noun phrase acts as a singular subject, requiring singular verb conjugation regardless of what it describes within the phrase.',
    level: 'Low',
    commonMistakes: JSON.stringify(['Using plural verb with gerund subject', 'Treating "building wider roads" as plural']),
    examples: JSON.stringify(['Building wider roads solves traffic congestion', 'Swimming is good exercise']),
    order: 7
  },
  {
    title: 'Relative Clauses Overview',
    explanation: 'Relative clauses provide additional information about a noun. Use who/whom for people, which for things, whose for possession, that for defining clauses.',
    level: 'Mid',
    commonMistakes: JSON.stringify(['Using that for non-restrictive clauses', 'Missing commas for non-restrictive clauses', 'Whom in spoken English often replaced by who']),
    examples: JSON.stringify(['The student who submitted early', 'The report, which was thorough, received praise']),
    order: 8
  },
  {
    title: 'Conditionals Overview',
    explanation: 'Type 1 (real present/future), Type 2 (unreal present/future), Type 3 (unreal past). Each has specific time reference and verb forms.',
    level: 'Mid',
    commonMistakes: JSON.stringify(['Mixing up would/if in Type 2', 'Using past perfect incorrectly in Type 3']),
    examples: JSON.stringify(['If I study, I will pass', 'If I had studied, I would have passed']),
    order: 9
  },
  {
    title: 'Passive Voice in IELTS Writing',
    explanation: 'Passive voice is used when the action is more important than the subject. Form: be + past participle. Useful for process descriptions and formal academic writing.',
    level: 'Mid',
    commonMistakes: JSON.stringify(['Using wrong tense of be', 'Missing past participle', 'Active/passive mixing within sentence']),
    examples: JSON.stringify(['The report was written by the team', 'The vaccine was developed rapidly']),
    order: 10
  }
];

async function seedGrammar() {
  console.log('=== Seeding Grammar Topics ===\n');
  console.log(`Total topics: ${GRAMMAR_TOPICS.length}\n`);

  let inserted = 0;
  let existing = 0;

  for (const topic of GRAMMAR_TOPICS) {
    try {
      const exists = await prisma.grammar.findFirst({
        where: { title: topic.title }
      });

      if (exists) {
        existing++;
        console.log(`Exists: ${topic.title}`);
        continue;
      }

      await prisma.grammar.create({
        data: {
          title: topic.title,
          explanation: topic.explanation,
          level: topic.level,
          commonMistakes: topic.commonMistakes,
          examples: topic.examples,
          order: topic.order
        }
      });
      inserted++;
      console.log(`Inserted: ${topic.title}`);
    } catch (err) {
      console.error(`Error: ${topic.title}: ${err.message}`);
    }
  }

  console.log(`\n=== Done! Inserted: ${inserted}, Existing: ${existing} ===`);
  await prisma.$disconnect();
}

seedGrammar().catch(console.error);