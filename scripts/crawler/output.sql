-- ============================================
-- IELTS Exam Data Import SQL
-- Generated: 2025-12-18T10:41:18.026966
-- Target: Australian Parrots Reading Passage
-- ============================================

BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Cleanup existing data for slug: australian-parrots-and-their-adaptation-to-habitat-change
DELETE FROM exam_options WHERE "QuestionId" IN (
  SELECT q."Id" FROM exam_questions q
  JOIN exam_sections s ON s."Id" = q."SectionId"
  JOIN exams e ON e."Id" = s."ExamId"
  WHERE e."Slug" = 'australian-parrots-and-their-adaptation-to-habitat-change'
);
DELETE FROM exam_questions USING exam_sections s, exams e
WHERE exam_questions."SectionId" = s."Id"
  AND s."ExamId" = e."Id"
  AND e."Slug" = 'australian-parrots-and-their-adaptation-to-habitat-change';
DELETE FROM exam_sections USING exams e
WHERE exam_sections."ExamId" = e."Id"
  AND e."Slug" = 'australian-parrots-and-their-adaptation-to-habitat-change';
DELETE FROM exams
WHERE "Slug" = 'australian-parrots-and-their-adaptation-to-habitat-change';

DO $$
DECLARE
  exam_id uuid := gen_random_uuid();
  sec1 uuid := gen_random_uuid();
  qid uuid;
