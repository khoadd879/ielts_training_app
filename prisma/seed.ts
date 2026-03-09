/**
 * =============================================================================
 * prisma/seed.ts
 * =============================================================================
 * GOLDEN SOURCE OF TRUTH & PARSING BLUEPRINT for IELTS Training App
 *
 * This file serves TWO purposes:
 *   1. DATABASE SEEDING — Creates one complete IELTS Mock Test with all 4 skills.
 *   2. CRAWLING BLUEPRINT — The TypeScript interfaces and comments are the
 *      authoritative specification that automated crawling agents MUST follow
 *      when parsing arbitrary IELTS websites.
 *
 * RELATIONSHIP CHAIN (read this before everything else):
 *   Test
 *     └─ Part[]              (idTest  → Part.idTest)
 *          ├─ Passage?        (idPart  → Passage.idPart)         [Reading / sometimes Listening]
 *          ├─ QuestionGroup[] (idPart  → QuestionGroup.idPart)
 *          │    └─ Question[] (idQuestionGroup → Question.idQuestionGroup,
 *          │                   idPart          → Question.idPart)
 *          └─ Question[]      (direct Part→Question link for fast lookup)
 *     └─ WritingTask[]        (idTest  → WritingTask.idTest)
 *     └─ SpeakingTask[]       (idTest  → SpeakingTask.idTest)
 *          └─ SpeakingQuestion[] (idSpeakingTask → SpeakingQuestion.idSpeakingTask)
 *
 * ORDERING CONTRACT:
 *   • Part.order            — 0-indexed, increments per part within a test
 *   • QuestionGroup.order   — 0-indexed, increments per group within a part
 *   • Question.order        — 0-indexed, increments per question within a group
 *   • Question.questionNumber — 1-indexed, GLOBAL within the test (1..40 for R/L)
 *   • SpeakingQuestion.order — 0-indexed within a task
 *
 * =============================================================================
 */

import { PrismaClient, QuestionType, TestType, WritingTaskType, SpeakingPartType, Level } from '@prisma/client'
import { Prisma } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Prisma's JsonB input type requires an index signature that plain interfaces
 * do not satisfy. This helper casts any strongly-typed metadata object to the
 * `Prisma.InputJsonValue` type that Prisma's generated client accepts.
 *
 * CRAWLER NOTE: After validating your metadata object against the interface,
 * wrap it with `toJson(...)` before passing it to Prisma.
 */
function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue
}

// =============================================================================
// STEP 1 — STRICT TypeScript Interfaces for `metadata` (JsonB)
// =============================================================================
//
// The `metadata` field on the `Question` model is a JSONB column that stores
// ALL type-specific data for a question. The `questionType` enum is the
// discriminator used to pick the correct interface.
//
// CRAWLER VALIDATION RULE: After extracting raw data from HTML, the crawler
// MUST cast the metadata to the correct interface and validate that all
// required fields are present before upserting to the database. If a field
// is missing, log a WARNING and fill with a sensible default (never silently
// drop the question).
// =============================================================================

// ---------------------------------------------------------------------------
// 1. MULTIPLE_CHOICE
//    HTML signals: radio buttons, "Choose ONE letter", "Choose TWO letters"
//    Crawler notes:
//      - options[] are always lettered (A, B, C, D) — strip the letter prefix
//        and store only the text; reconstruct labels in the UI.
//      - correctAnswers[] uses the same stripped text (not the letter).
//      - maxSelections = 1 for "choose ONE", 2 for "choose TWO".
// ---------------------------------------------------------------------------
interface MultipleChoiceMetadata {
  options: string[]          // e.g. ["a cave system", "a research station", ...]
  correctAnswers: string[]   // Must be a subset of options[]
  maxSelections: number      // 1 = single, 2+ = multi-select
}

// ---------------------------------------------------------------------------
// 2. TRUE_FALSE_NOT_GIVEN  /  3. YES_NO_NOT_GIVEN
//    HTML signals:
//      - "Do the following statements agree with the information?" → TRUE_FALSE_NOT_GIVEN
//      - "Do the following statements agree with the views/claims?" → YES_NO_NOT_GIVEN
//    Both share the same metadata shape — only the label text differs.
//    Crawler notes:
//      - answer must be one of "TRUE"|"FALSE"|"NOT GIVEN" or "YES"|"NO"|"NOT GIVEN"
//      - Store whichever the source uses; the UI normalises display.
// ---------------------------------------------------------------------------
interface TrueFalseNotGivenMetadata {
  statement: string          // The claim students evaluate (mirrors Question.content)
  answer: 'TRUE' | 'FALSE' | 'NOT GIVEN'
}

interface YesNoNotGivenMetadata {
  statement: string
  answer: 'YES' | 'NO' | 'NOT GIVEN'
}

// ---------------------------------------------------------------------------
// 4. MATCHING_HEADING
//    HTML signals: "The Reading Passage has N paragraphs A-X. Choose the
//    correct heading for each paragraph."
//    Crawler notes:
//      - headingBank[] is shared across ALL questions in the group — store it
//        once on the FIRST question (or better: on QuestionGroup.instructions).
//        Each Question stores its own correctHeading.
//      - paragraphLabel is the paragraph letter/number (e.g. "A", "B", "III").
// ---------------------------------------------------------------------------
interface MatchingHeadingMetadata {
  paragraphLabel: string     // e.g. "A", "B", "III"
  headingBank: string[]      // Full list of heading options (shared across group)
  correctHeading: string     // The correct heading text from headingBank
}

// ---------------------------------------------------------------------------
// 5. MATCHING_INFORMATION
//    HTML signals: "Which paragraph contains the following information?"
//    Crawler notes:
//      - answer is a paragraph letter/number.
//      - paragraphBank contains the possible paragraph identifiers.
//      - canRepeat = true when the instructions say "NB: Any paragraph may be
//        chosen MORE THAN ONCE".
// ---------------------------------------------------------------------------
interface MatchingInformationMetadata {
  informationStatement: string  // The piece of information to locate
  paragraphBank: string[]       // e.g. ["A","B","C","D","E","F","G"]
  answer: string                // e.g. "C"
  canRepeat: boolean
}

// ---------------------------------------------------------------------------
// 6. MATCHING_FEATURES
//    HTML signals: "Match each statement with the correct [person/place/etc.]"
//    Crawler notes:
//      - featureBank is the list of named entities (researchers, countries…)
//      - correctFeature is the entity that the statement maps to.
// ---------------------------------------------------------------------------
interface MatchingFeaturesMetadata {
  statement: string
  featureBank: string[]      // e.g. ["Researcher A", "Researcher B", "Both"]
  correctFeature: string
  canRepeat: boolean
}

// ---------------------------------------------------------------------------
// 7. MATCHING_SENTENCE_ENDINGS
//    HTML signals: "Complete each sentence with the correct ending A-K"
//    Crawler notes:
//      - sentenceBeginning is stored in Question.content
//      - endingBank is shared across the group (store on first question)
//      - correctEnding is the text of the matched ending
// ---------------------------------------------------------------------------
interface MatchingSentenceEndingsMetadata {
  sentenceBeginning: string
  endingBank: string[]       // Full list of sentence endings
  correctEnding: string
}

