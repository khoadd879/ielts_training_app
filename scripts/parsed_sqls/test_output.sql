BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DELETE FROM exam_options WHERE "QuestionId" IN (
  SELECT q."Id" FROM exam_questions q
  JOIN exam_sections s ON s."Id" = q."SectionId"
  JOIN exams e ON e."Id" = s."ExamId"
  WHERE e."Slug" = 'ielts-reading-mock-sustainable-futures'
);
DELETE FROM exam_questions USING exam_sections s, exams e
WHERE exam_questions."SectionId" = s."Id"
  AND s."ExamId" = e."Id"
  AND e."Slug" = 'ielts-reading-mock-sustainable-futures';
DELETE FROM exam_sections USING exams e
WHERE exam_sections."ExamId" = e."Id"
  AND e."Slug" = 'ielts-reading-mock-sustainable-futures';
DELETE FROM exams
WHERE "Slug" = 'ielts-reading-mock-sustainable-futures';

DO $$
DECLARE
  exam_id uuid := 'f55605ae-505c-4316-9960-aca5b3210d2e'::uuid;
  sec1 uuid := 'fc9525e0-5742-4301-8d3e-2aeefecb3a74'::uuid;
  qid uuid;
BEGIN
  INSERT INTO exams ("Id","Slug","Title","DescriptionMd","Category","Level","Status","DurationMin","UpdatedAt")
  VALUES (
    exam_id,
    'ielts-reading-mock-sustainable-futures',
    'IELTS Reading Mock Test - Sustainable Futures',
    'Three authentic-style IELTS Reading passages on vertical farming, circular cities, and ocean thermal energy. Includes every question type supported by the platform.',
    'IELTS',
    'C1',
    'DRAFT',
    60,
    now()
  );

  INSERT INTO exam_sections ("Id","ExamId","Idx","Title","InstructionsMd")
  VALUES (
    sec1,
    exam_id,
    1,
    'Reading Passage 1 - Vertical Farming Revolution',
    E'# Passage\n\n**Paragraph A**  \nThe city of Norchester converted a derelict textile warehouse near the freight canal into twelve stacked growing floors. Each tower now produces the same yield as forty hectares of conventional farmland while occupying the footprint of a supermarket car park.\n\n**Paragraph B**  \nInside, trays glide under custom LED ribbons that provide the full light spectrum, allowing plants to grow independent of daylight. A nutrient-film irrigation loop recirculates 95 percent of its water; most moisture is captured from indoor condensation rather than rainfall. Sensors report humidity, carbon dioxide, and nutrient flow to a central dashboard that agronomists tweak from a mobile app.\n\n**Paragraph C**  \nElectricity comes from rooftop solar canopies and a coffee-waste biogas plant, while a neighboring data center pipes surplus heat through the risers to stabilize the climate.\n\n**Paragraph D**  \nThe municipality funds paid apprenticeships for residents who calibrate the farm and earn food-handling certificates. Weekly harvests leave the elevator-sized modules every 18 days, supplying clinics with subscription produce boxes and cutting truck emissions on the delivery route by 42 percent.'
  );

  -- Section 1 questions
  qid := '2cf136fe-ebab-4608-b6c6-ad1a383c66a9'::uuid;
  INSERT INTO exam_questions ("Id","SectionId","Idx","Type","Skill","Difficulty","PromptMd","ExplanationMd")
  VALUES (
    qid, sec1, 1,
    'TRUE_FALSE_NOT_GIVEN','READING',1,
    '1. The Norchester farm stacks crops so the footprint is smaller than that of a comparable flat farm.',
    'Paragraph A states that forty hectares of yield sit on a supermarket-sized base.'
  );
  INSERT INTO exam_options ("Id","QuestionId","Idx","ContentMd","IsCorrect") VALUES
    ('c9fc3927-debe-4f8a-a0c3-a5a8f606f168'::uuid, qid, 1, 'True', true),
    ('df9f7599-9fe9-4433-8515-00b9841dc8c1'::uuid, qid, 2, 'False', false),
    ('42ea0b38-0bdd-49e7-8709-3ea44155a834'::uuid, qid, 3, 'Not Given', false);

  qid := '172c48c1-d074-4623-9456-6660778a8085'::uuid;
  INSERT INTO exam_questions ("Id","SectionId","Idx","Type","Skill","Difficulty","PromptMd","ExplanationMd")
  VALUES (
    qid, sec1, 2,
    'TRUE_FALSE_NOT_GIVEN','READING',1,
    '2. The project sources all of its electricity from coal-fired plants.',
    'Paragraph C explains the mix of solar canopies, biogas, and waste heat-no coal is mentioned.'
  );
  INSERT INTO exam_options ("Id","QuestionId","Idx","ContentMd","IsCorrect") VALUES
    ('4ad642d2-44a0-4f8c-acb0-94d6498fbf49'::uuid, qid, 1, 'True', false),
    ('7ddde6c5-2494-4e4a-8f56-3b6c9df2a180'::uuid, qid, 2, 'False', true),
    ('f1ef7bb4-fa43-4ce4-ae08-aed879459b4a'::uuid, qid, 3, 'Not Given', false);

  qid := 'ab1c0116-1f6f-48a0-9215-ac1bb1f8bf50'::uuid;
  INSERT INTO exam_questions ("Id","SectionId","Idx","Type","Skill","Difficulty","PromptMd","ExplanationMd")
  VALUES (
    qid, sec1, 3,
    'TRUE_FALSE_NOT_GIVEN','READING',1,
    '3. Researchers have already copied the Norchester climate-control system for use in Antarctica.',
    'No other sites are described, so the answer is Not Given.'
  );
  INSERT INTO exam_options ("Id","QuestionId","Idx","ContentMd","IsCorrect") VALUES
    ('6c404098-be9f-413e-ad63-da45e9e613ad'::uuid, qid, 1, 'True', false),
    ('2a4bcc1d-c9f1-432e-8ece-125ebf9d4d46'::uuid, qid, 2, 'False', false),
    ('0a11a2fd-7697-425a-af2c-75c53725e482'::uuid, qid, 3, 'Not Given', true);

END$$;

COMMIT;