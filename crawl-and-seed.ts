/**
 * crawl-and-seed.ts
 * Crawls vocabulary (Tier 1: 3k high-freq, Tier 2: AWL 570) and grammar topics
 * then seeds into the PostgreSQL database via Prisma.
 *
 * Usage: npx ts-node crawl-and-seed.ts
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { PrismaClient, VocabType, Level } from '@prisma/client';
import { Prisma } from '@prisma/client';

const prisma = new PrismaClient();

function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function randomEnum<T extends string>(enumObj: Record<string, T>): T {
  const values = Object.values(enumObj).filter((v) => typeof v === 'string') as T[];
  return values[Math.floor(Math.random() * values.length)];
}

const VOCAB_TYPES: Record<string, string> = { NOUN: 'NOUN', VERB: 'VERB', ADJECTIVE: 'ADJECTIVE', ADVERB: 'ADVERB', PHRASE: 'PHRASE' };
const LEVELS: Record<string, string> = { Low: 'Low', Mid: 'Mid', High: 'High' };

async function ensureSystemUser(): Promise<string> {
  try {
    const systemUser = await prisma.user.findFirst({ where: { email: 'system@ielts-app.local' } });
    if (systemUser) return systemUser.idUser;
    const created = await prisma.user.create({
      data: {
        email: 'system@ielts-app.local', nameUser: 'System',
        password: 'SYSTEM_PLACEHOLDER', role: 'ADMIN', isActive: true,
        accountType: 'LOCAL', gender: 'Male',
      },
    });
    return created.idUser;
  } catch { return ''; }
}

async function crawlTier1Words(): Promise<Array<{ word: string; phonetic: string | null; meaning: string; frequencyRank: number }>> {
  console.log('[Tier 1] Fetching high-frequency word list...');
  const sources = [
    'https://raw.githubusercontent.com/ErikFry/WordList/master/words.txt',
  ];
  for (const url of sources) {
    try {
      const res = await axios.get(url, { timeout: 15000 });
      const lines = res.data.split('\n').map((l: string) => l.trim().toLowerCase()).filter(Boolean);
      const words = lines.slice(0, 3000).map((word: string, i: number) => ({
        word: word.replace(/[^a-z]/g, ''),
        phonetic: null as string | null,
        meaning: '',
        frequencyRank: i + 1,
      })).filter((w) => w.word.length > 1);
      console.log(`[Tier 1] Fetched ${words.length} words`);
      return words;
    } catch (err) {
      console.warn(`[Tier 1] Source failed: ${err}`);
    }
  }
  return getEmbeddedTier1Words();
}

function getEmbeddedTier1Words(): Array<{ word: string; phonetic: string | null; meaning: string; frequencyRank: number }> {
  const embeddedList = `the be to of and a in that have I it for not on with he as you do at this but his by from they we say her she or an will my one all would mar there their what so up out if about who get which go me when make can like time no just him know take people into year your good some could them see other was than come this now look only its over think also back after use two how our work first well way even new want because any these give day most do is were her we been many more an now out said each she which do their time some how its said each we time more when no line right too does man old too come made find been text long difference feel should place while small since against going look under last those home hand help turn right small found still though never both set order each three feel big keep else part usual mean before around number found yet sure held head every without away again might got soon run off close hope life always used states made show understand however through during early enough sentence great hold help form word take such think given case point men women children just world below need being going state many together under different move begin became includes call include provide suggest side however seem current often area different move change help follow develop public general particular business issue far enough turn information important different area form sure set notice staff talk pieces level plan bring save allow for spend write move able level final later side hard open point voice come group use then different small near call able present common important large national next cause much relation base follow develop talk down give type lead public own develop field control present nature that hold hold eyes face kind thing look write hair cold hot warm cool rich poor thick thin fast slow happy sad strong weak quick fast high low wide narrow deep shallow heavy light easy hard soft rough smooth bright dark clear cloudy wet dry clean dirty bright simple complex clever foolish brave afraid wise foolish young old new old good better best bad worse worst large big great huge tiny small little hot warm cool cold wet dry heavy light easy hard soft thick thin fast slow loud quiet high low wide narrow deep shallow open shut full empty safe dangerous strong weak bright dark clean dirty old young`.split(/\s+/);
  return embeddedList.filter((w, i, arr) => arr.indexOf(w) === i).slice(0, 500).map((word, i) => ({
    word, phonetic: null, meaning: '', frequencyRank: i + 1,
  }));
}

async function crawlTier2Words(): Promise<Array<{ word: string; phonetic: string | null; meaning: string; frequencyRank: number }>> {
  console.log('[Tier 2] Fetching AWL word list...');
  const sources = [
    'https://raw.githubusercontent.com/bolDuc/awl/master/awl_list.txt',
    'https://raw.githubusercontent.com/Owlcoder/Academic-Word-List/main/awl.txt',
  ];
  for (const url of sources) {
    try {
      const res = await axios.get(url.replace(/\s/g, ''), { timeout: 15000 });
      const lines = res.data.split('\n').map((l: string) => l.trim().toLowerCase()).filter((l: string) => /^[a-z]+$/.test(l) && l.length > 2);
      const words = lines.slice(0, 570).map((word: string, i: number) => ({
        word, phonetic: null as string | null, meaning: '', frequencyRank: 3001 + i,
      }));
      if (words.length > 100) { console.log(`[Tier 2] Fetched ${words.length} AWL words`); return words; }
    } catch (err) { console.warn(`[Tier 2] Source failed (${url}): ${err}`); }
  }
  return getEmbeddedAWLWords();
}

function getEmbeddedAWLWords(): Array<{ word: string; phonetic: string | null; meaning: string; frequencyRank: number }> {
  const awlWords = `abandon abstract academic access accommodate accord achievement acknowledge acquire activate adequate adjacent adopt adverse advocate affect affordable aggregate algorithm allocate alternative ambiguous amendment analogous analysis analyze ancestor annual anticipate apparent appreciate approach appropriate approximate arbitrary archive area arise assess assign assist assume assure attach attempt attend attitude attribute author automate available aware bias brief bulk calculate capability capacity category cease channel chapter chemical classic clear stable collect column combine command comment commercial commission commitment communicate community comparable compile complement complex component compound comprehensive compute conceive concentrate concept concern conclude concurrent conduct configure conform confront confuse congress connect consistent constant constitute construct consume contact contemporary content context contract contrast convene convert cooperate coordinate correlate couple course coverage create credit crisis criteria crucial culture currency component generate handle direct distribute document domain dominate draft drama dramatic edition element emerge emphasis empirical ensure entire entity equivalent error establish estimate ethical evaluate eventually evidence exchange exclude execute exhibit expand expert export expose external facilitate factor feature figure file filter final finance fine focus fool formula forth framework fragment furthermore gender generate genre graphic grab graphic gross guideline highlight hierarchy hypothesis identical illustrate image impact implement implicate implicit impose initial injury innovate input insert instance integral integrity interact interim interior intermediate interval invoke isolate item junction justify kernel label layer latter lemma liberal licence license likelihood likewise link literature locate logic maintain major manifest manipulate margin market mature maximize mechanism media medium mental method migrate minimal ministry minor mode modify monitor month mood moral multiply mutual narrative net network neutral notion novel nutrition objective observe obtain obvious option orient origin output override panel paradigm parameter participate partner passive patent path pattern penalty perceive percent perfect perform periodic persist phase phenomenon philosophical pitch place policy popular portion portrait portion potential practitioner precede precision predict predominant premature preserve prevent prime principal principle prior priority procedure produce profession profile profitable prohibit prominent property proportion prospect protocol provider provision publication publish purpose pursue quality quantitative query quote random range rational react readily region register regular regulate reinforce reject relax release relevant reliable relieve remain remainder remark remedy render renowned report represent reproduce research reserve resolve respond restore restrict reveal revenue reverse route scenario scheme scope secondary section sector secure seek select sequence settle shade shift significant similar site slender sole source span sparse specify sponsor stable stance stationary statistic status steer strategy stress structure style submit subsequent subtle succeed successive sufficient suitable sum super summary supervise supplement supreme survey survive suspect sustain synthesis system target technique temper temporary tense terminal terminate testify theory therefore thesis thereby third tier tight title topic topology total trace trade tradition traffic transfer transform transit trigger transparent trend trial tropical ultimate undergo underlie undertake uniform unique universal utilize vague valid variable variant vector version via video view virtual visual volume volunteer welfare yield`.split(/\s+/);
  return awlWords.map((word, i) => ({ word, phonetic: null as string | null, meaning: '', frequencyRank: 3001 + i }));
}

interface GrammarTopic {
  title: string; explanation: string; level: Level;
  commonMistakes: string[]; examples: string[]; order: number;
}

function inferLevel(title: string): Level {
  const t = title.toLowerCase();
  if (['subjunctive', 'inversions', 'complex', 'advanced', 'passive voice', 'nominalization', 'participle clauses', 'cleft sentences'].some(w => t.includes(w))) return 'High';
  if (['article', 'basic', 'simple', 'singular', 'plural', 'subject-verb', 'verb tense', 'future form', 'preposition', 'modal', 'comparative'].some(w => t.includes(w))) return 'Low';
  return 'Mid';
}

function getEmbeddedGrammarTopics(): GrammarTopic[] {
  return [
    { title: 'Subject-Verb Agreement', explanation: 'The subject and verb must agree in number. Singular subjects take singular verbs; plural subjects take plural verbs.', level: 'Low', commonMistakes: ['The team are playing well.', 'Each of the students have a book.'], examples: ['The cat sleeps on the mat.', 'Every student has a notebook.'], order: 1 },
    { title: 'Verb Tenses', explanation: 'IELTS requires accurate use of verb tenses to describe actions in different time frames. Key tenses: Present Simple, Present Continuous, Present Perfect, Past Simple, Past Perfect, Future Simple.', level: 'Low', commonMistakes: ['I have gone there yesterday.', 'She is working since 9am.'], examples: ['She works as a teacher.', 'I have lived here for five years.'], order: 2 },
    { title: 'Articles (a/an/the)', explanation: 'Articles specify nouns. A/an is indefinite (first mention), the is definite (specific or already mentioned). No article with uncountable nouns in general statements, plural nouns, or proper nouns.', level: 'Low', commonMistakes: ['The water is wet. (general statement)', 'She is a honest person.'], examples: ['I saw a movie yesterday. The movie was interesting.'], order: 3 },
    { title: 'Prepositions', explanation: 'Prepositions show relationships between nouns and other words: in, on, at, by, for, with, from, about, of, into, to, over, under.', level: 'Low', commonMistakes: ['She is good at maths.', 'I will call you on my mobile.'], examples: ['She arrived on time.', 'He is interested in art.'], order: 4 },
    { title: 'Conditionals', explanation: 'Type 0: if + present simple, present simple. Type 1: if + present simple, will + base. Type 2: if + past simple, would + base. Type 3: if + past perfect, would have + past participle.', level: 'Mid', commonMistakes: ['If I will study, I will pass.', 'If she had called, I would answer.'], examples: ['If water reaches 100C, it boils.', 'If I had more money, I would travel more.'], order: 5 },
    { title: 'Passive Voice', explanation: 'Passive is used when the action is more important than the subject. Formed with be + past participle. Important for describing processes and reports in IELTS.', level: 'Mid', commonMistakes: ['She was borned in 1990.', 'The cake been eating.'], examples: ['English is spoken worldwide.', 'The bridge was built in 2005.'], order: 6 },
    { title: 'Relative Clauses', explanation: 'Defining clauses specify the noun; non-defining add extra info. Pronouns: who/whom (people), which (things), whose (possession), that (defining).', level: 'Mid', commonMistakes: ['The man who I spoke to him.', 'I visited the city where my friend lives there.'], examples: ['The student who submitted the assignment passed.', 'London, which is the capital, is a major city.'], order: 7 },
    { title: 'Sentence Structure', explanation: 'A sentence must have a subject and verb. Complex sentences combine independent clauses with conjunctions or relative pronouns. Avoid fragments and run-ons.', level: 'Low', commonMistakes: ['Because the weather was bad. (fragment)', 'I love reading I also enjoy writing. (run-on)'], examples: ['Although it rained, we went out.', 'The report shows that crime has increased.'], order: 8 },
    { title: 'Word Forms', explanation: 'Using correct word form is essential. Nouns, verbs, adjectives, adverbs are often confused. Example: improve (verb), improvement (noun), improved (adjective).', level: 'Mid', commonMistakes: ['The weather effected my mood.', 'It was a successly launch.'], examples: ['The population is increasing.', 'There has been a significant increase.'], order: 9 },
    { title: 'Connectors/Coherence', explanation: 'Connectors link ideas: moreover, furthermore (addition), however, nevertheless (contrast), therefore, consequently (result), for example, for instance (example).', level: 'Mid', commonMistakes: ['I love reading. However I hate writing.', 'And also the results were good.'], examples: ['The population is growing. Consequently, housing demand is increasing.'], order: 10 },
    { title: 'Modals', explanation: 'Modal verbs express possibility, ability, obligation, permission. Key modals: can/could, may/might, must/have to, should, will. Followed by base verb.', level: 'Low', commonMistakes: ['He can to swim.', 'You must not to smoke.'], examples: ['You should revise your essay.', 'Smoking must not be allowed in public places.'], order: 11 },
    { title: 'Comparatives and Superlatives', explanation: 'Comparatives compare two things (-er/more); superlatives compare three+ (est/most). Irregular: good/better/best, bad/worse/worst.', level: 'Low', commonMistakes: ['She is more better than him.', 'This is the most cheapest option.'], examples: ['This book is more interesting than that one.', 'She is the most talented student.'], order: 12 },
    { title: 'Countable and Uncountable Nouns', explanation: 'Countable: one book, two books. Uncountable: information, advice, research. Use quantifiers: much/many, a lot of, some, any, few/a few, little/a little.', level: 'Low', commonMistakes: ['She gave me a good advice.', 'How many luggage do you have?'], examples: ['I need some information about the course.', 'There are a few remaining seats.'], order: 13 },
    { title: 'Complex Sentences', explanation: 'Complex sentences have one independent clause and at least one dependent clause. Subordinating conjunctions: because, although, when, if, while.', level: 'Mid', commonMistakes: ['Although he was tired, but he continued.', 'Because of the rain, so we stayed inside.'], examples: ['Although technology has benefits, it also poses risks.', 'While some prefer cities, others choose rural areas.'], order: 14 },
    { title: 'Cohesion and Linking Devices', explanation: 'Cohesion is logical connection between sentences. Use referring words (this, that), conjunctions, and lexical cohesion (synonyms, antonyms).', level: 'Mid', commonMistakes: ['Some people think... This is because... (vague "this")', 'Repeating the same connector in one paragraph.'], examples: ['First, the government should invest in public transport. Secondly...', 'Some argue that social media is harmful. However, others believe it has benefits.'], order: 15 },
    { title: 'Nominalization', explanation: 'Converting verbs or adjectives into nouns for academic/formal writing. develop -> development, strong -> strength, decide -> decision.', level: 'High', commonMistakes: ['The develop of technology has been rapid.', 'His confident grew.'], examples: ['The implementation of new policies led to economic growth.', 'His achievement was recognized.'], order: 16 },
    { title: 'Participle Clauses', explanation: 'Present participle (-ing) shows active simultaneous actions; past participle (-ed) shows passive or completed actions. Creates concise complex sentences.', level: 'High', commonMistakes: ['The students studied at the library, they felt tired.', 'The essay writing by the student was excellent.'], examples: ['Looking at the data, we can see a clear trend.', 'Educated in Oxford, she became a prominent researcher.'], order: 17 },
    { title: 'Inversions', explanation: 'Inversion reverses normal subject-verb order for emphasis. Negative adverbial: Never, Rarely, Seldom. Conditional: Had I known.', level: 'High', commonMistakes: ['Never I have seen such a sunset.', 'Rarely they go to the theatre.'], examples: ['Rarely do we see such dedication.', 'Not only did he pass, but he achieved the highest score.'], order: 18 },
    { title: 'Cleft Sentences', explanation: 'Cleft sentences divide a clause to emphasize information. Structure: It + be + emphasis + who/which/that + rest. Adds syntactic variety.', level: 'High', commonMistakes: ['It was because of her hard work she succeeded.', 'What she likes is to travel.'], examples: ['It was the introduction of the internet that revolutionized communication.', 'It is not the destination that matters but the journey.'], order: 19 },
    { title: 'Ellipsis and Substitution', explanation: 'Ellipsis omits repeated elements; substitution replaces with do, so, one, such. Both create cohesion and avoid repetition.', level: 'Mid', commonMistakes: ['I like this book more than that one does.', 'Yes, I can. (ellipsis omitting "swim")'], examples: ['A: Can you swim? B: Yes, I can.', 'Do you need a pen? Do you have one?'], order: 20 },
    { title: 'Quantifiers and Determiner Choice', explanation: 'Quantifiers: much/many (questions/negative), a lot of (informal), some/any (indefinite), few/a few, little/a little. Choice depends on countability.', level: 'Mid', commonMistakes: ['There are much reasons.', 'I have a little friends.'], examples: ['There has been a lot of research.', 'A few students failed, but most passed.'], order: 21 },
    { title: 'Future Forms', explanation: 'Will (spontaneous/predictions), going to (plans/evidence), present continuous (definite arrangements), present simple (scheduled events).', level: 'Low', commonMistakes: ['I will meet you tomorrow at the station.', 'I am going to visit my grandmother last week.'], examples: ['Climate change will affect agriculture.', 'The government is going to introduce new regulations.'], order: 22 },
    { title: 'Present Perfect vs Past Simple', explanation: 'Present perfect connects past to present (experience, ongoing situations). Past simple for completed events at specific past time.', level: 'Mid', commonMistakes: ['I have visited Paris last year.', 'I have finished my assignment yesterday.'], examples: ['I have visited Paris three times.', 'I visited Paris last year.', 'She has written several articles.'], order: 23 },
    { title: 'Active and Passive Constructions', explanation: 'Vary between active and passive. Passive is formed with be + past participle. Useful for impersonal arguments, research, processes.', level: 'Mid', commonMistakes: ['It is know that smoking is harmful.', 'The music was made by a local band.'], examples: ['Many languages are spoken in Singapore.', 'The new curriculum was implemented last year.'], order: 24 },
    { title: 'Advanced Vocabulary Choices', explanation: 'Band 7+ requires precise vocabulary. Avoid generic words: good -> beneficial, bad -> detrimental, many -> numerous. Use topic-specific terms.', level: 'High', commonMistakes: ['The government should do something about the problem.', 'It is a very big city.'], examples: ['Instead of "many people": "a substantial proportion of the population"', 'Instead of "solve": "alleviate", "mitigate", "address"'], order: 25 },
    { title: 'Cause and Effect Structures', explanation: 'Cause: because/because of/due to/thanks to. Effect: consequently/therefore/as a result/thus/hence. Advanced: lead to, result in, be caused by.', level: 'Mid', commonMistakes: ['Because of the reason that...', 'She was ill due to she ate bad food.'], examples: ['Rising house prices are largely due to increased demand.', 'Consequently, healthcare costs have risen significantly.'], order: 26 },
    { title: 'Argumentative Writing Structures', explanation: 'IELTS Task 2: Introduction (paraphrase + thesis), Body Paragraphs (topic sentence + explanation + example), Conclusion (restate thesis).', level: 'Mid', commonMistakes: ['Introducing new points in the conclusion.', 'Writing less than 250 words.'], examples: ['Introduction: It is often argued that technology has transformed education.', 'Body topic sentence: The primary advantage of online learning is its flexibility.'], order: 27 },
    { title: 'Linking Words for Writing', explanation: 'Listing: firstly, secondly, finally. Addition: moreover, furthermore, in addition. Contrast: however, nevertheless. Conclusion: in conclusion, to sum up.', level: 'Mid', commonMistakes: ['Using linking words mechanically without logical connection.', 'Starting too many sentences with "and" or "but".'], examples: ['Firstly, education promotes economic growth. Secondly, it fosters social mobility.', 'Some argue that cell phones should be banned in schools. However, this view overlooks their educational potential.'], order: 28 },
    { title: 'Task Achievement in Writing', explanation: 'Assess how well you address the question, present a position, and support arguments. Answer directly, take clear stance, use relevant examples.', level: 'Mid', commonMistakes: ['Not reading the question carefully.', 'Not addressing all parts of a multi-part question.'], examples: ['Question: Some believe universities should focus on academic knowledge. Discuss both views. Must address BOTH views.', 'Include relevant examples: "For instance, in Japan..."'], order: 29 },
    { title: 'Paragraph Structure', explanation: 'Each paragraph should have: topic sentence, explanation, evidence/example, and a link to the next paragraph. Stay focused on one idea.', level: 'Mid', commonMistakes: ['Writing too many ideas in one paragraph.', 'Not having a clear topic sentence.', 'Ending paragraphs without a link sentence.'], examples: ['Topic sentence: Online education offers significant flexibility.', 'Explanation + example + link: This allows learners to... Consequently...'], order: 30 },
  ];
}

async function crawlGrammarTopics(): Promise<GrammarTopic[]> {
  console.log('[Grammar] Crawling IELTS Liz grammar page...');
  try {
    const res = await axios.get('https://ieltsliz.com/ielts-grammar/', {
      timeout: 20000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' },
    });
    const $ = cheerio.load(res.data);
    const topics: GrammarTopic[] = [];
    let order = 0;
    $('h2, h3').each((_, el) => {
      const title = $(el).text().trim();
      if (!title || title.length < 3) return;
      if (title.toLowerCase().includes('advertisement') || title.toLowerCase().includes('ielts') || title.length > 100) return;
      const paragraphs: string[] = [];
      $(el).nextUntil('h2, h3').find('p').each((_, p) => { const t = $(p).text().trim(); if (t.length > 20) paragraphs.push(t); });
      order++;
      topics.push({
        title,
        explanation: paragraphs[0] || title,
        level: inferLevel(title),
        commonMistakes: [],
        examples: paragraphs.slice(1, 4),
        order,
      });
    });
    if (topics.length > 0) { console.log(`[Grammar] Found ${topics.length} topics from IELTS Liz`); return topics; }
  } catch (err) { console.warn(`[Grammar] Crawl failed: ${err}`); }
  return getEmbeddedGrammarTopics();
}

async function fillMeanings(
  words: Array<{ word: string; phonetic: string | null; meaning: string; frequencyRank: number }>
): Promise<void> {
  console.log(`[Dictionary] Filling meanings for ${words.length} words...`);
  const batchSize = 20;
  for (let i = 0; i < words.length; i += batchSize) {
    const batch = words.slice(i, i + batchSize);
    await Promise.all(batch.map(async (w) => {
      if (w.meaning) return;
      try {
        const res = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(w.word)}`, { timeout: 5000 });
        const entry = res.data[0];
        w.phonetic = w.phonetic || entry.phonetic || entry.phonetics?.[0]?.text || null;
        w.meaning = entry.meanings?.[0]?.definitions?.[0]?.definition || w.word;
      } catch { w.meaning = w.meaning || w.word; }
    }));
    if (i % 100 === 0) console.log(`[Dictionary] Progress: ${Math.min(i + batchSize, words.length)}/${words.length}`);
    await new Promise((r) => setTimeout(r, 200));
  }
  console.log('[Dictionary] Done.');
}

async function main() {
  console.log('=== Crawl & Seed for IELTS Training App ===\n');
  const systemUserId = await ensureSystemUser();
  console.log(`[System] User ID: ${systemUserId}`);

  const tier1Words = await crawlTier1Words();
  const tier2Words = await crawlTier2Words();

  await fillMeanings(tier1Words);
  await fillMeanings(tier2Words);

  console.log('\n[Seed] Inserting vocabulary...');
  const BATCH = 100;
  let tier1Inserted = 0;
  for (let i = 0; i < tier1Words.length; i += BATCH) {
    const batch = tier1Words.slice(i, i + BATCH);
    try {
      await prisma.vocabulary.createMany({
        data: batch.map((w) => ({
          word: w.word, phonetic: w.phonetic, meaning: w.meaning || w.word,
          VocabType: randomEnum(VOCAB_TYPES) as any,
          level: randomEnum(LEVELS) as any,
          tier: 1, frequencyRank: w.frequencyRank, idUser: systemUserId, status: 'new',
        })),
        skipDuplicates: true,
      });
      tier1Inserted += batch.length;
      console.log(`[Seed] Tier 1: ${tier1Inserted}/${tier1Words.length}`);
    } catch (err) { console.warn(`[Seed] Tier 1 batch error at ${i}: ${err}`); }
  }

  let tier2Inserted = 0;
  for (let i = 0; i < tier2Words.length; i += BATCH) {
    const batch = tier2Words.slice(i, i + BATCH);
    try {
      await prisma.vocabulary.createMany({
        data: batch.map((w) => ({
          word: w.word, phonetic: w.phonetic, meaning: w.meaning || w.word,
          VocabType: randomEnum(VOCAB_TYPES) as any,
          level: randomEnum(LEVELS) as any,
          tier: 2, frequencyRank: w.frequencyRank, idUser: systemUserId, status: 'new',
        })),
        skipDuplicates: true,
      });
      tier2Inserted += batch.length;
      console.log(`[Seed] Tier 2: ${tier2Inserted}/${tier2Words.length}`);
    } catch (err) { console.warn(`[Seed] Tier 2 batch error at ${i}: ${err}`); }
  }

  console.log('\n[Grammar] Seeding grammar topics...');
  const grammarTopics = await crawlGrammarTopics();
  let grammarInserted = 0;
  for (const topic of grammarTopics) {
    try {
      await prisma.grammar.create({
        data: {
          title: topic.title, explanation: topic.explanation, level: topic.level,
          commonMistakes: toJson(topic.commonMistakes),
          examples: toJson(topic.examples), order: topic.order,
        },
      });
      grammarInserted++;
    } catch { /* already exists */ }
  }

  const totalVocab = await prisma.vocabulary.count();
  const tier1Count = await prisma.vocabulary.count({ where: { tier: 1 } });
  const tier2Count = await prisma.vocabulary.count({ where: { tier: 2 } });
  const totalGrammar = await prisma.grammar.count();

  console.log('\n=== Seed Complete ===');
  console.log(`Vocabulary:`);
  console.log(`  Tier 1 (High Frequency): ${tier1Count} words`);
  console.log(`  Tier 2 (AWL):           ${tier2Count} words`);
  console.log(`  Total:                  ${totalVocab} words`);
  console.log(`Grammar topics: ${grammarInserted} (total: ${totalGrammar})`);
}

main().then(() => { console.log('\nDone.'); process.exit(0); }).catch((err) => { console.error('Fatal error:', err); process.exit(1); }).finally(() => prisma.$disconnect());