// ---------------------------------------------------------------------------
// 8. SENTENCE_COMPLETION
//    HTML signals: "Complete the sentences below. Write NO MORE THAN X WORDS"
//    Crawler notes:
//      - wordLimit e.g. "ONE WORD ONLY", "NO MORE THAN TWO WORDS",
//        "ONE WORD AND/OR A NUMBER"
//      - acceptedAnswers[] for questions where multiple phrasings are correct
//        (e.g. ["internet", "the internet"] both accepted)
//      - The blank position is implicit — the UI renders Question.content with
//        a ________ placeholder.
// ---------------------------------------------------------------------------
interface SentenceCompletionMetadata {
  wordLimit: string          // e.g. "ONE WORD ONLY", "NO MORE THAN TWO WORDS AND/OR A NUMBER"
  acceptedAnswers: string[]  // All valid answer strings (lowercase, trimmed)
}

// ---------------------------------------------------------------------------
// 9. SUMMARY_COMPLETION
//    HTML signals: "Complete the summary using words from the box" OR
//                  "Complete the summary. Write NO MORE THAN X WORDS"
//    Crawler notes:
//      - If a word box is provided, set wordBank to the available words.
//      - If free-write, wordBank = [] and wordLimit is set.
//      - summaryContext is the surrounding sentence fragment (helps UI highlight gap).
// ---------------------------------------------------------------------------
interface SummaryCompletionMetadata {
  wordLimit: string          // e.g. "ONE WORD ONLY"
  wordBank: string[]         // Empty array = no word box provided
  summaryContext: string     // The sentence containing the gap, with ____ placeholder
  acceptedAnswers: string[]
}

// ---------------------------------------------------------------------------
// 10. NOTE_COMPLETION  /  11. TABLE_COMPLETION  /  12. FLOW_CHART_COMPLETION
//     HTML signals:
//       Note:       Notes / bullet lists with blanks
//       Table:      HTML <table> or grid structure with blanks
//       Flow chart: Arrows / boxes with blanks, process/sequence language
//     All three share the same metadata shape — they differ only in
//     QuestionGroup.imageUrl (provide a screenshot of the table/chart) and
//     QuestionGroup.instructions.
// ---------------------------------------------------------------------------
interface CompletionMetadata {  // Covers NOTE, TABLE, FLOW_CHART
  wordLimit: string
  wordBank: string[]           // Empty = no box
  cellContext: string          // Surrounding text / cell label identifying where the blank is
  acceptedAnswers: string[]
}

// ---------------------------------------------------------------------------
// 13. DIAGRAM_LABELING  (also covers MAP_LABELING)
//     HTML signals: Diagram / map image, numbered arrows/labels pointing to parts
//     Crawler notes:
//       - imageUrl is REQUIRED. Store on QuestionGroup.imageUrl.
//       - labelPosition is a textual hint (e.g. "top-left corner", "arrow 3")
//         to help AI describe the diagram. For precise coordinates use x/y (%).
//       - acceptedAnswers[] for spelling variants.
// ---------------------------------------------------------------------------
interface DiagramLabelingMetadata {
  wordLimit: string
  wordBank: string[]
  labelPosition: string        // Human-readable position hint
  labelCoordinates?: {         // Optional: percentage-based (0-100)
    x: number
    y: number
  }
  acceptedAnswers: string[]
}

// ---------------------------------------------------------------------------
// 14. SHORT_ANSWER
//     HTML signals: "Answer the questions below. Write NO MORE THAN X WORDS"
//     Crawler notes:
//       - acceptedAnswers may contain multiple valid responses.
// ---------------------------------------------------------------------------
interface ShortAnswerMetadata {
  wordLimit: string
  acceptedAnswers: string[]
}

// =============================================================================
// STEP 2 — CRAWLING HEURISTICS & DETECTION RULES
// =============================================================================
//
// These rules are encoded as comments + the CRAWL_RULES config object below.
// Crawling agents MUST check rules in the listed priority order.
// =============================================================================

/**
 * HOW TO DETECT TEST TYPE
 * ────────────────────────
 * LISTENING:
 *   • Page/section contains an <audio> or <video> tag, or URLs ending in
 *     .mp3 / .wav / .ogg / .m4a
 *   • Section headings say "Section 1", "Section 2" … "Section 4"
 *   • Instructions include "You will hear …"
 *
 * READING:
 *   • Long text block (> 300 words) present before the questions
 *   • Section headings say "Reading Passage 1 / 2 / 3"
 *   • No audio element found
 *
 * WRITING:
 *   • Contains "Task 1" AND "Task 2" headings, or words like "Write at least
 *     150 words" / "Write at least 250 words"
 *   • May contain chart / graph image for Task 1
 *
 * SPEAKING:
 *   • Contains "Part 1 / Part 2 / Part 3" labels
 *   • Contains cue card layout (bold topic + bullet points)
 *   • May have a countdown timer widget
 */

// =============================================================================
// SKILL ↔ QUESTION TYPE MAPPING
// =============================================================================
//
// ⚠️  CRITICAL — The crawler MUST consult this map before classifying a group.
//     Never assign a Reading-only type to a Listening test and vice versa.
//     If a type is in both lists it is shared; detect via context (audio/text).
// =============================================================================

/**
 * READING — all 14 question types are valid in a Reading test.
 * The crawler should try all CRAWL_RULES patterns against the group instruction.
 *
 *  1.  TRUE_FALSE_NOT_GIVEN      "Do the statements agree with the INFORMATION…"
 *  2.  YES_NO_NOT_GIVEN          "Do the statements agree with the VIEWS/CLAIMS…"
 *  3.  MATCHING_HEADING          "Choose the correct heading for each paragraph…"
 *  4.  MATCHING_INFORMATION      "Which paragraph contains the following information…"
 *  5.  MATCHING_FEATURES         "Match each statement with the correct researcher/place…"
 *  6.  MATCHING_SENTENCE_ENDINGS "Complete each sentence with the correct ending…"
 *  7.  MULTIPLE_CHOICE           "Choose the correct letter, A, B, C or D"
 *  8.  SENTENCE_COMPLETION       "Complete the sentences. Write NO MORE THAN X WORDS"
 *  9.  SUMMARY_COMPLETION        "Complete the summary using words from the box / passage"
 * 10.  NOTE_COMPLETION           "Complete the notes below. Write NO MORE THAN X WORDS"
 * 11.  TABLE_COMPLETION          "Complete the table below"
 * 12.  FLOW_CHART_COMPLETION     "Complete the flow-chart / process diagram"
 * 13.  DIAGRAM_LABELING          "Label the diagram / map / plan"
 * 14.  SHORT_ANSWER              "Answer the questions. Choose NO MORE THAN TWO WORDS"
 */
