import { PrismaClient, loaiDe, Level } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Start seeding Reading C19T3...');

  // ===== 1️⃣ ADMIN USER =====
  const admin = await prisma.user.findUnique({
    where: { email: 'khoadd879@gmail.com' },
  });
  if (!admin) throw new Error('⚠️ Admin not found — check email');

  // ===== 2️⃣ READING TEST =====
  const test = await prisma.de.create({
    data: {
      idUser: admin.idUser,
      title:
        '[C19T3] Archaeologists discover evidence of prehistoric island settlers',
      description:
        'A passage about early human settlement and adaptation on the island of Obi.',
      duration: 60,
      numberQuestion: 13,
      loaiDe: loaiDe.READING,
      level: Level.Mid,
      img: 'https://ielts.org/sites/default/files/styles/thumbnail/public/2024-04/archaeology.jpg',
    },
  });

  const part = await prisma.part.create({
    data: {
      idDe: test.idDe,
      namePart:
        'Archaeologists discover evidence of prehistoric island settlers',
    },
  });

  const passage = await prisma.doanVan.create({
    data: {
      idPart: part.idPart,
      title: 'Archaeologists discover evidence of prehistoric island settlers',
      content: `In early April 2019, Dr. Ceri Shipton and his colleagues ... (full text shortened for storage)
The excavations suggest people successfully lived in the two Keio shelters for about 10,000 years...`,
      numberParagraph: 10,
      image:
        'https://cms.youpass.vn/assets/b82aac6b-b273-4a93-b40f-344930d72aab?width=400',
    },
  });

  // ===== 3️⃣ GROUP 1: TRUE/FALSE/NOT GIVEN =====
  const group1 = await prisma.nhomCauHoi.create({
    data: {
      idDe: test.idDe,
      idPart: part.idPart,
      title:
        'Do the following statements agree with the information given in Reading Passage 1?',
      typeQuestion: 'TFNG',
      startingOrder: 1,
      endingOrder: 7,
    },
  });

  const tfngQuestions = [
    {
      numberQuestion: 1,
      content:
        'Archaeological research had taken place on the island of Obi before the arrival of Ceri Shipton and his colleagues.',
      correct: 'FALSE',
    },
    {
      numberQuestion: 2,
      content:
        'At the Keio sites, the researchers found the first clam shell axes ever to be discovered in the region.',
      correct: 'FALSE',
    },
    {
      numberQuestion: 3,
      content: 'The size of Obi today is less than it was 18,000 years ago.',
      correct: 'TRUE',
    },
    {
      numberQuestion: 4,
      content:
        'A change in the climate around 11,700 years ago had a greater impact on Obi than on the surrounding islands.',
      correct: 'NOT GIVEN',
    },
    {
      numberQuestion: 5,
      content:
        'The researchers believe there is a connection between warmer, wetter weather and a change in the material used to make axes.',
      correct: 'TRUE',
    },
    {
      numberQuestion: 6,
      content:
        "Shipton's team were surprised to find evidence of the Obi islanders' hunting practices.",
      correct: 'NOT GIVEN',
    },
    {
      numberQuestion: 7,
      content:
        'It is thought that the Keio shelters were occupied continuously until about 1,000 years ago.',
      correct: 'FALSE',
    },
  ];

  for (const q of tfngQuestions) {
    const question = await prisma.cauHoi.create({
      data: {
        idNhomCauHoi: group1.idNhomCauHoi,
        idPart: part.idPart,
        numberQuestion: q.numberQuestion,
        content: q.content,
      },
    });

    await prisma.answer.create({
      data: {
        idCauHoi: question.idCauHoi,
        answer_text: q.correct,
      },
    });
  }

  // ===== 4️⃣ GROUP 2: GAP FILLING =====
  const group2 = await prisma.nhomCauHoi.create({
    data: {
      idDe: test.idDe,
      idPart: part.idPart,
      title:
        'Complete the notes below. Choose ONE WORD ONLY from the passage for each answer.',
      typeQuestion: 'FILL_BLANK',
      startingOrder: 8,
      endingOrder: 13,
    },
  });

  const gapFillQuestions = [
    {
      numberQuestion: 8,
      content:
        'Excavations of rock shelters inside ___ near the village of Keio revealed:',
      correct: 'caves',
    },
    {
      numberQuestion: 9,
      content: 'Axes made out of ___, dating from around 11,700 years ago',
      correct: 'stone',
    },
    {
      numberQuestion: 10,
      content: '___ of an animal: evidence of what ancient islanders ate',
      correct: 'bones',
    },
    {
      numberQuestion: 11,
      content:
        'Evidence of travel between islands: obsidian and ___ which resembled ones found on other islands.',
      correct: 'beads',
    },
    {
      numberQuestion: 12,
      content: 'Had ___ as well as items made out of metal',
      correct: 'pottery',
    },
    {
      numberQuestion: 13,
      content: 'Probably took part in the production and sale of ___',
      correct: 'spices',
    },
  ];

  for (const q of gapFillQuestions) {
    const question = await prisma.cauHoi.create({
      data: {
        idNhomCauHoi: group2.idNhomCauHoi,
        idPart: part.idPart,
        numberQuestion: q.numberQuestion,
        content: q.content,
      },
    });

    await prisma.answer.create({
      data: {
        idCauHoi: question.idCauHoi,
        answer_text: q.correct,
      },
    });
  }

  console.log('✅ Seeding [C19T3] complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
