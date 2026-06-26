import { QuestionType } from '@prisma/client';
import { TestType } from '../dto/upload-pdf.dto';
import { StructureAnalyzerService } from './structure-analyzer.service';

describe('StructureAnalyzerService', () => {
  let service: StructureAnalyzerService;

  beforeEach(() => {
    service = new StructureAnalyzerService();
  });

  it('builds IELTS-like listening MCQ groups from Section text', async () => {
    const result = await service.analyze(
      {
        title: 'IELTS Listening Practice',
        level: 'Mid',
        rawText: `
Section 1
Questions 1-2
Choose the correct letter, A, B or C.
1 Where will the tour start?
A At the station
B At the museum
C At the harbour
2 How long will the walk last?
A One hour
B Two hours
C Three hours
        `,
        pages: [],
        blocks: [],
      },
      TestType.LISTENING,
    );

    expect(result.data.parts).toHaveLength(1);
    expect(result.data.parts?.[0].namePart).toBe('Section 1');
    expect(result.data.parts?.[0].questionGroups).toHaveLength(1);

    const group = result.data.parts?.[0].questionGroups[0];
    expect(group?.questionType).toBe(QuestionType.MULTIPLE_CHOICE);
    expect(group?.questions).toHaveLength(2);

    const firstQuestion = group?.questions[0];
    expect(firstQuestion?.questionNumber).toBe(1);
    expect(firstQuestion?.content).toBe('Where will the tour start?');
    expect(firstQuestion?.metadata).toMatchObject({
      type: QuestionType.MULTIPLE_CHOICE,
      isMultiSelect: false,
    });
    expect((firstQuestion?.metadata as any).options).toEqual([
      { label: 'A', text: 'At the station' },
      { label: 'B', text: 'At the museum' },
      { label: 'C', text: 'At the harbour' },
    ]);
  });

  it('normalizes summary completion blanks to actual IELTS question numbers', async () => {
    const result = await service.analyze(
      {
        title: 'IELTS Reading Practice',
        level: 'High',
        rawText: `
Part 1
The history of the museum
The museum was founded in the city centre and later expanded into a larger public learning space.
It now hosts exhibitions, lectures and school visits throughout the year.

Questions 6-8
Complete the summary below.
Write NO MORE THAN TWO WORDS for each answer.
Summary
The museum was designed by ____ and uses ____ materials from the old ____.
        `,
        pages: [],
        blocks: [],
      },
      TestType.READING,
    );

    expect(result.data.parts).toHaveLength(1);
    expect(result.data.parts?.[0].passage?.content).toContain(
      'The museum was founded',
    );

    const group = result.data.parts?.[0].questionGroups[0];
    expect(group?.questionType).toBe(QuestionType.SUMMARY_COMPLETION);
    expect(group?.questions.map((question) => question.questionNumber)).toEqual(
      [6, 7, 8],
    );

    const firstQuestion = group?.questions[0];
    expect(firstQuestion?.content).toContain('[6]');
    expect(firstQuestion?.content).toContain('[7]');
    expect(firstQuestion?.content).toContain('[8]');
    expect(firstQuestion?.metadata).toMatchObject({
      type: QuestionType.SUMMARY_COMPLETION,
      blankLabel: '6',
      maxWords: 2,
      hasWordBank: false,
    });
  });

  it('treats no-more-than-words groups as short answer instead of empty MCQ', async () => {
    const result = await service.analyze(
      {
        title: 'IELTS Reading Practice',
        level: 'Mid',
        rawText: `
Part 1
Questions 14-17
Answer the questions. Choose NO MORE THAN TWO WORDS from the passage for each answer.
14 Broadly, what do staff need in order to most benefit a company?
15 Which people advise envisioning?
16 What do they believe a lack of vision might cause?
17 What aspect can groups of people never have in common?
        `,
        pages: [],
        blocks: [],
      },
      TestType.READING,
    );

    const group = result.data.parts?.[0].questionGroups[0];
    expect(group?.questionType).toBe(QuestionType.SHORT_ANSWER);
    expect(group?.questions).toHaveLength(4);
    expect(group?.questions[0].metadata).toMatchObject({
      type: QuestionType.SHORT_ANSWER,
      maxWords: 2,
      correctAnswers: [],
    });
  });

  it('drops page artifacts and writing spillover from reading MCQ groups', async () => {
    const result = await service.analyze(
      {
        title: 'IELTS Reading Practice',
        level: 'High',
        rawText: `
Part 1
Questions 11-13
Choose the correct letter, A, B, C, or D.
11 Vintage wines are
A mostly better.
B often preferred.
C often discussed.
D more costly. http://ieltscuecard.trendinggyan.com/ Page 3 That Vision Thing

Questions 36-40
Give TWO examples of the following categories. Choose NO MORE THAN TWO WORDS from the passage for
36 each example.
37 Workers need tangible rewards.
38 Task 2 -
39 Some people think that children under 18 years old should receive full-time education.
40 To what extent do you agree or disagree?
        `,
        pages: [],
        blocks: [],
      },
      TestType.READING,
    );

    expect(result.data.parts).toHaveLength(2);

    const mcqGroup = result.data.parts?.[0].questionGroups[0];
    expect(mcqGroup?.questionType).toBe(QuestionType.MULTIPLE_CHOICE);
    expect(mcqGroup?.questions[0].metadata).toMatchObject({
      type: QuestionType.MULTIPLE_CHOICE,
      options: [
        { label: 'A', text: 'mostly better.' },
        { label: 'B', text: 'often preferred.' },
        { label: 'C', text: 'often discussed.' },
        { label: 'D', text: 'more costly.' },
      ],
    });

    const finalGroup = result.data.parts?.[1].questionGroups[0];
    expect(finalGroup?.questionType).toBe(QuestionType.SHORT_ANSWER);
    expect(
      finalGroup?.questions.map((question) => question.questionNumber),
    ).toEqual([36, 37]);
    expect(
      finalGroup?.questions.some((question) =>
        /Task 2/i.test(question.content),
      ),
    ).toBe(false);
  });

  it('detects matching sentence endings instead of plain multiple choice', async () => {
    const result = await service.analyze(
      {
        title: 'IELTS Reading Practice',
        level: 'High',
        rawText: `
Part 3
Questions 37-40
Complete each of the following statements (Questions 37-40) with the best ending (A-G) from the box below.
37 Maillart designed the hollow-box arch in order to
38 Following the construction of the Tavanasa Bridge, Maillart failed to
39 The transverse walls of the Flienglibach Bridge allowed Maillart to
40 Of all his bridges, the Salginatobel enabled Maillart to
A prove that local people were wrong.
B find work in Switzerland.
C win more building commissions.
D reduce the amount of raw material required.
E recognise his technical skills.
F capitalise on the spectacular terrain.
G improve the appearance of his bridges.
        `,
        pages: [],
        blocks: [],
      },
      TestType.READING,
    );

    const group = result.data.parts?.[0].questionGroups[0];
    expect(group?.questionType).toBe(QuestionType.MATCHING_SENTENCE_ENDINGS);
    expect(group?.questions).toHaveLength(4);
    expect(group?.questions[0].metadata).toMatchObject({
      type: QuestionType.MATCHING_SENTENCE_ENDINGS,
      correctEndingLabel: null,
    });
    expect((group?.questions[0].metadata as any).endings).toHaveLength(7);
  });

  it('removes repeated page artifacts from profile before analysis', async () => {
    const result = await service.analyze(
      {
        title: 'IELTS Reading Practice',
        level: 'Mid',
        rawText: `
IELTS READING TEST 3
Part 1
Questions 1-2
Choose the correct letter, A, B or C.
1 Why do people volunteer?
A To earn money
B To learn skills
C To travel

IELTS READING TEST 3
Page 2
Questions 3-4
Choose the correct letter, A, B or C.
3 What do volunteers gain?
A Confidence
B Fame
C Time off
4 Why do groups need volunteers?
A To cut costs
B To replace staff
C To support projects
        `,
        pages: [],
        blocks: [],
        profile: {
          pageCount: 2,
          averageCharsPerPage: 220,
          likelyImageBased: false,
          likelyMultiColumn: false,
          repeatedArtifacts: ['IELTS READING TEST 3'],
        },
      },
      TestType.READING,
    );

    expect(result.data.parts?.[0].questionGroups).toHaveLength(2);
    expect(result.data.parts?.[0].questionGroups[0].questions[0].content).toBe(
      'Why do people volunteer?',
    );
    expect(
      result.warnings.some((warning) =>
        /Low reading question coverage detected/i.test(warning),
      ),
    ).toBe(true);
  });

  it('extracts MATCHING_INFORMATION from Docling markdown', async () => {
    const result = await service.analyze(
      {
        title: 'IELTS Reading Practice',
        level: 'Mid',
        rawText: `
Part 2
## Questions14-17
ReadingPassage2hassevensections,A-G.
Which sectioncontainsthefollowinginformation?
Writethecorrectletter,A-G,inboxes14-17onyouranswersheet.
NB Youmayuseanylettermorethanonce.
- 14 amentionofnegativeattitudestowardsstadiumbuildingprojects
- 15 figuresdemonstratingtheenvironmentalbenefitsofacertainstadium
- 16 examplesofthewiderangeoffacilitiesavailableatsomenewstadiums
- 17 referencetothedisadvantagesofthestadiumsbuiltduringacertainera
        `,
        pages: [],
        blocks: [],
      },
      TestType.READING,
    );

    const group = result.data.parts?.[0].questionGroups[0];
    expect(group?.questionType).toBe(QuestionType.MATCHING_INFORMATION);
    expect(group?.questions).toHaveLength(4);
    expect(group?.questions[0].questionNumber).toBe(14);
    expect((group?.questions[0].metadata as any).paragraphLabels).toEqual([
      'A',
      'B',
      'C',
      'D',
      'E',
      'F',
      'G',
    ]);
  });

  it('extracts SUMMARY_COMPLETION with inline markers', async () => {
    const result = await service.analyze(
      {
        title: 'IELTS Reading Practice',
        level: 'Mid',
        rawText: `
Part 2
## Questions18-22
Completethesummarybelow.
ChooseONEWORDONLYfromthepassageforeachanswer.
Writeyour answersinboxes18-22onyouranswersheet.
## Romanamphitheatres
TheRomanstadiumsof Europe haveprovedveryversatile.The amphitheatre of Arles,forexample,wasconvertedfirstintoa18. ,then into aresidentialareaandfinallyintoanarenawherespectatorscouldwatch 19 Meanwhile,thearenainVerona,oneoftheoldest Romanamphitheatres,isfamoustodayasavenuewhere20 is performed. The site of Lucca's amphitheatre has also been used for many purposesoverthecenturies,includingthestorageof21 It isnowamarketsquarewith22. andhomesincorporated into theremainsoftheRomanamphitheatre.
        `,
        pages: [],
        blocks: [],
      },
      TestType.READING,
    );

    const group = result.data.parts?.[0].questionGroups[0];
    expect(group?.questionType).toBe(QuestionType.SUMMARY_COMPLETION);
    expect(group?.questions).toHaveLength(5);
    expect(group?.questions.map((q) => q.questionNumber)).toEqual([
      18, 19, 20, 21, 22,
    ]);
  });

  it('extracts MULTIPLE_CHOICE from markdown list stems + options', async () => {
    const result = await service.analyze(
      {
        title: 'IELTS Reading Practice',
        level: 'Mid',
        rawText: `
Part 3
## Questions36-40
Choosethecorrectletter,A,B,orD
Writethecorrectletterinboxes36-40onyouranswersheet.
- 36What is the reviewer's main purpose in the first paragraph?
- A to describewhat happened duringtheBattleof Worcester
- B to giveanaccountofthecircumstancesleadingtoCharlesIl'sescape
- C to providedetailsoftheParliamentarians'politicalviews
- D to compareCharlesIl'sbeliefswiththoseofhisfather
- 37 Why does thereviewer includeexamplesof thefugitives'behaviourin the third paragraph?
- A toexplainhowcloseCharlesllcametolosinghislife
- B
- C toillustratehowtheeventsofthesixweeksarebroughttolife
- D toarguethatcertain aspectsarenotaswellknownastheyshouldbe
        `,
        pages: [],
        blocks: [],
      },
      TestType.READING,
    );

    const group = result.data.parts?.[0].questionGroups[0];
    expect(group?.questionType).toBe(QuestionType.MULTIPLE_CHOICE);
    expect(group?.questions).toHaveLength(2);
    expect(group?.questions[0].questionNumber).toBe(36);
    const options = (group?.questions[0].metadata as any).options;
    expect(options).toHaveLength(4);
    expect(options.map((o: { label: string }) => o.label)).toEqual([
      'A',
      'B',
      'C',
      'D',
    ]);
  });

  it('extracts MATCHING_FEATURES with markdown options A-E', async () => {
    const result = await service.analyze(
      {
        title: 'IELTS Reading Practice',
        level: 'Mid',
        rawText: `
Part 2
Questions23and24
ChooseTwoletters,A-E.
Writethecorrectlettersinboxes23and24onyouranswersheet.
Whencomparingtwentieth-centurystadiumstoancientamphitheatresinSectionD, whichTwonegativefeaturesdoesthewritermention?
- 23 which negative feature of twentieth-century stadiums?
- 24 another negative feature
- A Theyarelessimaginativelydesigned.
- B They are less spacious.
- C Theyareinlessconvenientlocations.
- D They arelessversatile.
- E Theyaremadeoflessdurablematerials.
        `,
        pages: [],
        blocks: [],
      },
      TestType.READING,
    );

    const group = result.data.parts?.[0].questionGroups[0];
    expect(group?.questionType).toBe(QuestionType.MATCHING_FEATURES);
    expect(group?.questions).toHaveLength(2);
    const features = (group?.questions[0].metadata as any).features;
    expect(features.map((f: { label: string }) => f.label)).toEqual([
      'A',
      'B',
      'C',
      'D',
      'E',
    ]);
  });

  it('strips markdown heading prefix from group title and instructions', async () => {
    const result = await service.analyze(
      {
        title: 'IELTS Reading Practice',
        level: 'Mid',
        rawText: `
## Questions14-17
ReadingPassage2hassevensections,A-G.
Which sectioncontainsthefollowinginformation?
- 14 amentionofnegativeattitudestowardsstadiumbuildingprojects
- 15 figuresdemonstratingtheenvironmentalbenefitsofacertainstadium
- 16 examplesofthewiderangeoffacilitiesavailableatsomenewstadiums
- 17 referencetothedisadvantagesofthestadiumsbuiltduringacertainera
        `,
        pages: [],
        blocks: [],
      },
      TestType.READING,
    );

    const group = result.data.parts?.[0].questionGroups[0];
    expect(group?.title).toBe('Questions14-17');
    expect(group?.instructions ?? '').not.toMatch(/^##/);
    expect(group?.instructions ?? '').toContain(
      'Which sectioncontainsthefollowinginformation',
    );
  });

  it('drops ghost numbered markers outside the declared range', async () => {
    const result = await service.analyze(
      {
        title: 'IELTS Reading Practice',
        level: 'Mid',
        rawText: `
Questions1-6
- 1 Building therailwaywouldmakeitpossibletomovepeople tobetterhousing
- 2 anotherstem
8 strayloadoutnoise
- 3 thirdstem
        `,
        pages: [],
        blocks: [],
      },
      TestType.READING,
    );

    const group = result.data.parts?.[0].questionGroups[0];
    // Only 1, 2, 3 survive — the stray `8 strayloadoutnoise` is treated as
    // body of the current block, not a new question.
    expect(group?.questions.map((q) => q.questionNumber)).toEqual([1, 2, 3]);
    expect(
      group?.questions.some((q) => q.questionNumber === 8),
    ).toBe(false);
  });

  it('truncates the last block before the next group\'s passage bleed', async () => {
    const result = await service.analyze(
      {
        title: 'IELTS Reading Practice',
        level: 'Mid',
        rawText: `
Questions7-13
Do the following statements agree with the information given in Reading Passage 1?
- 7 OthercountrieshadbuiltundergroundrailwaysbeforetheMetropolitanline opened.
## READINGPASSAGE2
Youshouldspendabout20minutesonQuestions14-26,whicharebasedonReading Passage2below.
## Stadiums: past, present and future
- A Stadiumsareamongtheoldestformsofurbanarchitecture...
        `,
        pages: [],
        blocks: [],
      },
      TestType.READING,
    );

    const group = result.data.parts?.[0].questionGroups[0];
    expect(group?.questionType).toBe(QuestionType.TRUE_FALSE_NOT_GIVEN);
    expect(group?.questions).toHaveLength(1);
    const content = group?.questions[0].content ?? '';
    expect(content).not.toContain('## READINGPASSAGE');
    expect(content).not.toContain('Youshouldspendabout20minutesonQuestions14-26');
  });

  it('recovers MATCHING_FEATURES options A-E when stems are numbered', async () => {
    const result = await service.analyze(
      {
        title: 'IELTS Reading Practice',
        level: 'Mid',
        rawText: `
Questions23and24
ChooseTwoletters,A-E.
Writethecorrectlettersinboxes23and24onyouranswersheet.
- 23 which negative feature of twentieth-century stadiums?
- 24 another negative feature
- A Theyarelessimaginativelydesigned.
- B They are less spacious.
- C Theyareinlessconvenientlocations.
- D They arelessversatile.
- E Theyaremadeoflessdurablematerials.
        `,
        pages: [],
        blocks: [],
      },
      TestType.READING,
    );

    const group = result.data.parts?.[0].questionGroups[0];
    expect(group?.questionType).toBe(QuestionType.MATCHING_FEATURES);
    expect(group?.questions).toHaveLength(2);
    const features = (group?.questions[0].metadata as any).features;
    expect(features.map((f: { label: string }) => f.label)).toEqual([
      'A',
      'B',
      'C',
      'D',
      'E',
    ]);
  });

  it('strips word bank A-J from SUMMARY_COMPLETION last snippet', async () => {
    const result = await service.analyze(
      {
        title: 'IELTS Reading Practice',
        level: 'Mid',
        rawText: `
Questions27-31
Completethesummaryusingthelistofphrases,A-J,below.
Writethecorrectletter,A-J,inboxes27-31onyouranswersheet.
..withtheScots,andinordertobecomeKingof Scots,he abandoned animportant27 thatwasheldbyhisfather andhadcontributed tohisfather'sdeath.Theopposingsidesthenmetoutside Worcesterin1651.Thebattleledtoa28 fortheParliamentarians andCharleshadtofleeforhislife.A29 wasofferedforCharles's capture,butaftersixweeksspentinhiding,heeventuallymanagedtoreachthe30 ofcontinental Europe.31
- A militaryinnovation
- B largereward
- C widespreadconspiracy
- D relative safety
- E new government
F
decisivevictory
- G politicaldebate
- H strategicalliance
popular solution
- J religiousconviction
        `,
        pages: [],
        blocks: [],
      },
      TestType.READING,
    );

    const group = result.data.parts?.[0].questionGroups[0];
    expect(group?.questionType).toBe(QuestionType.SUMMARY_COMPLETION);
    expect(group?.questions).toHaveLength(5);
    const lastQuestion = group?.questions[4];
    expect(lastQuestion?.questionNumber).toBe(31);
    const lastContent = lastQuestion?.content ?? '';
    expect(lastContent).not.toContain('militaryinnovation');
    expect(lastContent).not.toContain('largereward');
  });
});