const READING_QUESTION_TYPES: QuestionType[] = [
  QuestionType.TRUE_FALSE_NOT_GIVEN,
  QuestionType.YES_NO_NOT_GIVEN,
  QuestionType.MATCHING_HEADING,
  QuestionType.MATCHING_INFORMATION,
  QuestionType.MATCHING_FEATURES,
  QuestionType.MATCHING_SENTENCE_ENDINGS,
  QuestionType.MULTIPLE_CHOICE,
  QuestionType.SENTENCE_COMPLETION,
  QuestionType.SUMMARY_COMPLETION,
  QuestionType.NOTE_COMPLETION,
  QuestionType.TABLE_COMPLETION,
  QuestionType.FLOW_CHART_COMPLETION,
  QuestionType.DIAGRAM_LABELING,
  QuestionType.SHORT_ANSWER,
]

/**
 * LISTENING — only 9 types appear in Listening tests.
 *
 * ❌  NEVER use TRUE_FALSE_NOT_GIVEN in Listening.
 * ❌  NEVER use YES_NO_NOT_GIVEN in Listening.
 * ❌  NEVER use MATCHING_HEADING in Listening.
 * ❌  NEVER use MATCHING_INFORMATION in Listening.
 * ❌  NEVER use MATCHING_SENTENCE_ENDINGS in Listening.
 *
 *  1.  MULTIPLE_CHOICE     "Choose the correct letter, A, B or C"
 *                          or "Choose TWO letters from A–E"
 *  2.  MATCHING_FEATURES   Often just called "Matching" — match speakers to statements
 *  3.  NOTE_COMPLETION     Very common in Section 1 as "Form completion"
 *                          e.g. Name: _____, Date of birth: _____
 *  4.  TABLE_COMPLETION    Grid of information with blanks (Section 2 / 4)
 *  5.  FLOW_CHART_COMPLETION  Process / procedure described in audio (Section 3 / 4)
 *  6.  SUMMARY_COMPLETION  Short paragraph summary with gaps
 *  7.  SENTENCE_COMPLETION "Complete the sentences. Write NO MORE THAN TWO WORDS AND/OR A NUMBER"
 *  8.  DIAGRAM_LABELING    "Plan / map / diagram labelling" (Section 2)
 *                          ALWAYS comes with QuestionGroup.imageUrl
 *  9.  SHORT_ANSWER        "Answer the questions. Write NO MORE THAN THREE WORDS"
 */
const LISTENING_QUESTION_TYPES: QuestionType[] = [
  QuestionType.MULTIPLE_CHOICE,
  QuestionType.MATCHING_FEATURES,
  QuestionType.NOTE_COMPLETION,
  QuestionType.TABLE_COMPLETION,
  QuestionType.FLOW_CHART_COMPLETION,
  QuestionType.SUMMARY_COMPLETION,
  QuestionType.SENTENCE_COMPLETION,
  QuestionType.DIAGRAM_LABELING,
  QuestionType.SHORT_ANSWER,
]

/**
 * Canonical skill-to-allowed-types map.
 * The crawler should call:
 *   const allowed = SKILL_QUESTION_TYPE_MAP[testType]
 *   if (!allowed.includes(detectedType)) { throw or fallback to SHORT_ANSWER }
 */
const SKILL_QUESTION_TYPE_MAP: Partial<Record<string, QuestionType[]>> = {
  READING:   READING_QUESTION_TYPES,
  LISTENING: LISTENING_QUESTION_TYPES,
  // WRITING and SPEAKING do not use the Question model — no types needed.
}

// =============================================================================
// ANSWER NORMALISATION RULES
// =============================================================================
//
// For completion-style questions (SENTENCE_COMPLETION, NOTE_COMPLETION,
// SUMMARY_COMPLETION, TABLE_COMPLETION, FLOW_CHART_COMPLETION, SHORT_ANSWER,
// DIAGRAM_LABELING) the crawler must populate acceptedAnswers[] with ALL
// reasonable surface forms. The grading engine performs case-insensitive,
// trimmed exact matching against this array.
//
// RULE 1 — Numbers with/without formatting
//   If the answer contains a number, include both formatted and bare variants:
//     acceptedAnswers: ["15,000", "15000"]
//     acceptedAnswers: ["$200", "200", "two hundred"]
//     acceptedAnswers: ["1.5 million", "1,500,000", "1500000"]
//
// RULE 2 — Articles (a / an / the)
//   IELTS marking often accepts answers with or without articles:
//     acceptedAnswers: ["internet", "the internet"]
//     acceptedAnswers: ["university", "a university"]
//
// RULE 3 — British / American spelling variants
//   Include both where common:
//     acceptedAnswers: ["colour", "color"]
//     acceptedAnswers: ["travelling", "traveling"]
//     acceptedAnswers: ["organise", "organize"]
//
// RULE 4 — Hyphenation variants
//   acceptedAnswers: ["well-known", "well known"]
//   acceptedAnswers: ["follow-up", "follow up", "followup"]
//
// RULE 5 — Abbreviations / full forms
//   acceptedAnswers: ["UN", "United Nations"]
//   acceptedAnswers: ["approx.", "approximately"]
//
// RULE 6 — Singular / Plural (only when both are semantically valid)
//   acceptedAnswers: ["child", "children"]   ← only if context allows both
//
// IMPLEMENTATION TEMPLATE for crawlers:
//   function buildAcceptedAnswers(rawAnswer: string): string[] {
//     const variants: string[] = [rawAnswer.trim().toLowerCase()]
//     // Add number variants
//     if (/[\d,]+/.test(rawAnswer)) {
//       variants.push(rawAnswer.replace(/,/g, ''))   // strip commas
//       variants.push(rawAnswer.replace(/\./g, ''))  // strip decimals
//     }
//     // Add article-free variant
//     variants.push(rawAnswer.replace(/^(a |an |the )/i, '').trim().toLowerCase())
//     // Deduplicate
//     return [...new Set(variants)]
//   }
// =============================================================================

/**
 * HOW TO DETECT QUESTION TYPE (in priority order)
 * ─────────────────────────────────────────────────
 * Parse the QuestionGroup instructions/title string. Try each rule in order;
 * the FIRST match wins. Then validate the detected type is in
 * SKILL_QUESTION_TYPE_MAP[testType] before writing to the database.
 */
