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
  exam_id uuid := 'c258d472-625f-4ca6-86e4-a753023127d9'::uuid;
  sec1 uuid := '44dff1b0-359d-470e-85e4-ceb5bcadee1e'::uuid;
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
  qid := '1252e659-2a37-4b56-9388-ec65014915ba'::uuid;
  INSERT INTO exam_questions ("Id","SectionId","Idx","Type","Skill","Difficulty","PromptMd","ExplanationMd")
  VALUES (
    qid, sec1, 1,
    'MULTIPLE_CHOICE_SINGLE','READING',2,
    'v 8. TRUE 2. i 9. TRUE 3. vi 10. NOT GIVEN 4. x 11. C, D, E IN ANY ORDERS 5. ix 12. C, D, E IN ANY ORDERS 6. iv 13. C, D, E IN ANY ORDERS 7. ii Found a mistake?',
    'The answer is V.'
  );
  INSERT INTO exam_options ("Id","QuestionId","Idx","ContentMd","IsCorrect") VALUES
    ('5305026e-c85d-4497-9894-a46bd3e67c17'::uuid, qid, 1, 'A. Option A', false),
    ('9485e4d2-3570-4c8b-b0aa-6bd73297ae23'::uuid, qid, 2, 'B. Option B', false),
    ('d97e8205-a590-4509-9e02-1c3bfa2d0912'::uuid, qid, 3, 'C. Option C', false),
    ('ba8c491e-680b-4902-9743-3464c65cb98c'::uuid, qid, 4, 'D. Option D', false);

  qid := '3072e1d2-4370-4ac8-bc48-6d44f7866281'::uuid;
  INSERT INTO exam_questions ("Id","SectionId","Idx","Type","Skill","Difficulty","PromptMd","ExplanationMd")
  VALUES (
    qid, sec1, 2,
    'MULTIPLE_CHOICE_SINGLE','READING',2,
    'i 9. TRUE 3. vi 10. NOT GIVEN 4. x 11. C, D, E IN ANY ORDERS 5. ix 12. C, D, E IN ANY ORDERS 6. iv 13. C, D, E IN ANY ORDERS 7. ii Found a mistake?',
    'The answer is I.'
  );
  INSERT INTO exam_options ("Id","QuestionId","Idx","ContentMd","IsCorrect") VALUES
    ('d40ef6fa-d87d-4deb-831c-e29513144a0e'::uuid, qid, 1, 'A. Option A', false),
    ('7bd79b97-0ea6-4ea8-a7d0-e9b8341dc19c'::uuid, qid, 2, 'B. Option B', false),
    ('40b6ad14-9b76-48d6-accb-e31214e206d5'::uuid, qid, 3, 'C. Option C', false),
    ('803eb61a-946b-4f42-b142-5acce8129087'::uuid, qid, 4, 'D. Option D', false);

  qid := '81451b19-cc4c-4b88-b52a-26c94dddeec5'::uuid;
  INSERT INTO exam_questions ("Id","SectionId","Idx","Type","Skill","Difficulty","PromptMd","ExplanationMd")
  VALUES (
    qid, sec1, 3,
    'MULTIPLE_CHOICE_SINGLE','READING',2,
    'vi 10. NOT GIVEN 4. x 11. C, D, E IN ANY ORDERS 5. ix 12. C, D, E IN ANY ORDERS 6. iv 13. C, D, E IN ANY ORDERS 7. ii Found a mistake?',
    'The answer is vi.'
  );
  INSERT INTO exam_options ("Id","QuestionId","Idx","ContentMd","IsCorrect") VALUES
    ('96c4fb25-1d0b-47a0-9f7b-37c69b64b466'::uuid, qid, 1, 'A. Option A', true),
    ('ab226dd8-f9b8-46b7-9069-8c3442944617'::uuid, qid, 2, 'B. Option B', false),
    ('18c15432-642c-43b0-b5f0-38a2845086e4'::uuid, qid, 3, 'C. Option C', false),
    ('9dddb591-c6a5-4dc2-9ceb-d3bf304f402a'::uuid, qid, 4, 'D. Option D', false);

  qid := '2fa8a761-ec37-4ea9-b742-f1b5b0443789'::uuid;
  INSERT INTO exam_questions ("Id","SectionId","Idx","Type","Skill","Difficulty","PromptMd","ExplanationMd")
  VALUES (
    qid, sec1, 4,
    'MULTIPLE_CHOICE_SINGLE','READING',2,
    'x 11. C, D, E IN ANY ORDERS 5. ix 12. C, D, E IN ANY ORDERS 6. iv 13. C, D, E IN ANY ORDERS 7. ii Found a mistake?',
    'The answer is X.'
  );
  INSERT INTO exam_options ("Id","QuestionId","Idx","ContentMd","IsCorrect") VALUES
    ('669ffe25-0d50-4557-ac6f-9686be0eb80c'::uuid, qid, 1, 'A. Option A', false),
    ('d34294d5-e79c-4ccc-8b46-b0a9e79cc860'::uuid, qid, 2, 'B. Option B', false),
    ('17eade44-f294-44f0-a8b5-54fe7b24c6a8'::uuid, qid, 3, 'C. Option C', false),
    ('d14012ec-8082-45ac-8c59-3d8608ec81c2'::uuid, qid, 4, 'D. Option D', false);

  qid := 'b97b4546-bd4d-44fc-ad0e-1160b1d9896e'::uuid;
  INSERT INTO exam_questions ("Id","SectionId","Idx","Type","Skill","Difficulty","PromptMd","ExplanationMd")
  VALUES (
    qid, sec1, 5,
    'MULTIPLE_CHOICE_SINGLE','READING',2,
    'ix 12. C, D, E IN ANY ORDERS 6. iv 13. C, D, E IN ANY ORDERS 7. ii Found a mistake?',
    'The answer is ix.'
  );
  INSERT INTO exam_options ("Id","QuestionId","Idx","ContentMd","IsCorrect") VALUES
    ('655e49a3-410c-4944-8c19-6e7a8ed02a66'::uuid, qid, 1, 'A. Option A', true),
    ('e9a0abc4-79c2-40cb-ada9-5b24dc475cd6'::uuid, qid, 2, 'B. Option B', false),
    ('221482f7-a3c8-44ba-9609-5cdf9819fbed'::uuid, qid, 3, 'C. Option C', false),
    ('20972655-d5ee-4de3-b3cd-b72835daa1a7'::uuid, qid, 4, 'D. Option D', false);

  qid := '6c434a1e-3919-4b36-ae9f-0b2ea5a6710d'::uuid;
  INSERT INTO exam_questions ("Id","SectionId","Idx","Type","Skill","Difficulty","PromptMd","ExplanationMd")
  VALUES (
    qid, sec1, 6,
    'MULTIPLE_CHOICE_SINGLE','READING',2,
    'iv 13. C, D, E IN ANY ORDERS 7. ii Found a mistake?',
    'The answer is iv.'
  );
  INSERT INTO exam_options ("Id","QuestionId","Idx","ContentMd","IsCorrect") VALUES
    ('3fcd68bb-9933-4025-bdb9-578acec4f329'::uuid, qid, 1, 'A. Option A', true),
    ('1e317bf3-50af-4fca-a4d0-b1739e7c8179'::uuid, qid, 2, 'B. Option B', false),
    ('98ea764b-7ce7-4329-acb0-d47b3389a482'::uuid, qid, 3, 'C. Option C', false),
    ('35046fd2-9853-4743-a316-f22014447fe6'::uuid, qid, 4, 'D. Option D', false);

  qid := 'd0506c23-c865-4d90-a779-388d8e3c16a6'::uuid;
  INSERT INTO exam_questions ("Id","SectionId","Idx","Type","Skill","Difficulty","PromptMd","ExplanationMd")
  VALUES (
    qid, sec1, 7,
    'MULTIPLE_CHOICE_SINGLE','READING',2,
    'ii Found a mistake?',
    'The answer is ii.'
  );
  INSERT INTO exam_options ("Id","QuestionId","Idx","ContentMd","IsCorrect") VALUES
    ('ceaeb723-a821-4dcb-be3a-298ed17eced5'::uuid, qid, 1, 'A. Option A', true),
    ('d6c6176d-4c42-4220-8e76-9fd9d918748a'::uuid, qid, 2, 'B. Option B', false),
    ('d90d8a15-bc36-4bcd-8903-24a199277b8f'::uuid, qid, 3, 'C. Option C', false),
    ('6bbf8e99-cb4c-4ab3-bf95-e0c7aee09442'::uuid, qid, 4, 'D. Option D', false);

  qid := 'be90e459-7583-46c9-a843-49fb44a31a8c'::uuid;
  INSERT INTO exam_questions ("Id","SectionId","Idx","Type","Skill","Difficulty","PromptMd","ExplanationMd")
  VALUES (
    qid, sec1, 8,
    'TRUE_FALSE_NOT_GIVEN','READING',1,
    'He is less famous than he should be',
    'The answer is True.'
  );
  INSERT INTO exam_options ("Id","QuestionId","Idx","ContentMd","IsCorrect") VALUES
    ('0c07e397-686b-42af-bed9-1ecbdeac6892'::uuid, qid, 1, 'True', true),
    ('02282965-273a-46b5-86a7-872374789ef2'::uuid, qid, 2, 'False', false),
    ('8aab3f6b-f9c5-461e-ad62-dc0863ef1a20'::uuid, qid, 3, 'Not Given', false);

  qid := 'cefb9edb-d29f-4c87-841d-89ff036dd6bc'::uuid;
  INSERT INTO exam_questions ("Id","SectionId","Idx","Type","Skill","Difficulty","PromptMd","ExplanationMd")
  VALUES (
    qid, sec1, 9,
    'TRUE_FALSE_NOT_GIVEN','READING',1,
    'He was famous as a doctor before he was employed by the Queen',
    'The answer is True.'
  );
  INSERT INTO exam_options ("Id","QuestionId","Idx","ContentMd","IsCorrect") VALUES
    ('8989da58-2f4a-4e32-85de-fb81de59042c'::uuid, qid, 1, 'True', true),
    ('d5da90b7-5d8e-49b8-9501-1f409b5d7936'::uuid, qid, 2, 'False', false),
    ('73f9be9f-eea4-4eba-ad02-3e8ac6df7381'::uuid, qid, 3, 'Not Given', false);

  qid := 'b2db3701-771a-46af-8a3e-4e5a6b3f8146'::uuid;
  INSERT INTO exam_questions ("Id","SectionId","Idx","Type","Skill","Difficulty","PromptMd","ExplanationMd")
  VALUES (
    qid, sec1, 10,
    'TRUE_FALSE_NOT_GIVEN','READING',1,
    'He lost faith in the medical theories of his time',
    'The answer is Not Given.'
  );
  INSERT INTO exam_options ("Id","QuestionId","Idx","ContentMd","IsCorrect") VALUES
    ('bff93edc-f16e-4c79-adad-dd00b564ff07'::uuid, qid, 1, 'True', false),
    ('432e9e51-8806-4d62-8976-b919f4b87da7'::uuid, qid, 2, 'False', false),
    ('3031f114-9604-492e-a7e8-1b2f149943fb'::uuid, qid, 3, 'Not Given', true);

  qid := 'd264be00-7720-4604-9236-af310b94b4f6'::uuid;
  INSERT INTO exam_questions ("Id","SectionId","Idx","Type","Skill","Difficulty","PromptMd","ExplanationMd")
  VALUES (
    qid, sec1, 11,
    'MULTIPLE_CHOICE_SINGLE','READING',2,
    'C, D, E IN ANY ORDERS 5. ix 12. C, D, E IN ANY ORDERS 6. iv 13. C, D, E IN ANY ORDERS 7. ii Found a mistake?',
    'The answer is C, D, E   IN ANY ORDERS.'
  );
  INSERT INTO exam_options ("Id","QuestionId","Idx","ContentMd","IsCorrect") VALUES
    ('1cebf658-6cbf-48ec-88cf-d4156e32880b'::uuid, qid, 1, 'A. Option A', true),
    ('0f537ee5-e220-4d5c-af19-9cd0542f46ac'::uuid, qid, 2, 'B. Option B', false),
    ('c87b7de4-05b5-4a60-b38d-68efde72bda3'::uuid, qid, 3, 'C. Option C', false),
    ('8395be9c-5be0-4cb7-b97d-fd85a889ff32'::uuid, qid, 4, 'D. Option D', false);

  qid := '344cc444-79d6-4fc1-9107-22b2a32c81a7'::uuid;
  INSERT INTO exam_questions ("Id","SectionId","Idx","Type","Skill","Difficulty","PromptMd","ExplanationMd")
  VALUES (
    qid, sec1, 12,
    'MULTIPLE_CHOICE_SINGLE','READING',2,
    'C, D, E IN ANY ORDERS 6. iv 13. C, D, E IN ANY ORDERS 7. ii Found a mistake?',
    'The answer is C, D, E   IN ANY ORDERS.'
  );
  INSERT INTO exam_options ("Id","QuestionId","Idx","ContentMd","IsCorrect") VALUES
    ('7011b1cd-cade-459d-9c57-2b5596b04ee6'::uuid, qid, 1, 'A. Option A', true),
    ('0b86f2f7-9307-4a4e-b7c8-4e69bebf1fd5'::uuid, qid, 2, 'B. Option B', false),
    ('69e17780-1e45-46c7-9043-87183ef10218'::uuid, qid, 3, 'C. Option C', false),
    ('980c48b9-a7ba-4cd7-bd4d-7fe82a347e11'::uuid, qid, 4, 'D. Option D', false);

  qid := '4f8b8406-2730-4d6f-8a4f-a4647386aef3'::uuid;
  INSERT INTO exam_questions ("Id","SectionId","Idx","Type","Skill","Difficulty","PromptMd","ExplanationMd")
  VALUES (
    qid, sec1, 13,
    'MULTIPLE_CHOICE_SINGLE','READING',2,
    'C, D, E IN ANY ORDERS 7. ii Found a mistake?',
    'The answer is C, D, E   IN ANY ORDERS.'
  );
  INSERT INTO exam_options ("Id","QuestionId","Idx","ContentMd","IsCorrect") VALUES
    ('a09071bb-5001-4f2d-853d-0fd53e06f227'::uuid, qid, 1, 'A. Option A', true),
    ('c3b1b8dd-e4a0-4fae-8ae4-748de68e7a20'::uuid, qid, 2, 'B. Option B', false),
    ('e54b590b-50a6-458a-9399-63076d3ec4d5'::uuid, qid, 3, 'C. Option C', false),
    ('139a2f38-65e2-4f0e-968b-59ed6e6ebd7f'::uuid, qid, 4, 'D. Option D', false);

END$$;

COMMIT;