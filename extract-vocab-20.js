// extract-vocab-20.js
// Run: node extract-vocab-20.js
// Purpose: Extract vocabulary from Cambridge IELTS 20 website for review before seeding to DB

const https = require('https');
const cheerio = require('cheerio');
const fs = require('fs');

const URL = 'https://ielts-fighter.com/reading/tu-vung-sach-cambridge-ielts-20_mt1641797955.html';

https.get(URL, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const $ = cheerio.load(data);

    let vocabList = [];

    // Get all td elements
    const allTds = $('td').toArray();
    console.log(`Total TD elements: ${allTds.length}\n`);

    // Group by 4 (word, phonetic, type, meaning)
    for (let i = 0; i < allTds.length - 3; i += 4) {
      const word = $(allTds[i]).text().trim();
      const phonetic = $(allTds[i + 1]).text().trim();
      const type = $(allTds[i + 2]).text().trim();
      let meaning = $(allTds[i + 3]).text().trim();

      // Skip header row
      if (word === 'Từ' || word === 'Word') continue;

      // Skip if word is too short
      if (word.length < 2) continue;

      // Clean meaning (remove leading numbers like "1. ")
      meaning = meaning.replace(/^\d+\.\s*/, '').trim();

      // Map type to VocabType enum
      let VocabType = 'NOUN';
      const typeLower = type.toLowerCase();
      if (typeLower.startsWith('v') || typeLower.includes('verb')) VocabType = 'VERB';
      else if (typeLower.startsWith('adj')) VocabType = 'ADJECTIVE';
      else if (typeLower.startsWith('adv')) VocabType = 'ADVERB';
      else if (typeLower.includes('phr')) VocabType = 'PHRASE';

      vocabList.push({
        word: word.replace(/\s+/g, ' '),
        phonetic: phonetic.replace(/\s+/g, ' '),
        type: type.replace(/\s+/g, ' '),
        meaning: meaning.replace(/\s+/g, ' '),
        VocabType
      });
    }

    console.log(`=== Found ${vocabList.length} vocabulary words ===\n`);

    // Display all words for review
    console.log('=== ALL VOCABULARY (review before seed) ===\n');
    vocabList.forEach((v, i) => {
      console.log(`${i + 1}. ${v.word} | ${v.phonetic} | ${v.VocabType} (${v.type}) | ${v.meaning}`);
    });

    // Save to JSON
    fs.writeFileSync('/home/garan/code/doan1/ielts_training_app/cambridge-20-raw.json', JSON.stringify(vocabList, null, 2));
    console.log(`\n=== Saved ${vocabList.length} words to cambridge-20-raw.json ===`);

    // Generate seed file
    const seedContent = `// seed-cambridge-20-reviewed.js
// Reviewed vocabulary from Cambridge IELTS 20

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const CAMBRIDGE_IELTS_20 = ${JSON.stringify(vocabList, null, 2)};

async function ensureSystemUser() {
  const systemUser = await prisma.user.findFirst({ where: { email: 'system@ielts-app.local' } });
  if (systemUser) return systemUser.idUser;
  const created = await prisma.user.create({
    data: {
      email: 'system@ielts-app.local',
      nameUser: 'System',
      password: 'SYSTEM_PLACEHOLDER',
      role: 'ADMIN',
      isActive: true,
      accountType: 'LOCAL',
      gender: 'Male',
    },
  });
  return created.idUser;
}

async function seed() {
  console.log('=== Seeding ${vocabList.length} Cambridge IELTS 20 words ===');
  const systemUserId = await ensureSystemUser();

  const existing = await prisma.vocabulary.findMany({ where: { tier: 3 }, select: { word: true } });
  const existingWords = new Set(existing.map(w => w.word.toLowerCase()));

  const newWords = CAMBRIDGE_IELTS_20.filter(w => !existingWords.has(w.word.toLowerCase()));
  console.log('New words to insert: ' + newWords.length);

  let inserted = 0;
  for (let i = 0; i < newWords.length; i += 100) {
    const batch = newWords.slice(i, i + 100);
    await prisma.vocabulary.createMany({
      data: batch.map((w, idx) => ({
        word: w.word,
        phonetic: w.phonetic,
        meaning: w.meaning,
        VocabType: w.VocabType,
        level: 'High',
        tier: 3,
        frequencyRank: 6001 + i + idx,
        idUser: systemUserId,
        status: 'new',
      })),
      skipDuplicates: true,
    });
    inserted += batch.length;
    console.log('Progress: ' + inserted + '/' + newWords.length);
  }

  console.log('Done! Inserted ' + inserted + ' words');
  await prisma.$disconnect();
}

seed().catch(console.error);
`;

    fs.writeFileSync('/home/garan/code/doan1/ielts_training_app/seed-cambridge-20-reviewed.js', seedContent);
    console.log('\nGenerated seed-cambridge-20-reviewed.js');

  });
}).on('error', (err) => {
  console.error('Error:', err.message);
});