const CRAWL_RULES: Record<QuestionType, {
  /** Regex patterns tested against the group instruction text (case-insensitive) */
  instructionPatterns: RegExp[]
  /** Visual / structural HTML signals */
  htmlSignals: string[]
  /** Notes for the crawler developer */
  notes: string
}> = {
  [QuestionType.MULTIPLE_CHOICE]: {
    instructionPatterns: [
      /choose (the correct letter|one letter|two letters)/i,
      /which (one|two) of the following/i,
      /circle the (correct|best) answer/i,
    ],
    htmlSignals: [
      'radio input elements',
      'checkbox input elements',
      'lettered option lists (A B C D)',
    ],
    notes: 'Detect maxSelections by checking "choose TWO" vs "choose ONE". '
         + 'Options are usually <li> items under a <ul>. Strip leading "A. " label.',
  },

  [QuestionType.TRUE_FALSE_NOT_GIVEN]: {
    instructionPatterns: [
      /TRUE.*FALSE.*NOT GIVEN/i,
      /agree with the (information|passage)/i,
    ],
    htmlSignals: ['Three-option select or radio: TRUE / FALSE / NOT GIVEN'],
    notes: 'Distinguish from YES_NO_NOT_GIVEN by "information" (fact-based = T/F/NG) '
         + 'vs "views/claims" (opinion-based = Y/N/NG).',
  },

  [QuestionType.YES_NO_NOT_GIVEN]: {
    instructionPatterns: [
      /YES.*NO.*NOT GIVEN/i,
      /agree with the (views|claims|opinions)/i,
    ],
    htmlSignals: ['Three-option select or radio: YES / NO / NOT GIVEN'],
    notes: 'Same structure as TRUE_FALSE_NOT_GIVEN — discriminator is the instruction wording.',
  },

  [QuestionType.MATCHING_HEADING]: {
    instructionPatterns: [
      /choose the correct heading/i,
      /reading passage has .+ paragraphs/i,
      /list of headings/i,
    ],
    htmlSignals: [
      'Numbered list of headings before questions',
      'Dropdown or text input per paragraph',
    ],
    notes: 'Heading bank is listed before the questions. Map each paragraph label '
         + '(A, B, C… or i, ii, iii…) to the correct heading. '
         + 'Store headingBank on the FIRST question of the group (or on QuestionGroup).',
  },

  [QuestionType.MATCHING_INFORMATION]: {
    instructionPatterns: [
      /which paragraph (contains|mentions|refers)/i,
      /locate information in paragraphs/i,
    ],
    htmlSignals: ['Single letter answer box per question (A, B, C…)'],
    notes: 'Always check for "NB: any paragraph may be used MORE THAN ONCE" → canRepeat=true.',
  },

  [QuestionType.MATCHING_FEATURES]: {
    instructionPatterns: [
      /match each (statement|feature|finding) with the correct/i,
      /which (researcher|scientist|country|person)/i,
    ],
    htmlSignals: [
      'Small bank (3-7 items) listed before numbered statements',
      'Dropdown or letter box per statement',
    ],
    notes: 'Feature bank is distinct from paragraph bank. canRepeat is common here.',
  },

  [QuestionType.MATCHING_SENTENCE_ENDINGS]: {
    instructionPatterns: [
      /complete each sentence with the correct ending/i,
      /match the sentence beginnings .+ endings/i,
    ],
    htmlSignals: [
      'Sentence beginnings numbered, endings lettered (A-K)',
      'Two-column layout or dropdown per beginning',
    ],
    notes: 'Sentence beginnings go in Question.content. The ending bank is stored '
         + 'in metadata.endingBank on all questions in the group.',
  },

  [QuestionType.SENTENCE_COMPLETION]: {
    instructionPatterns: [
      /complete the sentences? (below|using)/i,
      /write (no more than|only) .+ word/i,
      /using words from the (text|passage)/i,
    ],
    htmlSignals: ['Short text input inline within a sentence'],
    notes: 'wordLimit must be extracted literally from the instructions. '
         + 'For "ONE WORD AND/OR A NUMBER" allow digit-only answers in acceptedAnswers.',
  },

  [QuestionType.SUMMARY_COMPLETION]: {
    instructionPatterns: [
      /complete the summary/i,
      /using a list of words.+(box|below)/i,
    ],
    htmlSignals: [
      'Boxed word list above a paragraph with blanks',
      'Short text inputs inside a paragraph block',
    ],
    notes: 'If a word box exists, populate wordBank[]. summaryContext is the full '
         + 'paragraph text with ____ placeholders — helps AI re-locate answers.',
  },

  [QuestionType.NOTE_COMPLETION]: {
    instructionPatterns: [
      /complete the notes? (below|using)/i,
      /complete the (table|form) below/i,
    ],
    htmlSignals: ['Bullet-list or indented notes structure with blank fields'],
    notes: 'cellContext should capture the bullet point or label immediately '
         + 'surrounding the blank (e.g. "Date of birth: ____").',
  },

  [QuestionType.TABLE_COMPLETION]: {
    instructionPatterns: [
      /complete the table/i,
      /fill in the (gaps|blanks) in the table/i,
    ],
    htmlSignals: ['<table> element with empty cells or text inputs'],
    notes: 'Take a screenshot of the table → store as QuestionGroup.imageUrl. '
         + 'cellContext = "Row: [row heading] | Col: [col heading]" for AI grading.',
  },

  [QuestionType.FLOW_CHART_COMPLETION]: {
    instructionPatterns: [
      /complete the (flow.?chart|process diagram|diagram)/i,
      /describe the (process|stages)/i,
    ],
    htmlSignals: ['Arrow-connected boxes / SVG flowchart', 'Numbered blank boxes'],
    notes: 'Always capture QuestionGroup.imageUrl. cellContext = descriptive text '
         + 'of the box\'s position in the sequence ("Step 3 of 5, after X").',
  },

  [QuestionType.DIAGRAM_LABELING]: {
    instructionPatterns: [
      /label the (diagram|map|plan|picture)/i,
      /write the correct letter.+(map|diagram)/i,
      /identify.+(parts?|areas?|sections?)/i,
    ],
    htmlSignals: [
      'Image with numbered arrows or callout boxes',
      'Text inputs adjacent to numbered labels on image',
    ],
    notes: 'REQUIRED: store imageUrl on QuestionGroup. '
         + 'If coordinates can be scraped from inline styles, populate labelCoordinates. '
         + 'Otherwise use labelPosition (human-readable description).',
  },

  [QuestionType.SHORT_ANSWER]: {
    instructionPatterns: [
      /answer the questions? below/i,
      /write (no more than|only) .+ word.+ answer/i,
      /give a short answer/i,
    ],
    htmlSignals: ['Plain text input following a direct question'],
    notes: 'Fallback type — use when none of the above patterns match and the '
         + 'question is a direct wh- question with a short text answer.',
  },
}

// =============================================================================
// STEP 3 — SEED SCRIPT
// =============================================================================