BEGIN

  INSERT INTO exams ("Id","Slug","Title","DescriptionMd","Category","Level","Status","DurationMin","UpdatedAt")
  VALUES (
    exam_id,
    'australian-parrots-and-their-adaptation-to-habitat-change',
    'Australian parrots and their adaptation to habitat change',
    'IELTS Reading Practice Test about Australian parrots and their adaptation to habitat change.',
    'IELTS',
    'B2',
    'PUBLISHED',
    20,
    now()
  );

  INSERT INTO exam_sections ("Id","ExamId","Idx","Title","InstructionsMd")
  VALUES (
    sec1,
    exam_id,
    1,
    'Reading Passage - Australian Parrots',
    E'# Passage

**Paragraph A**  
Parrots are found across the tropic and in all southern hemisphere continents except Antarctica, but nowhere do the display such a richness of diversity and form as in Australia. One- sixth of the world’s 345 parrot species are found there, and Australia has long been renowned for the number and variety of its parrots.

**Paragraph B**  
In the 16th century, the German cartographer Mercator made a world map that included a place, somewhere near present-day Australia, that he named Terra Psittacorum – the Land of Parrots – and the first European settlers in Australia often referred to the country as Parrot Land. In 1865, the celebrated British naturalist and wildlife artist John Gould said: “No group of birds gives Australia so tropical and benign an air as the numerous species of this great family by which it is tenanted.

**Paragraph C**  
Parrots are descendants of an ancient line. Due to their great diversity, and since most species inhabit Africa, Australia and South America, it seems almost certain that parrots originated millions of years ago on the ancient southern continent of Gondwana, before it broke up into the separate southern hemisphere continents we know today. Much of Gondwana comprised vast rainforests intersected by huge slow-flowing rivers and expansive lakes, but by eight million years ago, great changes were underway. The center of the continent of Australia had begun to dry out, and the rainforests that once covered it gradually contracted to the continental margins, where, to a limited extent, they still exist today.

**Paragraph D**  
The creatures that remained in those shrinking rainforests had to adapt to the drier conditions or face extinction. Reacting to these desperate circumstances, the parrot family, typically found in jungles in other parts of the world, has populated some of Australia’s harshest environments. The parrots spread from ancestral forests through eucalypt woodlands to colonies the central deserts of Australia, and as a consequence they diversified into a wide range of species with adaptations that reflect the many changes animals and plants had to make to survive in these areas.

**Paragraph E**  
These evolutionary pressures helped mould keratin, the substance from which breaks are made into a range of tools capable of gathering the new food types favored by various species of parrot. The size of a parrot’s short, blunt beak and the length of that beak’s do curved upper section are related to the type of food each species eats. Some have comparatively long beaks that are perfect for extracting seeds from fruit; others have broader and stronger beaks that are designed for cracking hard seeds.

**Paragraph F**  
Differently shaped beaks are not the only adaptations that have been made during the developing relationship between parrots and their food plants. Like all of Australia’s many honey eating birds, the rainbow-coloured lorikeets and the flowers on which they feed have long co­evolved with features such as the shape and colour of the flowers adapted to the bird’s particular needs, and physical a example, red is the most I attractive colour to birds, and thus flowers which depend on birds for pollination are more often red, and lorikeets’ to gues have bristles which help them to collect as much pollen as possible.

**Paragraph G**  
Today, most of Australia’s parrots inhabit woodland and open forest, and their numbers decline towards both deserts and wetter areas. The majority are nomadic to some degree, moving around to take advantage of feeding and breeding places. Two of the dry country parrots, the pink and grey galah and the pink, white and yellow corella have expanded their ranges in recent years. They are among the species that have adapted well to the changes brought about by European settlement forest telling created grasslands where galahs and corellas thrive.

**Paragraph H**  
But other parrot species did not fare so well when their environments were altered. The clearing of large areas of rainforest is probably responsible for the disappearance of the double-eyed fig parrot, and numbers of ground parrots declined when a great part of their habitat was destroyed by the draining of coastal swamps. Even some parrot species that benefited from forest clearing at first are now comforted by a shortage of nesting sites due to further man-made changes.

**Paragraph I**  
New conditions also sometimes favour an incoming species over one that originally inhabited the area. For example, after farmers cleared large areas of forest on Kangaroo Island off the coast of South Australia, the island was colonised by galahs. They were soon going down holes and destroying black cockatoo eggs in order to take the hole for their own use. Their success precipitated a partial collapse in the black cockatoo population when the later lost the struggle for scarce nesting hollows.

**Paragraph J**  
There may be no final answer to ensuring an equitable balance between parrot species. Nest box programmers help ease the shortage of nesting sites in some places, but there are not enough, they are expensive and they are not an adequate substitute by large, old trees, such as the habitat they represent and nectar, pollen and seeds they provide. Competition between parrots for nest sites is a result of the changes we humans have made to the Earth. We are the most widespread and dangerous competitors that parrots have ever had to face, but we also have the knowledge and skill to maintain the wonderfully rich diversity of Australia’s parrots. All we need is the wild to do so. Reading Passage has ten paragraphs A-J Which paragraph contains the following information? Write the correct letter, A-J in boxes 1-6 on your answer sheet 1ABCDEFGHIJAn example of how one parrot species may survive at the expense of another 2ABCDEFGHIJA description of how plants may adapt to attract birds 3ABCDEFGHIJExample of two parrot species which benefited from changes to the environment 4ABCDEFGHIJHow the varied Australian landscape resulted in a great variety of parrot species 5ABCDEFGHIJA reason why most parrot species are native to the southern hemisphere 6ABCDEFGHIJAn example of a parrot species which did not survive changes to its habitat Choose the correct letterA, B, c,orD Write the correct letter in boxes 7-9 on your answer sheet 7.The writer believes that most parrot species AMove from Africa and South America to Australia BHad ancestors in either Africa, Australia or South America CHad ancestors in a continent which later split up DCame from a continent now covered by water 8.What does the Writer say about parrot''s beak? AThey are longer than those of other birds BThey are made of a unique material CThey are used more efficiently than those of other species DThey are specially adapted to suit the diet 9.Which of the following isNOTmentioned by the writer as a disadvantage of nesting boxes? AThey cost too much BThey need to be maintained CThey provide only shelter, not food DThey are too few of them Complete the summary below ChooseNO MORE THANH TWO WORDS AND/OR A NUMBERfrom the passage for each answer. Write your answers in boxes 10-13 on your answer sheet Parrots in Australia There are 345 varieties of parrot in existence and, of these,10live in Australia. As early as the11, the mapmaker12recognized that parrots lived in that part of the world.13, the famous painter of animals and birds, commented on the size and beauty of the Australian parrot family. ---End of the Test--- Please Submit to view your score, solution and explanations. Submit Found a mistake? Let us know! * This window is to review your answers only, you cannot change the answers in here Please descibe the mistake as details as possible along with your expected correction, leave your email so we can contact with you when needed. Describe what is wrong with the practice test: Please enter description Enter your name: Enter your email address: Please enter a valid email
'
  );

  qid := gen_random_uuid();
  INSERT INTO exam_questions ("Id","SectionId","Idx","Type","Skill","Difficulty","PromptMd","ExplanationMd","MatchPairs")
  VALUES (
    qid,
    sec1,
    1,
    'MATCHING_INFORMATION',
    'READING',
    2,
    'An example of how one parrot species may survive at the expense of another',
    'Paragraph I describes galahs taking nest sites from black cockatoos.',
    '{"paragraph": ["I"]}'::jsonb
  );

  qid := gen_random_uuid();
  INSERT INTO exam_questions ("Id","SectionId","Idx","Type","Skill","Difficulty","PromptMd","ExplanationMd","MatchPairs")
  VALUES (
    qid,
    sec1,
    2,
    'MATCHING_INFORMATION',
    'READING',
    2,
    'A description of how plants may adapt to attract birds',
    'Paragraph F explains the co-evolution of flowers with bird pollinators.',
    '{"paragraph": ["F"]}'::jsonb
  );

  qid := gen_random_uuid();
  INSERT INTO exam_questions ("Id","SectionId","Idx","Type","Skill","Difficulty","PromptMd","ExplanationMd","MatchPairs")
  VALUES (
    qid,
    sec1,
    3,
    'MATCHING_INFORMATION',
    'READING',
    2,
    'Example of two parrot species which benefited from changes to the environment',
    'Paragraph G mentions galahs and corellas thriving after forest clearing.',
    '{"paragraph": ["G"]}'::jsonb
  );

  qid := gen_random_uuid();
  INSERT INTO exam_questions ("Id","SectionId","Idx","Type","Skill","Difficulty","PromptMd","ExplanationMd","MatchPairs")
  VALUES (
    qid,
    sec1,
    4,
    'MATCHING_INFORMATION',
    'READING',
    2,
    'How the varied Australian landscape resulted in a great variety of parrot species',
    'Paragraph D describes how parrots diversified into many species.',
    '{"paragraph": ["D"]}'::jsonb
  );

  qid := gen_random_uuid();
  INSERT INTO exam_questions ("Id","SectionId","Idx","Type","Skill","Difficulty","PromptMd","ExplanationMd","MatchPairs")
  VALUES (
    qid,
    sec1,
    5,
    'MATCHING_INFORMATION',
    'READING',
    2,
    'A reason why most parrot species are native to the southern hemisphere',
    'Paragraph C explains parrots originated on Gondwana.',
    '{"paragraph": ["C"]}'::jsonb
  );

  qid := gen_random_uuid();
  INSERT INTO exam_questions ("Id","SectionId","Idx","Type","Skill","Difficulty","PromptMd","ExplanationMd","MatchPairs")
  VALUES (
    qid,
    sec1,
    6,
    'MATCHING_INFORMATION',
    'READING',
    2,
    'An example of a parrot species which did not survive changes to its habitat',
    'Paragraph H mentions the disappearance of the double-eyed fig parrot.',
    '{"paragraph": ["H"]}'::jsonb
  );

  qid := gen_random_uuid();
  INSERT INTO exam_questions ("Id","SectionId","Idx","Type","Skill","Difficulty","PromptMd","ExplanationMd")
  VALUES (
    qid,
    sec1,
    7,
    'MULTIPLE_CHOICE_SINGLE',
    'READING',
    2,
    'The writer believes that most parrot species',
    'Paragraph C states parrots originated on Gondwana before it split up.'
  );
  INSERT INTO exam_options ("Id","QuestionId","Idx","ContentMd","IsCorrect") VALUES
    (gen_random_uuid(), qid, 1, 'Move from Africa and South America to Australia', false);
  INSERT INTO exam_options ("Id","QuestionId","Idx","ContentMd","IsCorrect") VALUES
    (gen_random_uuid(), qid, 2, 'Had ancestors in either Africa, Australia or South America', false);
  INSERT INTO exam_options ("Id","QuestionId","Idx","ContentMd","IsCorrect") VALUES
    (gen_random_uuid(), qid, 3, 'Had ancestors in a continent which later split up', true);
  INSERT INTO exam_options ("Id","QuestionId","Idx","ContentMd","IsCorrect") VALUES
    (gen_random_uuid(), qid, 4, 'Came from a continent now covered by water', false);

  qid := gen_random_uuid();
  INSERT INTO exam_questions ("Id","SectionId","Idx","Type","Skill","Difficulty","PromptMd","ExplanationMd")
  VALUES (
    qid,
    sec1,
    8,
    'MULTIPLE_CHOICE_SINGLE',
    'READING',
    2,
    'What does the writer say about parrot''s beak?',
    'Paragraph E explains beaks are adapted to the type of food each species eats.'
  );
  INSERT INTO exam_options ("Id","QuestionId","Idx","ContentMd","IsCorrect") VALUES
    (gen_random_uuid(), qid, 1, 'They are longer than those of other birds', false);
  INSERT INTO exam_options ("Id","QuestionId","Idx","ContentMd","IsCorrect") VALUES
    (gen_random_uuid(), qid, 2, 'They are made of a unique material', false);
  INSERT INTO exam_options ("Id","QuestionId","Idx","ContentMd","IsCorrect") VALUES
    (gen_random_uuid(), qid, 3, 'They are used more efficiently than those of other species', false);
  INSERT INTO exam_options ("Id","QuestionId","Idx","ContentMd","IsCorrect") VALUES
    (gen_random_uuid(), qid, 4, 'They are specially adapted to suit the diet', true);

  qid := gen_random_uuid();
  INSERT INTO exam_questions ("Id","SectionId","Idx","Type","Skill","Difficulty","PromptMd","ExplanationMd")
  VALUES (
    qid,
    sec1,
    9,
    'MULTIPLE_CHOICE_SINGLE',
    'READING',
    2,
    'Which of the following is NOT mentioned by the writer as a disadvantage of nesting boxes?',
    'Paragraph J mentions cost, scarcity, and lack of food - but not maintenance.'
  );
  INSERT INTO exam_options ("Id","QuestionId","Idx","ContentMd","IsCorrect") VALUES
    (gen_random_uuid(), qid, 1, 'They cost too much', false);
  INSERT INTO exam_options ("Id","QuestionId","Idx","ContentMd","IsCorrect") VALUES
    (gen_random_uuid(), qid, 2, 'They need to be maintained', true);
  INSERT INTO exam_options ("Id","QuestionId","Idx","ContentMd","IsCorrect") VALUES
    (gen_random_uuid(), qid, 3, 'They provide only shelter, not food', false);
  INSERT INTO exam_options ("Id","QuestionId","Idx","ContentMd","IsCorrect") VALUES
    (gen_random_uuid(), qid, 4, 'There are too few of them', false);

  qid := gen_random_uuid();
  INSERT INTO exam_questions ("Id","SectionId","Idx","Type","Skill","Difficulty","PromptMd","ExplanationMd","BlankAcceptTexts")
  VALUES (
    qid,
    sec1,
    10,
    'SUMMARY_COMPLETION',
    'READING',
    2,
    'There are 345 varieties of parrot in existence and, of these, _____ live in Australia.',
    'Paragraph A states one-sixth of the world''s 345 parrot species are found in Australia.',
    '{"blank1": ["one-sixth", "1/6", "one sixth"]}'::jsonb
  );

  qid := gen_random_uuid();
  INSERT INTO exam_questions ("Id","SectionId","Idx","Type","Skill","Difficulty","PromptMd","ExplanationMd","BlankAcceptTexts")
  VALUES (
    qid,
    sec1,
    11,
    'SUMMARY_COMPLETION',
    'READING',
    2,
    'As early as the _____, the mapmaker recognized that parrots lived in that part of the world.',
    'Paragraph B mentions the 16th century when Mercator created his map.',
    '{"blank1": ["16th century", "16th Century", "sixteenth century"]}'::jsonb
  );

  qid := gen_random_uuid();
  INSERT INTO exam_questions ("Id","SectionId","Idx","Type","Skill","Difficulty","PromptMd","ExplanationMd","BlankAcceptTexts")
  VALUES (
    qid,
    sec1,
    12,
    'SUMMARY_COMPLETION',
    'READING',
    2,
    'the mapmaker _____ recognized that parrots lived in that part of the world.',
    'Paragraph B names the German cartographer Mercator.',
    '{"blank1": ["Mercator"]}'::jsonb
  );

  qid := gen_random_uuid();
  INSERT INTO exam_questions ("Id","SectionId","Idx","Type","Skill","Difficulty","PromptMd","ExplanationMd","BlankAcceptTexts")
  VALUES (
    qid,
    sec1,
    13,
    'SUMMARY_COMPLETION',
    'READING',
    2,
    '_____, the famous painter of animals and birds, commented on the size and beauty of the Australian parrot family.',
    'Paragraph B mentions John Gould, the British naturalist and wildlife artist.',
    '{"blank1": ["John Gould", "Gould"]}'::jsonb
  );

END$$;


COMMIT;