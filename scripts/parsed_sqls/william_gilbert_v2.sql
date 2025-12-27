BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DELETE FROM exam_options WHERE "QuestionId" IN (
  SELECT q."Id" FROM exam_questions q
  JOIN exam_sections s ON s."Id" = q."SectionId"
  JOIN exams e ON e."Id" = s."ExamId"
  WHERE e."Slug" = 'ielts-reading-william-gilbert-and-magnetism'
);
DELETE FROM exam_questions USING exam_sections s, exams e
WHERE exam_questions."SectionId" = s."Id"
  AND s."ExamId" = e."Id"
  AND e."Slug" = 'ielts-reading-william-gilbert-and-magnetism';
DELETE FROM exam_sections USING exams e
WHERE exam_sections."ExamId" = e."Id"
  AND e."Slug" = 'ielts-reading-william-gilbert-and-magnetism';
DELETE FROM exams
WHERE "Slug" = 'ielts-reading-william-gilbert-and-magnetism';

DO $$
DECLARE
  exam_id uuid := 'a7a8f07d-901e-4a0d-93b5-83548acd4a66'::uuid;
  sec1 uuid := 'ba980a4d-18eb-4f91-84e4-00ac11b581c8'::uuid;
  qid uuid;
BEGIN
  INSERT INTO exams ("Id","Slug","Title","DescriptionMd","Category","Level","Status","DurationMin","UpdatedAt")
  VALUES (
    exam_id,
    'ielts-reading-william-gilbert-and-magnetism',
    'IELTS Reading - William Gilbert and Magnetism',
    'IELTS Reading practice test: William Gilbert and Magnetism. Contains 13 questions.',
    'IELTS',
    'B2',
    'DRAFT',
    20,
    now()
  );

  INSERT INTO exam_sections ("Id","ExamId","Idx","Title","InstructionsMd")
  VALUES (
    sec1,
    exam_id,
    1,
    'William Gilbert and Magnetism',
    E'# Reading Passage\n\n**Paragraph A**\nThe 16th and 17th centuries saw two great pioneers of modern science: Galileo and Gilbert. The impact of their findings is eminent. Gilbert was the first modern scientist, also the accredited father of the science of electricity and magnetism, an Englishman of learning and a physician at the court of Elizabeth. Prior to him, all that was known of electricity and magnetism was what the ancients knew, nothing more than that the lodestone possessed magnetic properties and that amber and jet, when rubbed, would attract bits of paper or other substances of small specific gravity. However, he is less well known than he deserves.\n\n**Paragraph B**\nGilbert’s birth pre-dated Galileo. Born in an eminent local family in Colchester County in the UK, on May 24, 1544, he went to grammar school, and then studied medicine at St John’s College, Cambridge, graduating in 1573. Later he travelled in the continent and eventually settled down in London.\n\n**Paragraph C**\nHe was a very successful and eminent doctor. All this culminated in his election to the president of the Royal Science Society. He was also appointed personal physician to the Queen (Elizabeth I), and later knighted by the Queen. He faithfully served her until her death. However, he didn’t outlive the Queen for long and died on November 30, 1603, only a few months after his appointment as personal physician to King James.\n\n**Paragraph D**\nGilbert was first interested in chemistry but later changed his focus due to the large portion of mysticism of alchemy involved (such as the transmutation of metal). He gradually developed his interest in physics after the great minds of the ancient, particularly about the knowledge the ancient Greeks had about lodestones, strange minerals with the power to attract iron. In the meantime, Britain became a major seafaring nation in 1588 when the Spanish Armada was defeat­ed, opening the way to British settlement of America. British ships depended on the magnetic compass, yet no one understood why it worked. Did the Pole Star attract it, as Columbus once speculated; or was there a magnetic mountain at the pole, as described in Odyssey, which ships would never approach, because the sail­ors thought its pull would yank out all their iron nails and fittings? For nearly 20 years, William Gilbert conducted ingenious experiments to understand magnet­ism. His works include On the Magnet, Magnetic Bodies, and the Great Magnet of the Earth.\n\n**Paragraph E**\nGilbert’s discovery was so important to modern physics. He investigated the nature of magnetism and electricity. He even coined the word “electric”. Though the early beliefs of magnetism were also largely entangled with superstitions such as that rubbing garlic on lodestone can neutralise its magnetism, one example being that sailors even believed the smell of garlic would even interfere with the action of compass, which is why helmsmen were forbidden to eat it near a ship’s compass. Gilbert also found that metals can be magnetised by rubbing mater­ials such as fur, plastic or the like on them. He named the ends of a magnet “north pole” and “south pole”. The magnetic poles can attract or repel, depending on polarity. In addition, however, ordinary iron is always attracted to a magnet. Though he started to study the relationship between magnetism and electricity, sadly he didn’t complete it. His research of static electricity using amber and jet only demonstrated that objects with electrical charges can work like magnets attracting small pieces of paper and stuff. It is a French guy named du Fay that discovered that there are actually two electrical charges, positive and negative.\n\n**Paragraph F**\nHe also questioned the traditional astronomical beliefs. Though a Copernican, he didn’t express in his quintessential beliefs whether the earth is at the centre of the universe or in orbit around the sun. However, he believed that stars are not equidistant from the earth but have their own earth-like planets orbiting around them. The earth itself is like a giant magnet, which is also why compasses always point north. They spin on an axis that is aligned with the earth’s polarity. He even likened the polarity of the magnet to the polarity of the earth and built an entire magnetic philosophy on this analogy. In his explanation, magnetism is the soul of the earth. Thus a perfectly spherical lodestone, when aligned with the earth’s poles, would wobble all by itself in 24 hours. Further, he also believed that the sun and other stars wobble just like the earth does around a crystal core, and speculated that the moon might also be a magnet caused to orbit by its magnetic attraction to the earth. This was perhaps the first proposal that a force might cause a heavenly orbit.\n\n**Paragraph G**\nHis research method was revolutionary in that he used experiments rather than pure logic and reasoning like the ancient Greek philosophers did. It was a new attitude towards scientific investigation. Until then, scientific experiments were not in fashion. It was because of this scientific attitude, together with his contri­bution to our knowledge of magnetism, that a unit of magneto motive force, also known as magnetic potential, was named Gilbert in his honour. His approach of careful observation and experimentation rather than the authoritative opinion or deductive philosophy of others had laid the very foundation for modern science. Advertisement'
  );

  -- Section 1 questions
  qid := '6b23723f-1e28-4efd-bad5-cff78f4ea3d0'::uuid;
  INSERT INTO exam_questions ("Id","SectionId","Idx","Type","Skill","Difficulty","PromptMd","ExplanationMd","MatchPairs")
  VALUES (
    qid, sec1, 1,
    'MATCHING_HEADING','READING',2,
    'Choose the correct heading for Paragraph A.',
    'The answer is V.',
    '{"paragraph-q1": ["V"]}'::jsonb
  );

  qid := 'c0afb6b4-07df-46c7-bb54-6c504ac21101'::uuid;
  INSERT INTO exam_questions ("Id","SectionId","Idx","Type","Skill","Difficulty","PromptMd","ExplanationMd","MatchPairs")
  VALUES (
    qid, sec1, 2,
    'MATCHING_HEADING','READING',2,
    'Choose the correct heading for Paragraph B.',
    'The answer is I.',
    '{"paragraph-q2": ["I"]}'::jsonb
  );

  qid := 'f3067db7-8a9e-4678-8d49-1e1e671fe9d2'::uuid;
  INSERT INTO exam_questions ("Id","SectionId","Idx","Type","Skill","Difficulty","PromptMd","ExplanationMd","MatchPairs")
  VALUES (
    qid, sec1, 3,
    'MATCHING_HEADING','READING',2,
    'Choose the correct heading for Paragraph A.',
    'The answer is vi.',
    '{"paragraph-q3": ["vi"]}'::jsonb
  );

  qid := '6390f54a-717d-46c6-9a56-68464f3c8d84'::uuid;
  INSERT INTO exam_questions ("Id","SectionId","Idx","Type","Skill","Difficulty","PromptMd","ExplanationMd","MatchPairs")
  VALUES (
    qid, sec1, 4,
    'MATCHING_HEADING','READING',2,
    'Choose the correct heading for Paragraph D.',
    'The answer is X.',
    '{"paragraph-q4": ["X"]}'::jsonb
  );

  qid := '6f2314e2-1c8f-4c33-a924-64b416bb2555'::uuid;
  INSERT INTO exam_questions ("Id","SectionId","Idx","Type","Skill","Difficulty","PromptMd","ExplanationMd","MatchPairs")
  VALUES (
    qid, sec1, 5,
    'MATCHING_HEADING','READING',2,
    'Choose the correct heading for Paragraph E.',
    'The answer is ix.',
    '{"paragraph-q5": ["ix"]}'::jsonb
  );

  qid := '8c97e959-4107-4d90-b66d-b845e741ec90'::uuid;
  INSERT INTO exam_questions ("Id","SectionId","Idx","Type","Skill","Difficulty","PromptMd","ExplanationMd","MatchPairs")
  VALUES (
    qid, sec1, 6,
    'MATCHING_HEADING','READING',2,
    'Choose the correct heading for Paragraph F.',
    'The answer is iv.',
    '{"paragraph-q6": ["iv"]}'::jsonb
  );

  qid := '73724dc6-3b33-46e1-a1c5-a5fd30416f6c'::uuid;
  INSERT INTO exam_questions ("Id","SectionId","Idx","Type","Skill","Difficulty","PromptMd","ExplanationMd","MatchPairs")
  VALUES (
    qid, sec1, 7,
    'MATCHING_HEADING','READING',2,
    'Choose the correct heading for Paragraph G.',
    'The answer is ii.',
    '{"paragraph-q7": ["ii"]}'::jsonb
  );

  qid := '431b85b9-ff8b-47c1-90b8-2704a97ebc1d'::uuid;
  INSERT INTO exam_questions ("Id","SectionId","Idx","Type","Skill","Difficulty","PromptMd","ExplanationMd")
  VALUES (
    qid, sec1, 8,
    'TRUE_FALSE_NOT_GIVEN','READING',1,
    'He is less famous than he should be',
    'The answer is True.'
  );
  INSERT INTO exam_options ("Id","QuestionId","Idx","ContentMd","IsCorrect") VALUES
    ('a40c5655-20ff-446d-bf23-1b94effe3e1a'::uuid, qid, 1, 'True', true),
    ('9c78a34d-cf63-483b-b529-9483f63e57bb'::uuid, qid, 2, 'False', false),
    ('9f767e71-2e30-490d-a414-b03d108e6da4'::uuid, qid, 3, 'Not Given', false);

  qid := '552e93c1-e562-4348-87f4-db1b79d851f3'::uuid;
  INSERT INTO exam_questions ("Id","SectionId","Idx","Type","Skill","Difficulty","PromptMd","ExplanationMd")
  VALUES (
    qid, sec1, 9,
    'TRUE_FALSE_NOT_GIVEN','READING',1,
    'He was famous as a doctor before he was employed by the Queen',
    'The answer is True.'
  );
  INSERT INTO exam_options ("Id","QuestionId","Idx","ContentMd","IsCorrect") VALUES
    ('d51ae111-fe71-4a0c-8cf9-5e13c7c71e57'::uuid, qid, 1, 'True', true),
    ('70138bdf-58e9-4927-9d6b-a7e38b69da45'::uuid, qid, 2, 'False', false),
    ('44801900-1097-4c15-9a9f-da1c0de5958e'::uuid, qid, 3, 'Not Given', false);

  qid := '46907010-9455-4684-8717-b85b925e5700'::uuid;
  INSERT INTO exam_questions ("Id","SectionId","Idx","Type","Skill","Difficulty","PromptMd","ExplanationMd")
  VALUES (
    qid, sec1, 10,
    'TRUE_FALSE_NOT_GIVEN','READING',1,
    'He lost faith in the medical theories of his time',
    'The answer is Not Given.'
  );
  INSERT INTO exam_options ("Id","QuestionId","Idx","ContentMd","IsCorrect") VALUES
    ('ce52554b-bade-4ca8-8ae3-9660e95df90b'::uuid, qid, 1, 'True', false),
    ('829c4fb1-00ae-4d23-aece-0aba4124f1b5'::uuid, qid, 2, 'False', false),
    ('6c104bd0-ebab-458b-abcb-e935fde3d670'::uuid, qid, 3, 'Not Given', true);

  qid := 'c52b5e4f-ff4a-4c80-9164-e126b1e199d0'::uuid;
  INSERT INTO exam_questions ("Id","SectionId","Idx","Type","Skill","Difficulty","PromptMd","ExplanationMd","ShortAnswerAcceptTexts")
  VALUES (
    qid, sec1, 11,
    'SHORT_ANSWER','READING',3,
    E'Answer with NO MORE THAN THREE WORDS.\n\nQuestion 11',
    'The answer is: C, D, E   IN ANY ORDERS',
    ARRAY['C, D, E   IN ANY ORDERS', 'c, d, e   in any orders', 'C, D, E   In Any Orders']
  );

  qid := 'e8e72ee3-a42b-4cee-b8a3-00c1b0294763'::uuid;
  INSERT INTO exam_questions ("Id","SectionId","Idx","Type","Skill","Difficulty","PromptMd","ExplanationMd","ShortAnswerAcceptTexts")
  VALUES (
    qid, sec1, 12,
    'SHORT_ANSWER','READING',3,
    E'Answer with NO MORE THAN THREE WORDS.\n\nQuestion 12',
    'The answer is: C, D, E   IN ANY ORDERS',
    ARRAY['C, D, E   IN ANY ORDERS', 'c, d, e   in any orders', 'C, D, E   In Any Orders']
  );

  qid := 'c1a890d4-0b7c-478a-8ef7-d8fd97e3ce96'::uuid;
  INSERT INTO exam_questions ("Id","SectionId","Idx","Type","Skill","Difficulty","PromptMd","ExplanationMd","ShortAnswerAcceptTexts")
  VALUES (
    qid, sec1, 13,
    'SHORT_ANSWER','READING',3,
    E'Answer with NO MORE THAN THREE WORDS.\n\nQuestion 13',
    'The answer is: C, D, E   IN ANY ORDERS',
    ARRAY['C, D, E   IN ANY ORDERS', 'c, d, e   in any orders', 'C, D, E   In Any Orders']
  );

END$$;

COMMIT;