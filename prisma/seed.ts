import { PrismaClient, loaiDe, Level, WritingTaskType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Start seeding sample tests...');

  // ===== 1️⃣ ADMIN USER =====
  const admin = await prisma.user.findUnique({
    where: { email: 'khoadd879@gmail.com' },
  });

  if (!admin) {
    throw new Error('⚠️ Admin user not found — please check email');
  }

  // ===== 2️⃣ READING TEST =====
  const readingTest = await prisma.de.create({
    data: {
      idUser: admin.idUser,
      title: 'IELTS Reading Practice Test – The kākāpō (Questions 1–6)',
      duration: 60,
      loaiDe: loaiDe.READING,
      numberQuestion: 6,
      level: Level.Mid,
      description:
        'IELTS Reading Passage 1 about the endangered kākāpō bird. Includes questions 1–6 (TFNG type).',
    },
  });

  const readingPart = await prisma.part.create({
    data: {
      idDe: readingTest.idDe,
      namePart: 'Passage 1 – The kākāpō',
    },
  });

  const readingPassage = await prisma.doanVan.create({
    data: {
      idPart: readingPart.idPart,
      title: 'The kākāpō',
      content: `The kākāpō is a nocturnal, flightless parrot that is critically endangered and one of New Zealand's unique treasures.

The kākāpō, also known as the owl parrot, is a large, forest-dwelling bird, with a pale owl-like face. Up to 64 cm in length, it has predominantly yellow-green feathers, forward-facing eyes, a large grey beak, large blue feet, and relatively short wings and tail. It is the world's only flightless parrot, and is also possibly one of the world's longest-living birds, with a reported lifespan of up to 100 years.

Kākāpō are solitary birds and tend to occupy the same home range for many years. They forage on the ground and climb high into trees. They often leap from trees and flap their wings, but at best manage a controlled descent to the ground. They are entirely vegetarian, with their diet including the leaves, roots and bark of trees as well as bulbs, and fern fronds.

Kākāpō breed in summer and autumn, but only in years when food is plentiful. Males play no part in incubation or chick-rearing – females alone incubate eggs and feed the chicks. The 1–4 eggs are laid in soil, which is repeatedly turned over before and during incubation. The female kākāpō has to spend long periods away from the nest searching for food, which leaves the unattended eggs and chicks particularly vulnerable to predators.

Before humans arrived, kākāpō were common throughout New Zealand's forests. However, this all changed with the arrival of the first Polynesian settlers about 700 years ago. For the early settlers, the flightless kākāpō was easy prey. They ate its meat and used its feathers to make soft cloaks. With them came the Polynesian dog and rat, which also preyed on kākāpō. By the time European colonisers arrived in the early 1800s, kākāpō had become confined to the central North Island and forested parts of the South Island. The fall in kākāpō numbers was accelerated by European colonisation. A great deal of habitat was lost through forest clearance, and introduced species such as deer depleted the remaining forests of food. Other predators such as cats, stoats and two more species of rat were also introduced. The kākāpō were in serious trouble.

In 1894, the New Zealand government launched its first attempt to save the kākāpō. Conservationist Richard Henry led an effort to relocate several hundred of the birds to predator-free Resolution Island in Fiordland. Unfortunately, the island didn't remain predator free – stoats arrived within six years, eventually destroying the kākāpō population. By the mid-1900s, the kākāpō was practically a lost species. Only a few clung to life in the most isolated parts of New Zealand.

From 1949 to 1973, the newly formed New Zealand Wildlife Service made over 60 expeditions to find kākāpō, focusing mainly on Fiordland. Six were caught, but there were no females amongst them and all but one died within a few months of captivity. In 1974, a new initiative was launched, and by 1977, 18 more kākāpō were found in Fiordland. However, there were still no females. In 1977, a large population of males was spotted in Rakiura – a large island free from stoats, ferrets and weasels. There were about 200 individuals, and in 1980 it was confirmed females were also present. These birds have been the foundation of all subsequent work in managing the species.

Unfortunately, predation by feral cats on Rakiura Island led to a rapid decline in kākāpō numbers. As a result, during 1980-97, the surviving population was evacuated to three island sanctuaries: Codfish Island, Maud Island and Little Barrier Island. However, breeding success was hard to achieve. Rats were found to be a major predator of kākāpō chicks and an insufficient number of chicks survived to offset adult mortality. By 1995, although at least 12 chicks had been produced on the islands, only three had survived. The kākāpō population had dropped to 51 birds. The critical situation prompted an urgent review of kākāpō management in New Zealand.

In 1996, a new Recovery Plan was launched, together with a specialist advisory group called the Kākāpō Scientific and Technical Advisory Committee and a higher amount of funding. Renewed steps were taken to control predators on the three islands. Cats were eradicated from Little Barrier Island in 1980, and possums were eradicated from Codfish Island by 1986. However, the population did not start to increase until rats were removed from all three islands, and the birds were more intensively managed. This involved moving the birds between islands, supplementary feeding of adults and rescuing and hand-raising any failing chicks.

After the first five years of the Recovery Plan, the population was on target. By 2000, five new females had been produced, and the total population had grown to 62 birds. For the first time, there was cautious optimism for the future of kākāpō and by June 2020, a total of 210 birds was recorded.

Today, kākāpō management continues to be guided by the kākāpō Recovery Plan. Its key goals are: minimise the loss of genetic diversity in the kākāpō population, restore or maintain sufficient habitat to accommodate the expected increase in the kākāpō population, and ensure stakeholders continue to be fully engaged in the preservation of the species.`,
      numberParagraph: 10,
      image: `https://cms.youpass.vn/assets/b3fcbb1e-3d9c-4d6d-bcfd-7485d0048ec3?width=400`,
    },
  });

  const readingGroup = await prisma.nhomCauHoi.create({
    data: {
      idDe: readingTest.idDe,
      idPart: readingPart.idPart,
      title: `Do the following statements agree with the information given in Reading Passage 1?
In boxes 1–6 on your answer sheet, write:
TRUE if the statement agrees with the information
FALSE if the statement contradicts the information
NOT GIVEN if there is no information on this.`,
      typeQuestion: 'TFNG',
      startingOrder: 1,
      endingOrder: 6,
    },
  });

  await prisma.cauHoi.createMany({
    data: [
      {
        idNhomCauHoi: readingGroup.idNhomCauHoi,
        idPart: readingPart.idPart,
        numberQuestion: 1,
        content: `There are other parrots that share the kākāpō's inability to fly.`,
      },
      {
        idNhomCauHoi: readingGroup.idNhomCauHoi,
        idPart: readingPart.idPart,
        numberQuestion: 2,
        content: `Adult kākāpō produce chicks every year.`,
      },
      {
        idNhomCauHoi: readingGroup.idNhomCauHoi,
        idPart: readingPart.idPart,
        numberQuestion: 3,
        content: `Adult male kākāpō bring food back to nesting females.`,
      },
      {
        idNhomCauHoi: readingGroup.idNhomCauHoi,
        idPart: readingPart.idPart,
        numberQuestion: 4,
        content: `The Polynesian rat was a greater threat to the kākāpō than Polynesian settlers.`,
      },
      {
        idNhomCauHoi: readingGroup.idNhomCauHoi,
        idPart: readingPart.idPart,
        numberQuestion: 5,
        content: `Kākāpō were transferred from Rakiura Island to other locations because they were at risk from feral cats.`,
      },
      {
        idNhomCauHoi: readingGroup.idNhomCauHoi,
        idPart: readingPart.idPart,
        numberQuestion: 6,
        content: `One Recovery Plan initiative that helped increase the kākāpō population size was caring for struggling young birds.`,
      },
    ],
  });

  const questions = await prisma.cauHoi.findMany({
    where: { idNhomCauHoi: readingGroup.idNhomCauHoi },
    orderBy: { numberQuestion: 'asc' },
  });

  const answersData = [
    { question: 1, text: 'FALSE' },
    { question: 2, text: 'FALSE' },
    { question: 3, text: 'FALSE' },
    { question: 4, text: 'NOT GIVEN' },
    { question: 5, text: 'TRUE' },
    { question: 6, text: 'TRUE' },
  ];

  for (const ans of answersData) {
    const cauHoi = questions.find((q) => q.numberQuestion === ans.question);
    if (!cauHoi) continue;

    await prisma.answer.create({
      data: {
        idCauHoi: cauHoi.idCauHoi,
        answer_text: ans.text,
      },
    });
  }

  console.log('✅ Answers created successfully!');

  console.log('✅ Seeding complete!');
  console.log({ readingTest });
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