async function main() {
  console.log('🌱  Starting seed...')

  // --------------------------------------------------------------------------
  // SEED USER — owner of all seeded tests
  // --------------------------------------------------------------------------
  const seedUser = await prisma.user.upsert({
    where: { email: 'seed@ielts.dev' },
    update: {},
    create: {
      email: 'seed@ielts.dev',
      password: '$2b$10$PLACEHOLDER_BCRYPT_HASH',  // NOT a real password — replace in prod
      nameUser: 'Seed Admin',
      role: 'ADMIN',
      isActive: true,
    },
  })
  console.log('  ✔  Seed user:', seedUser.idUser)

  // ==========================================================================
  // READING TEST
  // ==========================================================================
  //
  // STRUCTURE: 1 Test → 1 Part → 1 Passage + 3 QuestionGroups → Questions
  //
  // Global questionNumber counter starts at 1, increments for each question
  // across ALL groups within the test (never resets per group).
  //
  // This mirrors the real IELTS Reading paper: Questions 1-40 are continuous.
  // ==========================================================================

  const readingTest = await prisma.test.create({
    data: {
      idUser: seedUser.idUser,
      title: 'IELTS Academic Reading Mock Test 1',
      description: 'A full Academic Reading passage with three question groups demonstrating all major crawl patterns.',
      testType: TestType.READING,
      duration: 3600,          // 60 minutes in seconds
      numberQuestion: 13,      // Total questions seeded here (Reading normally has 40)
      level: Level.Mid,
    },
  })
  console.log('  ✔  Reading test:', readingTest.idTest)

  // Part 1 — order: 0
  const readingPart = await prisma.part.create({
    data: {
      idTest: readingTest.idTest,
      namePart: 'Reading Passage 1',
      order: 0,
      // No audioUrl for Reading
    },
  })

  // Passage — the long text block
  await prisma.passage.create({
    data: {
      idPart: readingPart.idPart,
      title: 'The Hidden World of Deep-Sea Vents',
      numberParagraph: 6,
      content: `
<p><strong>A</strong> In the early 1970s, oceanographers using remote-controlled submersibles made one of the most astonishing discoveries in the history of biology: entire ecosystems thriving in the complete absence of sunlight at the bottom of the Pacific Ocean. These communities clustered around hydrothermal vents — fissures in the sea floor from which superheated, mineral-rich water gushes at temperatures exceeding 400 °C.</p>

<p><strong>B</strong> The vents themselves are formed through a process of tectonic plate divergence. As plates pull apart, seawater seeps into cracks, is heated by magma, and re-emerges laden with hydrogen sulphide and other compounds. Chemosynthetic bacteria oxidise these chemicals to produce energy — a biological process that mirrors photosynthesis in function but requires no sunlight whatsoever.</p>

<p><strong>C</strong> The bacterial mats that coat the vent surroundings form the base of a complex food web. Tube worms up to two metres long, giant clams, ghostly white crabs, and exotic shrimp have all evolved specialised anatomies to exploit this sunless cornucopia. The tube worm <em>Riftia pachyptila</em> has no mouth or digestive tract; it feeds entirely through a symbiotic relationship with the chemosynthetic bacteria it harbours in a specialised organ called the trophosome.</p>

<p><strong>D</strong> Scientists were initially baffled by the extreme conditions these organisms tolerate. Pressures at vent depths can exceed 250 atmospheres — enough to crush unprotected submarines. Yet vent fauna appear untroubled. Research has revealed a suite of molecular adaptations: heat-stable enzymes, pressure-resistant cell membranes, and novel antioxidant pathways that neutralise the reactive compounds found in vent fluids.</p>

<p><strong>E</strong> The discovery of vent ecosystems has had profound implications for the search for extraterrestrial life. If life can flourish without sunlight on Earth, it may do so in the subsurface oceans of Jupiter's moon Europa or Saturn's moon Enceladus, where hydrothermal activity is strongly suspected. Several space agencies have proposed dedicated missions to probe these icy moons.</p>

<p><strong>F</strong> Despite their scientific importance, deep-sea vents face growing threats. Mining companies have identified vent fields as rich sources of polymetallic sulphides — ores containing copper, zinc, gold, and silver. The first deep-sea mining licences were granted in the 2010s, and environmental campaigners warn that even a single mining operation could permanently destroy a unique biological community that took thousands of years to establish.</p>
      `.trim(),
      description: 'An academic passage about hydrothermal vent ecosystems, their biology, and conservation challenges.',
    },
  })

  // --------------------------------------------------------------------------
  // Reading QuestionGroup 1 — TRUE_FALSE_NOT_GIVEN (Questions 1-5, order: 0)
  //
  // CRAWLER SIGNAL: Instructions contain "TRUE, FALSE or NOT GIVEN"
  //                 AND "agree with the information"
  // --------------------------------------------------------------------------
  let globalQNum = 1  // ← This counter MUST persist across all groups in one test

  const tfngGroup = await prisma.questionGroup.create({
    data: {
      idPart: readingPart.idPart,
      title: 'Questions 1–5: True, False, Not Given',
      instructions:
        'Do the following statements agree with the information given in the Reading Passage?\n'
        + 'Write:\n'
        + '  TRUE       if the statement agrees with the information\n'
        + '  FALSE      if the statement contradicts the information\n'
        + '  NOT GIVEN  if there is no information on this',
      questionType: QuestionType.TRUE_FALSE_NOT_GIVEN,
      order: 0,
    },
  })

  // Seed questions 1-5: TRUE_FALSE_NOT_GIVEN
  // Each question's metadata must conform to TrueFalseNotGivenMetadata
  const tfngData: { content: string; answer: 'TRUE' | 'FALSE' | 'NOT GIVEN' }[] = [
    {
      content: 'Hydrothermal vents were first discovered in the 1970s.',
      answer: 'TRUE',
    },
    {
      content: 'The water that emerges from hydrothermal vents contains hydrogen sulphide.',
      answer: 'TRUE',
    },
    {
      content: 'Riftia pachyptila digests food using a specialised stomach.',
      answer: 'FALSE',   // It has NO digestive tract
    },
    {
      content: 'Deep-sea vent organisms have been exported to aquariums around the world.',
      answer: 'NOT GIVEN',
    },
    {
      content: 'Mining companies have received legal permission to extract minerals from vent sites.',
      answer: 'TRUE',
    },
  ]

  for (let i = 0; i < tfngData.length; i++) {
    const d = tfngData[i]
    const meta: TrueFalseNotGivenMetadata = {
      statement: d.content,   // mirrors Question.content — stored redundantly for crawler convenience
      answer: d.answer,
    }
    await prisma.question.create({
      data: {
        idQuestionGroup: tfngGroup.idQuestionGroup,
        idPart: readingPart.idPart,
        questionNumber: globalQNum++,  // 1, 2, 3, 4, 5
        content: d.content,
        questionType: QuestionType.TRUE_FALSE_NOT_GIVEN,
        order: i,                      // 0, 1, 2, 3, 4
        metadata: toJson(meta),
      },
    })
  }

  // --------------------------------------------------------------------------
  // Reading QuestionGroup 2 — MATCHING_HEADING (Questions 6-9, order: 1)
  //
  // CRAWLER SIGNAL: Instructions contain "choose the correct heading"
  //                 AND lists headings (i, ii, iii…)
  //
  // NOTE: headingBank is stored on EVERY question in the group because the
  // database has no group-level metadata column. The crawler must deduplicate
  // it when rendering the UI — only render the bank once per group.
  // --------------------------------------------------------------------------
  const headingGroup = await prisma.questionGroup.create({
    data: {
      idPart: readingPart.idPart,
      title: 'Questions 6–9: Matching Headings',
      instructions:
        'The Reading Passage has six paragraphs, A–F.\n'
        + 'Choose the correct heading for Paragraphs B–E from the list of headings below.\n'
        + 'NB: There are more headings than paragraphs, so you will not use all of them.',
      questionType: QuestionType.MATCHING_HEADING,
      order: 1,
    },
  })

  // Shared heading bank (i–viii)
  const headingBank = [
    'i.   The threat posed by commercial exploitation',
    'ii.  Life without light: the chemical basis of energy',
    'iii. Molecular strategies for surviving extreme conditions',
    'iv.  Possible implications for life beyond Earth',
    'v.   A surprising discovery on the ocean floor',
    'vi.  The varied species that populate vent ecosystems',
    'vii. The political response to deep-sea mining',
    'viii.How geological forces create vent structures',
  ]

  const matchingHeadingData: { paragraphLabel: string; correctHeading: string }[] = [
    { paragraphLabel: 'B', correctHeading: headingBank[7] },  // viii
    { paragraphLabel: 'C', correctHeading: headingBank[5] },  // vi
    { paragraphLabel: 'D', correctHeading: headingBank[2] },  // iii
    { paragraphLabel: 'E', correctHeading: headingBank[3] },  // iv
  ]

  for (let i = 0; i < matchingHeadingData.length; i++) {
    const d = matchingHeadingData[i]
    const meta: MatchingHeadingMetadata = {
      paragraphLabel: d.paragraphLabel,
      headingBank,                    // Full bank on every question
      correctHeading: d.correctHeading,
    }
    await prisma.question.create({
      data: {
        idQuestionGroup: headingGroup.idQuestionGroup,
        idPart: readingPart.idPart,
        questionNumber: globalQNum++,  // 6, 7, 8, 9
        content: `Choose the correct heading for Paragraph ${d.paragraphLabel}.`,
        questionType: QuestionType.MATCHING_HEADING,
        order: i,
        metadata: toJson(meta),
      },
    })
  }

  // --------------------------------------------------------------------------
  // Reading QuestionGroup 3 — SUMMARY_COMPLETION (Questions 10-13, order: 2)
  //
  // CRAWLER SIGNAL: Instructions contain "complete the summary"
  //                 AND a word box is present (wordBank[] populated)
  // --------------------------------------------------------------------------
  const summaryGroup = await prisma.questionGroup.create({
    data: {
      idPart: readingPart.idPart,
      title: 'Questions 10–13: Summary Completion',
      instructions:
        'Complete the summary below.\n'
        + 'Choose NO MORE THAN TWO WORDS from the passage for each answer.\n'
        + 'Write your answers in boxes 10–13 on your answer sheet.',
      questionType: QuestionType.SUMMARY_COMPLETION,
      order: 2,
    },
  })

  // Summary paragraph — each blank is one question
  // The ____ markers correspond to Questions 10, 11, 12, 13 in order.
  const summaryParagraph =
    'Hydrothermal vents support ecosystems that rely on ____(10)____ bacteria '
    + 'which convert chemicals — particularly ____(11)____ — into energy. '
    + 'These communities may help scientists understand whether life could '
    + 'exist on moons such as Europa or ____(12)____, which are believed to '
    + 'harbour subsurface ____(13)____.'

  const summaryData: {
    content: string
    summaryContext: string
    wordBank: string[]
    acceptedAnswers: string[]
  }[] = [
    {
      content: 'What type of bacteria form the base of vent ecosystems?',
      summaryContext: 'rely on ____(10)____ bacteria which convert chemicals',
      wordBank: ['chemosynthetic', 'photosynthetic', 'hydrogen sulphide', 'Enceladus', 'oceans', 'Europa'],
      acceptedAnswers: ['chemosynthetic'],
    },
    {
      content: 'Which chemical do vent bacteria primarily convert?',
      summaryContext: 'convert chemicals — particularly ____(11)____ — into energy',
      wordBank: ['chemosynthetic', 'photosynthetic', 'hydrogen sulphide', 'Enceladus', 'oceans', 'Europa'],
      acceptedAnswers: ['hydrogen sulphide'],
    },
    {
      content: 'Besides Europa, which moon is mentioned as a candidate for hydrothermal life?',
      summaryContext: 'moons such as Europa or ____(12)____',
      wordBank: ['chemosynthetic', 'photosynthetic', 'hydrogen sulphide', 'Enceladus', 'oceans', 'Europa'],
      acceptedAnswers: ['enceladus', 'Enceladus'],
    },
    {
      content: 'What do these moons harbour beneath their surfaces?',
      summaryContext: 'believed to harbour subsurface ____(13)____',
      wordBank: ['chemosynthetic', 'photosynthetic', 'hydrogen sulphide', 'Enceladus', 'oceans', 'Europa'],
      acceptedAnswers: ['oceans'],
    },
  ]

  for (let i = 0; i < summaryData.length; i++) {
    const d = summaryData[i]
    const meta: SummaryCompletionMetadata = {
      wordLimit: 'NO MORE THAN TWO WORDS',
      wordBank: d.wordBank,
      summaryContext: d.summaryContext,
      acceptedAnswers: d.acceptedAnswers,
    }
    await prisma.question.create({
      data: {
        idQuestionGroup: summaryGroup.idQuestionGroup,
        idPart: readingPart.idPart,
        questionNumber: globalQNum++,   // 10, 11, 12, 13
        content: d.content,
        questionType: QuestionType.SUMMARY_COMPLETION,
        order: i,
        metadata: toJson(meta),
      },
    })
  }

  console.log('  ✔  Reading test seeded (13 questions, 3 groups)')

  // ==========================================================================
  // LISTENING TEST
  // ==========================================================================
  //
  // STRUCTURE: 1 Test → 1 Part (with part-level audioUrl) → 2 QuestionGroups
  //
  // KEY DIFFERENCE from Reading:
  //   • Test.audioUrl OR Part.audioUrl holds the media file.
  //   • Passage is usually NOT created for Listening (questions reference
  //     audio directly). Some crawlers may create a Passage to store a
  //     transcript — that is valid but optional.
  //   • Section headings: "Section 1", "Section 2", "Section 3", "Section 4"
  // ==========================================================================

  const listeningTest = await prisma.test.create({
    data: {
      idUser: seedUser.idUser,
      title: 'IELTS Listening Mock Test 1',
      description: 'A Listening section demonstrating MULTIPLE_CHOICE and DIAGRAM_LABELING crawl patterns.',
      testType: TestType.LISTENING,
      duration: 1800,        // 30 minutes
      numberQuestion: 8,
      audioUrl: 'https://cdn.ielts.dev/audio/mock1_master.mp3',  // Master audio
      level: Level.Mid,
    },
  })
  console.log('  ✔  Listening test:', listeningTest.idTest)

  // Section 1 — Part.audioUrl can hold a section-specific clip
  const listeningPart = await prisma.part.create({
    data: {
      idTest: listeningTest.idTest,
      namePart: 'Section 1',
      order: 0,
      audioUrl: 'https://cdn.ielts.dev/audio/mock1_section1.mp3',
    },
  })

  // --------------------------------------------------------------------------
  // Listening QuestionGroup 1 — MULTIPLE_CHOICE (Questions 1-4, order: 0)
  //
  // CRAWLER SIGNAL: Radio buttons / lettered options + "Choose ONE letter"
  // --------------------------------------------------------------------------
  let listeningQNum = 1

  const mcGroup = await prisma.questionGroup.create({
    data: {
      idPart: listeningPart.idPart,
      title: 'Questions 1–4: Multiple Choice',
      instructions:
        'Choose the correct letter, A, B or C.',
      questionType: QuestionType.MULTIPLE_CHOICE,
      order: 0,
    },
  })

  const mcData: {
    content: string
    options: string[]
    correctAnswers: string[]
  }[] = [
    {
      content: 'Why does the woman want to cancel her gym membership?',
      options: ['She is moving to another city.', 'She cannot afford the fees.', 'She has a new work schedule.'],
      correctAnswers: ['She cannot afford the fees.'],
    },
    {
      content: 'What is the notice period required to cancel the membership?',
      options: ['Two weeks', 'One month', 'Three months'],
      correctAnswers: ['One month'],
    },
    {
      content: 'Which form of refund does the gym offer?',
      options: ['Cash', 'Bank transfer', 'Credit to the account'],
      correctAnswers: ['Credit to the account'],
    },
    {
      // Multi-select example — "Choose TWO"
      content: 'Which TWO facilities will the woman lose access to immediately?',
      options: ['Swimming pool', 'Sauna', 'Fitness classes', 'Car park'],
      correctAnswers: ['Swimming pool', 'Sauna'],
    },
  ]

  for (let i = 0; i < mcData.length; i++) {
    const d = mcData[i]
    const meta: MultipleChoiceMetadata = {
      options: d.options,
      correctAnswers: d.correctAnswers,
      maxSelections: d.correctAnswers.length,  // 1 for single, 2 for the last question
    }
    await prisma.question.create({
      data: {
        idQuestionGroup: mcGroup.idQuestionGroup,
        idPart: listeningPart.idPart,
        questionNumber: listeningQNum++,
        content: d.content,
        questionType: QuestionType.MULTIPLE_CHOICE,
        order: i,
        metadata: toJson(meta),
      },
    })
  }

  // --------------------------------------------------------------------------
  // Listening QuestionGroup 2 — DIAGRAM_LABELING (Questions 5-8, order: 1)
  //
  // CRAWLER SIGNAL: Image/map with numbered callouts + short text inputs
  //
  // IMPORTANT: imageUrl is REQUIRED on the QuestionGroup.
  //            If crawling a site that uses an inline SVG, render it to PNG
  //            and upload to CDN first, then store the URL.
  // --------------------------------------------------------------------------
  const diagramGroup = await prisma.questionGroup.create({
    data: {
      idPart: listeningPart.idPart,
      title: 'Questions 5–8: Map Labelling',
      instructions:
        'Label the map below. Write ONE WORD ONLY for each answer.',
      questionType: QuestionType.DIAGRAM_LABELING,
      order: 1,
      imageUrl: 'https://cdn.ielts.dev/images/mock1_section1_map.png',
    },
  })

  const diagramData: {
    content: string
    labelPosition: string
    labelCoordinates: { x: number; y: number }
    acceptedAnswers: string[]
  }[] = [
    {
      content: 'What is located at position 5 on the map?',
      labelPosition: 'North-east corner of the recreation centre',
      labelCoordinates: { x: 72, y: 18 },
      acceptedAnswers: ['reception', 'Reception'],
    },
    {
      content: 'What is located at position 6 on the map?',
      labelPosition: 'Centre of the building, adjacent to the main hall',
      labelCoordinates: { x: 48, y: 50 },
      acceptedAnswers: ['café', 'cafe', 'Café', 'Cafe'],
    },
    {
      content: 'What is located at position 7 on the map?',
      labelPosition: 'South-west corner',
      labelCoordinates: { x: 12, y: 82 },
      acceptedAnswers: ['library', 'Library'],
    },
    {
      content: 'What is located at position 8 on the map?',
      labelPosition: 'Outside, east of the main entrance',
      labelCoordinates: { x: 88, y: 60 },
      acceptedAnswers: ['car park', 'carpark', 'parking'],
    },
  ]

  for (let i = 0; i < diagramData.length; i++) {
    const d = diagramData[i]
    const meta: DiagramLabelingMetadata = {
      wordLimit: 'ONE WORD ONLY',
      wordBank: [],            // No word box for this question type in this group
      labelPosition: d.labelPosition,
      labelCoordinates: d.labelCoordinates,
      acceptedAnswers: d.acceptedAnswers,
    }
    await prisma.question.create({
      data: {
        idQuestionGroup: diagramGroup.idQuestionGroup,
        idPart: listeningPart.idPart,
        questionNumber: listeningQNum++,
        content: d.content,
        questionType: QuestionType.DIAGRAM_LABELING,
        order: i,
        metadata: toJson(meta),
      },
    })
  }

  console.log('  ✔  Listening test seeded (8 questions, 2 groups)')

  // ==========================================================================
  // WRITING TEST
  // ==========================================================================
  //
  // STRUCTURE: 1 Test → 2 WritingTask records (TASK1 + TASK2)
  //
  // NO Parts, Passages, or Questions. Writing assessment is fully human/AI-graded
  // via the UserWritingSubmission model (async, RabbitMQ-backed).
  //
  // CRAWLER SIGNAL:
  //   TASK1: Contains an image (chart/graph/map/process diagram) AND
  //          "Write at least 150 words" or "spend about 20 minutes"
  //   TASK2: No image (or image is decoration), "Write at least 250 words",
  //          "Give reasons for your answer and include relevant examples"
  // ==========================================================================

  const writingTest = await prisma.test.create({
    data: {
      idUser: seedUser.idUser,
      title: 'IELTS Academic Writing Mock Test 1',
      description: 'Full Academic Writing paper: Task 1 (data description) and Task 2 (discursive essay).',
      testType: TestType.WRITING,
      duration: 3600,    // 60 minutes total
      numberQuestion: 2, // 2 tasks = 2 "questions"
      level: Level.Mid,
    },
  })
  console.log('  ✔  Writing test:', writingTest.idTest)

  // TASK 1 — Describe a visual stimulus (chart / graph / map / process)
  await prisma.writingTask.create({
    data: {
      idTest: writingTest.idTest,
      title: 'Writing Task 1 — Bar Chart Description',
      taskType: WritingTaskType.TASK1,
      timeLimit: 1200,   // ~20 minutes in seconds
      image: 'https://cdn.ielts.dev/images/mock1_writing_task1_chart.png',
      instructions:
        'The bar chart below shows the percentage of households in five European countries '
        + 'that owned a computer in 2002, 2007, and 2012.\n\n'
        + 'Summarise the information by selecting and reporting the main features, '
        + 'and make comparisons where relevant.\n\n'
        + 'Write at least 150 words.',
    },
  })

  // TASK 2 — Discursive essay (no image)
  await prisma.writingTask.create({
    data: {
      idTest: writingTest.idTest,
      title: 'Writing Task 2 — Discussion Essay',
      taskType: WritingTaskType.TASK2,
      timeLimit: 2400,   // ~40 minutes in seconds
      image: null,
      instructions:
        'Some people believe that universities should focus only on academic subjects '
        + 'and not offer vocational courses such as tourism or event management.\n\n'
        + 'To what extent do you agree or disagree?\n\n'
        + 'Give reasons for your answer and include any relevant examples from '
        + 'your own knowledge or experience.\n\n'
        + 'Write at least 250 words.',
    },
  })

  console.log('  ✔  Writing test seeded (2 tasks)')

  // ==========================================================================
  // SPEAKING TEST
  // ==========================================================================
  //
  // STRUCTURE: 1 Test → 3 SpeakingTask records (PART1, PART2, PART3)
  //                       → SpeakingQuestion records per task
  //
  // CRAWLER SIGNAL:
  //   PART1: Conversational questions on familiar topics (2-3 topics × 2-3 Qs)
  //          preparationTime = 0, speakingTime = ~30s per question
  //   PART2: Single cue card with 1 topic + 3-4 sub-prompts (bullet points)
  //          preparationTime = 60, speakingTime = 120 (1 minute prep, 2 min talk)
  //          subPrompts JSON stores the bullet points
  //   PART3: Abstract discussion questions linked thematically to Part 2 topic
  //          preparationTime = 0, speakingTime = ~60-90s per question
  //
  // NOTE: @@unique([idTest, part]) on SpeakingTask means only ONE task per part
  //       type per test. Crawlers must not create duplicates.
  // ==========================================================================

  const speakingTest = await prisma.test.create({
    data: {
      idUser: seedUser.idUser,
      title: 'IELTS Speaking Mock Test 1',
      description: 'Full Speaking paper across all three parts.',
      testType: TestType.SPEAKING,
      duration: 900,    // ~15 minutes
      numberQuestion: 9,
      level: Level.Mid,
    },
  })
  console.log('  ✔  Speaking test:', speakingTest.idTest)

  // --------------------------------------------------------------------------
  // PART 1 — Interview / Familiar Topics
  // --------------------------------------------------------------------------
  const speakingPart1 = await prisma.speakingTask.create({
    data: {
      idTest: speakingTest.idTest,
      title: 'Speaking Part 1 — Introduction & Interview',
      part: SpeakingPartType.PART1,
    },
  })

  // Topic 1: Hometown — 3 questions
  const part1Questions: {
    topic: string
    prompt: string
    preparationTime: number
    speakingTime: number
    order: number
  }[] = [
    {
      topic: 'Hometown',
      prompt: 'Where are you from originally?',
      preparationTime: 0,
      speakingTime: 30,
      order: 0,
    },
    {
      topic: 'Hometown',
      prompt: 'What do you like most about your hometown?',
      preparationTime: 0,
      speakingTime: 30,
      order: 1,
    },
    {
      topic: 'Work and Study',
      prompt: 'Are you currently working or studying?',
      preparationTime: 0,
      speakingTime: 30,
      order: 2,
    },
    {
      topic: 'Work and Study',
      prompt: 'What do you enjoy most about your work or studies?',
      preparationTime: 0,
      speakingTime: 30,
      order: 3,
    },
  ]

  for (const q of part1Questions) {
    await prisma.speakingQuestion.create({
      data: {
        idSpeakingTask: speakingPart1.idSpeakingTask,
        ...q,
        subPrompts: Prisma.JsonNull,  // Part 1 never has sub-prompts
      },
    })
  }

  // --------------------------------------------------------------------------
  // PART 2 — Long Turn (Cue Card)
  //
  // subPrompts JSON structure:
  //   {
  //     "bulletPoints": string[]   // The bullet points on the cue card
  //   }
  //
  // CRAWLER NOTES:
  //   - The main topic goes in `prompt` (the "Describe a..." stem)
  //   - Bullet points ("You should say:") go in subPrompts.bulletPoints[]
  //   - Follow-up question (asked after the 2-minute talk) is a separate
  //     SpeakingQuestion record with order = 1 and no subPrompts.
  // --------------------------------------------------------------------------
  const speakingPart2 = await prisma.speakingTask.create({
    data: {
      idTest: speakingTest.idTest,
      title: 'Speaking Part 2 — Long Turn',
      part: SpeakingPartType.PART2,
    },
  })

  // Cue card (order: 0)
  await prisma.speakingQuestion.create({
    data: {
      idSpeakingTask: speakingPart2.idSpeakingTask,
      topic: 'A memorable journey',
      prompt: 'Describe a journey you have taken that was particularly memorable.',
      subPrompts: {
        bulletPoints: [
          'where you went',
          'who you travelled with',
          'what happened during the journey',
          'and explain why this journey was so memorable for you',
        ],
      },
      preparationTime: 60,   // 1 minute to prepare
      speakingTime: 120,     // 2 minutes to speak
      order: 0,
    },
  })

  // Follow-up question (order: 1) — asked by examiner after the 2-minute talk
  await prisma.speakingQuestion.create({
    data: {
      idSpeakingTask: speakingPart2.idSpeakingTask,
      topic: 'A memorable journey',
      prompt: 'Would you like to make that same journey again in the future?',
      subPrompts: Prisma.JsonNull,
      preparationTime: 0,
      speakingTime: 30,
      order: 1,
    },
  })

  // --------------------------------------------------------------------------
  // PART 3 — Two-Way Discussion (thematically linked to Part 2 topic)
  // --------------------------------------------------------------------------
  const speakingPart3 = await prisma.speakingTask.create({
    data: {
      idTest: speakingTest.idTest,
      title: 'Speaking Part 3 — Discussion',
      part: SpeakingPartType.PART3,
    },
  })

  const part3Questions: { prompt: string; order: number }[] = [
    {
      prompt: 'How has the way people travel changed over the past few decades?',
      order: 0,
    },
    {
      prompt: 'Do you think international tourism has a positive or negative impact on local communities?',
      order: 1,
    },
    {
      prompt: 'Some people argue that frequent travel is harmful to the environment. How far do you agree?',
      order: 2,
    },
  ]

  for (const q of part3Questions) {
    await prisma.speakingQuestion.create({
      data: {
        idSpeakingTask: speakingPart3.idSpeakingTask,
        topic: 'Travel and Tourism',
        prompt: q.prompt,
        subPrompts: Prisma.JsonNull,
        preparationTime: 0,
        speakingTime: 90,
        order: q.order,
      },
    })
  }

  console.log('  ✔  Speaking test seeded (3 parts, 9 questions)')
  console.log('')
  console.log('🎉  Seed complete!')
  console.log('   Reading  :', readingTest.idTest)
  console.log('   Listening:', listeningTest.idTest)
  console.log('   Writing  :', writingTest.idTest)
  console.log('   Speaking :', speakingTest.idTest)
}

main()
  .catch((e) => {
    console.error('❌  Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
