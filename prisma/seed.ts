import { PrismaClient, loaiDe, Level } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Start seeding sample Reading test...');

  // ===== 1️⃣ ADMIN USER =====
  const admin = await prisma.user.findUnique({
    where: { email: 'khoadd879@gmail.com' },
  });

  if (!admin) throw new Error('⚠️ Admin user not found — please check email');

  // ===== 2️⃣ READING TEST =====
  const readingTest = await prisma.de.create({
    data: {
      idUser: admin.idUser,
      title: 'IELTS Reading Practice Test – The kākāpō (Questions 1–6)',
      duration: 60,
      loaiDe: loaiDe.READING,
      numberQuestion: 14,
      level: Level.Mid,
      description: 'How stress affects our judgement',
      img: `https://cms.youpass.vn/assets/b82aac6b-b273-4a93-b40f-344930d72aab?width=400`,
    },
  });

  const readingPart = await prisma.part.create({
    data: {
      idDe: readingTest.idDe,
      namePart: 'How stress affects our judgement',
    },
  });

  const readingPassage = await prisma.doanVan.create({
    data: {
      idPart: readingPart.idPart,
      title: 'How stress affects our judgement',
      content: `Some of the most important decisions of our lives occur while we're feeling stressed and anxious... (rút gọn cho ngắn)`,
      numberParagraph: 10,
      image: `https://cms.youpass.vn/assets/b82aac6b-b273-4a93-b40f-344930d72aab?width=400`,
    },
  });

  // ===== 3️⃣ GROUP 1 - MULTIPLE CHOICE =====
  const readingGroup1 = await prisma.nhomCauHoi.create({
    data: {
      idDe: readingTest.idDe,
      idPart: readingPart.idPart,
      title: `Do the following statements agree with the information given in Reading Passage 1?

In boxes 1 - 7 on your answer sheet, write

TRUE               if the statement agrees with the information

FALSE              if the statement contradicts the information

NOT GIVEN     if there is no information on this`,
      typeQuestion: 'TFNG',
      startingOrder: 1,
      endingOrder: 7,
    },
  });

  // --- Câu hỏi và đáp án thực tế ---
  const questionsData = [
    {
      numberQuestion: 1,
      content: `Archaeological research had taken place on the island of Obi before the arrival of Ceri Shipton and his colleagues.`,
      correct: 'FALSE',
    },
    {
      numberQuestion: 2,
      content: `At the Keio sites, the researchers found the first clam shell axes ever to be discovered in the region.`,
      correct: 'FALSE',
    },
    {
      numberQuestion: 3,
      content: `The size of Obi today is less than it was 18,000 years ago.`,
      correct: 'TRUE',
    },
    {
      numberQuestion: 4,
      content: `A change in the climate around 11,700 years ago had a greater impact on Obi than on the surrounding islands.`,
      correct: 'NOT GIVEN',
    },
    {
      numberQuestion: 5,
      content: `The researchers believe there is a connection between warmer, wetter weather and a change in the material used to make axes.`,
      correct: 'TRUE',
    },
    {
      numberQuestion: 6,
      content: `Shipton's team were surprised to find evidence of the Obi islanders' hunting practices.`,
      correct: 'NOT GIVEN',
    },
    {
      numberQuestion: 7,
      content: `It is thought that the Keio shelters were occupied continuously until about 1,000 years ago.`,
      correct: 'FALSE',
    },
  ];

  // --- Tạo câu hỏi và đáp án ---
  for (const q of questionsData) {
    const cauHoi = await prisma.cauHoi.create({
      data: {
        idNhomCauHoi: readingGroup1.idNhomCauHoi,
        idPart: readingPart.idPart,
        numberQuestion: q.numberQuestion,
        content: q.content,
      },
    });

    await prisma.answer.create({
      data: {
        idCauHoi: cauHoi.idCauHoi,
        answer_text: q.correct,
      },
    });
  }

  // ===== 4️⃣ GROUP 2 - MATCHING =====
  const readingGroup2 = await prisma.nhomCauHoi.create({
    data: {
      idDe: readingTest.idDe,
      idPart: readingPart.idPart,
      title: `Complete each sentence with the correct ending, A–G.`,
      typeQuestion: 'MATCHING',
      startingOrder: 5,
      endingOrder: 9,
    },
  });

  const matchingQuestions = [
    {
      numberQuestion: 5,
      content: `At times when they were relaxed, the firefighters usually`,
      correct: 'B', // took relatively little notice of bad news
    },
    {
      numberQuestion: 6,
      content: `When they were stressed, the firefighters`,
      correct: 'D', // were feeling under stress
    },
    {
      numberQuestion: 7,
      content: `When the firefighters were told good news, they`,
      correct: 'C', // responded to negative and positive information in the same way
    },
    {
      numberQuestion: 8,
      content: `The students' cortisol levels and heart rates increased when they`,
      correct: 'E', // were put in a stressful situation
    },
    {
      numberQuestion: 9,
      content: `Negative information was processed better when the subjects`,
      correct: 'G', // thought it more likely they would experience something bad
    },
  ];

  for (const mq of matchingQuestions) {
    const cauHoi = await prisma.cauHoi.create({
      data: {
        idNhomCauHoi: readingGroup2.idNhomCauHoi,
        idPart: readingPart.idPart,
        numberQuestion: mq.numberQuestion,
        content: mq.content,
      },
    });
    await prisma.answer.create({
      data: {
        idCauHoi: cauHoi.idCauHoi,
        answer_text: mq.correct,
      },
    });
  }

  // ===== 5️⃣ GROUP 3 - YES/NO/NOT GIVEN =====
  const readingGroup3 = await prisma.nhomCauHoi.create({
    data: {
      idDe: readingTest.idDe,
      idPart: readingPart.idPart,
      title: `Do the following statements agree with the information given in Reading Passage 3?`,
      typeQuestion: 'YES_NO_NOTGIVEN',
      startingOrder: 10,
      endingOrder: 14,
    },
  });

  const ynQuestions = [
    {
      numberQuestion: 10,
      content: `The tone of the content we post on social media tends to reflect the nature of the posts in our feeds.`,
      correct: 'YES',
    },
    {
      numberQuestion: 11,
      content: `Phones have a greater impact on our stress levels than other electronic media devices.`,
      correct: 'NOT GIVEN',
    },
    {
      numberQuestion: 12,
      content: `The more we read about a stressful public event on social media, the less able we are to take the information in.`,
      correct: 'NO',
    },
    {
      numberQuestion: 13,
      content: `Stress created by social media posts can lead us to take unnecessary precautions.`,
      correct: 'YES',
    },
    {
      numberQuestion: 14,
      content: `Our tendency to be affected by other people's moods can be used in a positive way.`,
      correct: 'YES',
    },
  ];

  for (const yq of ynQuestions) {
    const cauHoi = await prisma.cauHoi.create({
      data: {
        idNhomCauHoi: readingGroup3.idNhomCauHoi,
        idPart: readingPart.idPart,
        numberQuestion: yq.numberQuestion,
        content: yq.content,
      },
    });
    await prisma.answer.create({
      data: {
        idCauHoi: cauHoi.idCauHoi,
        answer_text: yq.correct,
      },
    });
  }

  console.log('✅ Seeding Reading test complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
