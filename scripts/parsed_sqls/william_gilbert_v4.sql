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
  exam_id uuid := '112e308b-b9c4-4e19-8350-5d6736241e3e'::uuid;
  sec1 uuid := 'ae08294f-bdb0-454b-b739-bfd40903643d'::uuid;
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
  qid := 'e5817583-41cb-488a-9650-f59b2b079ac0'::uuid;
  INSERT INTO exam_questions ("Id","SectionId","Idx","Type","Skill","Difficulty","PromptMd","ExplanationMd","MatchPairs")
  VALUES (
    qid, sec1, 1,
    'MATCHING_HEADING','READING',2,
    E'Choose the correct heading for **Paragraph A**.\n\n**List of Headings:**\ni. Early years of Gilbert\nii. What was new about his scientific research method\niii. The development of chemistry\niv. Questioning traditional astronomy\nv. Pioneers of the early science\nvi. Professional and social recognition\nvii. Becoming the president of the Royal Science Society\nviii. The great works of Gilbert\nix. His discovery about magnetism\nx. His change of focus',
    'The answer is V.',
    '{"paragraph-q1": ["V"]}'::jsonb
  );
  INSERT INTO exam_options ("Id","QuestionId","Idx","ContentMd","IsCorrect") VALUES
    ('248fd88e-9898-4a3f-8b6a-d19c76837275'::uuid, qid, 1, 'i. Early years of Gilbert', false),
    ('92dfcf9a-fd65-464b-9da7-298d4b2eb5a8'::uuid, qid, 2, 'ii. What was new about his scientific research method', false),
    ('3f89326a-bdf7-4855-868a-9c30f16e00d4'::uuid, qid, 3, 'iii. The development of chemistry', false),
    ('5457dd06-fb5e-4c20-9c2f-225888f8e9f7'::uuid, qid, 4, 'iv. Questioning traditional astronomy', false),
    ('62308e9e-2e26-48f5-a943-356b10726c6f'::uuid, qid, 5, 'v. Pioneers of the early science', true),
    ('499a450e-5ba4-44ec-9417-f87adc592139'::uuid, qid, 6, 'vi. Professional and social recognition', false),
    ('05176209-3842-4f9c-a1ab-795b12a796c6'::uuid, qid, 7, 'vii. Becoming the president of the Royal Science Society', false),
    ('1c48ea7d-2721-4a4b-bcf6-b4fad2f3af5f'::uuid, qid, 8, 'viii. The great works of Gilbert', false),
    ('7fd6c711-c3eb-42a8-b9cb-20bae7e91f31'::uuid, qid, 9, 'ix. His discovery about magnetism', false),
    ('9c51ba8c-9993-4048-ade7-8663877f3b3d'::uuid, qid, 10, 'x. His change of focus', false);

  qid := 'b8c6ad01-286c-4554-a106-455bd8b59a65'::uuid;
  INSERT INTO exam_questions ("Id","SectionId","Idx","Type","Skill","Difficulty","PromptMd","ExplanationMd","MatchPairs")
  VALUES (
    qid, sec1, 2,
    'MATCHING_HEADING','READING',2,
    E'Choose the correct heading for **Paragraph B**.\n\n**List of Headings:**\ni. Early years of Gilbert\nii. What was new about his scientific research method\niii. The development of chemistry\niv. Questioning traditional astronomy\nv. Pioneers of the early science\nvi. Professional and social recognition\nvii. Becoming the president of the Royal Science Society\nviii. The great works of Gilbert\nix. His discovery about magnetism\nx. His change of focus',
    'The answer is I.',
    '{"paragraph-q2": ["I"]}'::jsonb
  );
  INSERT INTO exam_options ("Id","QuestionId","Idx","ContentMd","IsCorrect") VALUES
    ('c9e27217-39e2-4476-bccd-84e603b6a763'::uuid, qid, 1, 'i. Early years of Gilbert', true),
    ('6034280e-327a-4e95-8a05-017166bda941'::uuid, qid, 2, 'ii. What was new about his scientific research method', false),
    ('361701b8-ed55-4dfb-8cc5-bcdb9511ca24'::uuid, qid, 3, 'iii. The development of chemistry', false),
    ('1cce383c-5b98-4709-95e0-152e2a2b5101'::uuid, qid, 4, 'iv. Questioning traditional astronomy', false),
    ('4b632b64-bbe8-4ade-a352-6e1d74a38ddf'::uuid, qid, 5, 'v. Pioneers of the early science', false),
    ('8542ccce-d71c-4f0b-ac30-ae271f2b06ec'::uuid, qid, 6, 'vi. Professional and social recognition', false),
    ('2af0d824-1157-4fc6-b0b1-956bbd6b0e45'::uuid, qid, 7, 'vii. Becoming the president of the Royal Science Society', false),
    ('6de5b8b5-c38b-4e51-a744-f89264931959'::uuid, qid, 8, 'viii. The great works of Gilbert', false),
    ('e3001689-359f-40e9-8c88-468c526af58e'::uuid, qid, 9, 'ix. His discovery about magnetism', false),
    ('cd0d6fba-de65-4c86-8155-167a61880164'::uuid, qid, 10, 'x. His change of focus', false);

  qid := '16058165-4fad-4c6e-839c-2b1a74f9e895'::uuid;
  INSERT INTO exam_questions ("Id","SectionId","Idx","Type","Skill","Difficulty","PromptMd","ExplanationMd","MatchPairs")
  VALUES (
    qid, sec1, 3,
    'MATCHING_HEADING','READING',2,
    E'Choose the correct heading for **Paragraph A**.\n\n**List of Headings:**\ni. Early years of Gilbert\nii. What was new about his scientific research method\niii. The development of chemistry\niv. Questioning traditional astronomy\nv. Pioneers of the early science\nvi. Professional and social recognition\nvii. Becoming the president of the Royal Science Society\nviii. The great works of Gilbert\nix. His discovery about magnetism\nx. His change of focus',
    'The answer is vi.',
    '{"paragraph-q3": ["vi"]}'::jsonb
  );
  INSERT INTO exam_options ("Id","QuestionId","Idx","ContentMd","IsCorrect") VALUES
    ('a73c7be2-2da3-4371-8c10-31658234d486'::uuid, qid, 1, 'i. Early years of Gilbert', false),
    ('ecb87c4a-3265-4c84-809c-e8005609c354'::uuid, qid, 2, 'ii. What was new about his scientific research method', false),
    ('d182d0a3-4b27-4e81-b321-e451ec708c5f'::uuid, qid, 3, 'iii. The development of chemistry', false),
    ('71635d6b-f00e-4ef5-bb1d-b3026aa99a82'::uuid, qid, 4, 'iv. Questioning traditional astronomy', false),
    ('7f229c98-ef39-4162-ae43-3456dcebc97a'::uuid, qid, 5, 'v. Pioneers of the early science', false),
    ('9ee73bd5-5687-4767-90a9-2423d6dd0d73'::uuid, qid, 6, 'vi. Professional and social recognition', true),
    ('df206523-fe9d-4946-a733-6394c972634e'::uuid, qid, 7, 'vii. Becoming the president of the Royal Science Society', false),
    ('41d52207-f3c5-49cd-ba81-c5be9982fac0'::uuid, qid, 8, 'viii. The great works of Gilbert', false),
    ('ea684426-a36a-415c-a2a3-f10b1a0f1162'::uuid, qid, 9, 'ix. His discovery about magnetism', false),
    ('18410e81-35e5-41f7-ae5c-944f78f5186a'::uuid, qid, 10, 'x. His change of focus', false);

  qid := '814efe8f-d65f-4095-aa1c-cd08839e3fbe'::uuid;
  INSERT INTO exam_questions ("Id","SectionId","Idx","Type","Skill","Difficulty","PromptMd","ExplanationMd","MatchPairs")
  VALUES (
    qid, sec1, 4,
    'MATCHING_HEADING','READING',2,
    E'Choose the correct heading for **Paragraph D**.\n\n**List of Headings:**\ni. Early years of Gilbert\nii. What was new about his scientific research method\niii. The development of chemistry\niv. Questioning traditional astronomy\nv. Pioneers of the early science\nvi. Professional and social recognition\nvii. Becoming the president of the Royal Science Society\nviii. The great works of Gilbert\nix. His discovery about magnetism\nx. His change of focus',
    'The answer is X.',
    '{"paragraph-q4": ["X"]}'::jsonb
  );
  INSERT INTO exam_options ("Id","QuestionId","Idx","ContentMd","IsCorrect") VALUES
    ('ee60eb6b-074b-401d-a87c-b5668633d18e'::uuid, qid, 1, 'i. Early years of Gilbert', false),
    ('33249ce1-dc98-4f7a-bd74-4836d626d985'::uuid, qid, 2, 'ii. What was new about his scientific research method', false),
    ('fdd17dd7-7cb1-4c08-b7c8-e6b6213b02c2'::uuid, qid, 3, 'iii. The development of chemistry', false),
    ('edbc3182-d9da-4ce3-bb25-e49547e1568d'::uuid, qid, 4, 'iv. Questioning traditional astronomy', false),
    ('723795e6-a474-4ff2-8b19-aeae6d708db4'::uuid, qid, 5, 'v. Pioneers of the early science', false),
    ('7590257b-69bb-4192-aaa3-3024f1b94f03'::uuid, qid, 6, 'vi. Professional and social recognition', false),
    ('6130fb52-0504-4252-ac02-aeb0a1e017fc'::uuid, qid, 7, 'vii. Becoming the president of the Royal Science Society', false),
    ('07380aab-7851-4680-91cf-0694848514f7'::uuid, qid, 8, 'viii. The great works of Gilbert', false),
    ('1d74202a-173a-42a4-a732-50be56a48409'::uuid, qid, 9, 'ix. His discovery about magnetism', false),
    ('a7df4b4a-ed9e-4afa-8549-22b83fee29cb'::uuid, qid, 10, 'x. His change of focus', true);

  qid := '2edf1b74-2782-4e0a-80e1-791ad3274d84'::uuid;
  INSERT INTO exam_questions ("Id","SectionId","Idx","Type","Skill","Difficulty","PromptMd","ExplanationMd","MatchPairs")
  VALUES (
    qid, sec1, 5,
    'MATCHING_HEADING','READING',2,
    E'Choose the correct heading for **Paragraph E**.\n\n**List of Headings:**\ni. Early years of Gilbert\nii. What was new about his scientific research method\niii. The development of chemistry\niv. Questioning traditional astronomy\nv. Pioneers of the early science\nvi. Professional and social recognition\nvii. Becoming the president of the Royal Science Society\nviii. The great works of Gilbert\nix. His discovery about magnetism\nx. His change of focus',
    'The answer is ix.',
    '{"paragraph-q5": ["ix"]}'::jsonb
  );
  INSERT INTO exam_options ("Id","QuestionId","Idx","ContentMd","IsCorrect") VALUES
    ('87bd00e5-a188-487d-b64b-7da9cbcb6934'::uuid, qid, 1, 'i. Early years of Gilbert', false),
    ('d78e5111-7d6d-49b3-8951-6d739382e747'::uuid, qid, 2, 'ii. What was new about his scientific research method', false),
    ('917b3198-34b7-46d6-9f35-885285072fcd'::uuid, qid, 3, 'iii. The development of chemistry', false),
    ('6d8fef41-b897-42e8-8e55-9689548f1856'::uuid, qid, 4, 'iv. Questioning traditional astronomy', false),
    ('a0bc0825-baaa-487b-b1f0-5ada84393fcb'::uuid, qid, 5, 'v. Pioneers of the early science', false),
    ('df8daf5b-1a82-4109-b676-f58365e95c81'::uuid, qid, 6, 'vi. Professional and social recognition', false),
    ('c95480ce-97b8-4da0-b1ef-c26dce014343'::uuid, qid, 7, 'vii. Becoming the president of the Royal Science Society', false),
    ('f5ca1d7c-d05f-4f4e-b566-dc7f80409177'::uuid, qid, 8, 'viii. The great works of Gilbert', false),
    ('ab9ffa7e-f4d6-412c-80f5-311692524ae8'::uuid, qid, 9, 'ix. His discovery about magnetism', true),
    ('e0f77364-f48d-406a-a2ce-6d1a02a77c7d'::uuid, qid, 10, 'x. His change of focus', false);

  qid := '7caf1e1a-db63-4c39-856a-be97e8139c44'::uuid;
  INSERT INTO exam_questions ("Id","SectionId","Idx","Type","Skill","Difficulty","PromptMd","ExplanationMd","MatchPairs")
  VALUES (
    qid, sec1, 6,
    'MATCHING_HEADING','READING',2,
    E'Choose the correct heading for **Paragraph F**.\n\n**List of Headings:**\ni. Early years of Gilbert\nii. What was new about his scientific research method\niii. The development of chemistry\niv. Questioning traditional astronomy\nv. Pioneers of the early science\nvi. Professional and social recognition\nvii. Becoming the president of the Royal Science Society\nviii. The great works of Gilbert\nix. His discovery about magnetism\nx. His change of focus',
    'The answer is iv.',
    '{"paragraph-q6": ["iv"]}'::jsonb
  );
  INSERT INTO exam_options ("Id","QuestionId","Idx","ContentMd","IsCorrect") VALUES
    ('642223a2-0ff0-479f-931b-bbe22107dcc1'::uuid, qid, 1, 'i. Early years of Gilbert', false),
    ('43194aeb-df17-4c0d-9493-f8ea929c8bea'::uuid, qid, 2, 'ii. What was new about his scientific research method', false),
    ('f0a1970e-59d5-4f2b-a511-6435a45913cd'::uuid, qid, 3, 'iii. The development of chemistry', false),
    ('883073eb-1c34-47b8-89aa-aa36513322eb'::uuid, qid, 4, 'iv. Questioning traditional astronomy', true),
    ('6f23825f-f370-4634-be19-497ae892461a'::uuid, qid, 5, 'v. Pioneers of the early science', false),
    ('1630edf2-38cc-4f04-9fe4-c3c031c3b15a'::uuid, qid, 6, 'vi. Professional and social recognition', false),
    ('b23709b2-fede-4fa5-9cb6-1268daf92a36'::uuid, qid, 7, 'vii. Becoming the president of the Royal Science Society', false),
    ('8b782df3-b1d2-4d88-bfb2-9019dc3842f0'::uuid, qid, 8, 'viii. The great works of Gilbert', false),
    ('ae03f3e7-8811-4893-8eab-bb4d09d0239c'::uuid, qid, 9, 'ix. His discovery about magnetism', false),
    ('2173cd4f-63e3-482e-aaa7-b8b80cad6d67'::uuid, qid, 10, 'x. His change of focus', false);

  qid := 'e0591762-647d-4fb0-8d11-038f05e88892'::uuid;
  INSERT INTO exam_questions ("Id","SectionId","Idx","Type","Skill","Difficulty","PromptMd","ExplanationMd","MatchPairs")
  VALUES (
    qid, sec1, 7,
    'MATCHING_HEADING','READING',2,
    E'Choose the correct heading for **Paragraph G**.\n\n**List of Headings:**\ni. Early years of Gilbert\nii. What was new about his scientific research method\niii. The development of chemistry\niv. Questioning traditional astronomy\nv. Pioneers of the early science\nvi. Professional and social recognition\nvii. Becoming the president of the Royal Science Society\nviii. The great works of Gilbert\nix. His discovery about magnetism\nx. His change of focus',
    'The answer is ii.',
    '{"paragraph-q7": ["ii"]}'::jsonb
  );
  INSERT INTO exam_options ("Id","QuestionId","Idx","ContentMd","IsCorrect") VALUES
    ('dbd1d86c-b356-4018-984e-5db7a9e0d7d0'::uuid, qid, 1, 'i. Early years of Gilbert', false),
    ('a3c932ed-6ee0-4448-bfaf-930dd4b2d20e'::uuid, qid, 2, 'ii. What was new about his scientific research method', true),
    ('c91c4597-21d1-4dd3-97c4-4a298459118e'::uuid, qid, 3, 'iii. The development of chemistry', false),
    ('fae5d5e3-a8cb-44cf-9676-3016ef965b08'::uuid, qid, 4, 'iv. Questioning traditional astronomy', false),
    ('f3f6f796-51f3-4eef-a141-ea2e3c252336'::uuid, qid, 5, 'v. Pioneers of the early science', false),
    ('f024537b-ee7c-4d7b-8833-f71278caac06'::uuid, qid, 6, 'vi. Professional and social recognition', false),
    ('316041ec-6b7e-4fee-b83c-63fa0325db66'::uuid, qid, 7, 'vii. Becoming the president of the Royal Science Society', false),
    ('636dcad1-877a-4691-ae31-7d2ecfecb7a5'::uuid, qid, 8, 'viii. The great works of Gilbert', false),
    ('8f76cb26-bcb4-4fe6-be34-672b47945712'::uuid, qid, 9, 'ix. His discovery about magnetism', false),
    ('21e78d10-c563-4df5-be35-62a90593d55a'::uuid, qid, 10, 'x. His change of focus', false);

  qid := 'c77b34ac-c4ba-4550-8bd1-78ee514e8c3f'::uuid;
  INSERT INTO exam_questions ("Id","SectionId","Idx","Type","Skill","Difficulty","PromptMd","ExplanationMd")
  VALUES (
    qid, sec1, 8,
    'TRUE_FALSE_NOT_GIVEN','READING',1,
    'He is less famous than he should be',
    'The answer is True.'
  );
  INSERT INTO exam_options ("Id","QuestionId","Idx","ContentMd","IsCorrect") VALUES
    ('ab26d62d-3db2-41d5-9246-2f232a7eaa7a'::uuid, qid, 1, 'True', true),
    ('3555f003-3840-4ae6-8796-138f760e0b99'::uuid, qid, 2, 'False', false),
    ('c5d88cd9-7610-4c50-af51-02d7df3618a0'::uuid, qid, 3, 'Not Given', false);

  qid := '4e52fe9d-59a7-4c9b-970f-f1ab7c66a4b7'::uuid;
  INSERT INTO exam_questions ("Id","SectionId","Idx","Type","Skill","Difficulty","PromptMd","ExplanationMd")
  VALUES (
    qid, sec1, 9,
    'TRUE_FALSE_NOT_GIVEN','READING',1,
    'He was famous as a doctor before he was employed by the Queen',
    'The answer is True.'
  );
  INSERT INTO exam_options ("Id","QuestionId","Idx","ContentMd","IsCorrect") VALUES
    ('a87bc2ce-c774-4b10-a722-632509cdfdaa'::uuid, qid, 1, 'True', true),
    ('fae98086-0150-4020-9784-cee457af8330'::uuid, qid, 2, 'False', false),
    ('a37e1315-33c7-4bd6-9691-73c49f41f1f9'::uuid, qid, 3, 'Not Given', false);

  qid := '75e2145d-ebbc-460c-8a8b-b1064b798868'::uuid;
  INSERT INTO exam_questions ("Id","SectionId","Idx","Type","Skill","Difficulty","PromptMd","ExplanationMd")
  VALUES (
    qid, sec1, 10,
    'TRUE_FALSE_NOT_GIVEN','READING',1,
    'He lost faith in the medical theories of his time',
    'The answer is Not Given.'
  );
  INSERT INTO exam_options ("Id","QuestionId","Idx","ContentMd","IsCorrect") VALUES
    ('4af13eb2-cdc0-4d9a-9056-3be4877886f3'::uuid, qid, 1, 'True', false),
    ('c13c9f0e-e958-4289-9ef2-da901bf70909'::uuid, qid, 2, 'False', false),
    ('83771bf2-764c-4f06-a8ee-289034b3e0cf'::uuid, qid, 3, 'Not Given', true);

  qid := 'b4bfe7e9-4a0d-4c51-88ad-34c3a951cb7a'::uuid;
  INSERT INTO exam_questions ("Id","SectionId","Idx","Type","Skill","Difficulty","PromptMd","ExplanationMd","ShortAnswerAcceptTexts")
  VALUES (
    qid, sec1, 11,
    'SHORT_ANSWER','READING',3,
    E'Answer with NO MORE THAN THREE WORDS.\n\nQuestion 11',
    'The answer is: C, D, E   IN ANY ORDERS',
    ARRAY['C, D, E   IN ANY ORDERS', 'c, d, e   in any orders', 'C, D, E   In Any Orders']
  );

  qid := '0dbbead7-16ac-4461-a699-38c659c4455a'::uuid;
  INSERT INTO exam_questions ("Id","SectionId","Idx","Type","Skill","Difficulty","PromptMd","ExplanationMd","ShortAnswerAcceptTexts")
  VALUES (
    qid, sec1, 12,
    'SHORT_ANSWER','READING',3,
    E'Answer with NO MORE THAN THREE WORDS.\n\nQuestion 12',
    'The answer is: C, D, E   IN ANY ORDERS',
    ARRAY['C, D, E   IN ANY ORDERS', 'c, d, e   in any orders', 'C, D, E   In Any Orders']
  );

  qid := 'dc2c9ef4-e77a-47f8-9b8d-7c85b2f469d6'::uuid;
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