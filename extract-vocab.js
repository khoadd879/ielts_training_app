// extract-vocab.js
// Run: node extract-vocab.js
// Purpose: Extract vocabulary from Cambridge IELTS website for review before seeding to DB

const https = require('https');
const cheerio = require('cheerio');
const fs = require('fs');

const URL = 'https://ielts-fighter.com/reading/tu-vung-cambridge-ielts-19_mt1641797974.html';

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
    fs.writeFileSync('/home/garan/code/doan1/ielts_training_app/cambridge-19-raw.json', JSON.stringify(vocabList, null, 2));
    console.log(`\n=== Saved ${vocabList.length} words to cambridge-19-raw.json ===`);

    // Generate seed file
    const seedContent = `// seed-cambridge-19-reviewed.js\n// Reviewed vocabulary from Cambridge IELTS 19\n\nconst { PrismaClient } = require('@prisma/client');\nconst prisma = new PrismaClient();\n\nconst CAMBRIDGE_IELTS_19 = ${JSON.stringify(vocabList, null, 2)};\n\nasync function ensureSystemUser() {\n  const systemUser = await prisma.user.findFirst({ where: { email: 'system@ielts-app.local' } });\n  if (systemUser) return systemUser.idUser;\n  const created = await prisma.user.create({\n    data: {\n      email: 'system@ielts-app.local',\n      nameUser: 'System',\n      password: 'SYSTEM_PLACEHOLDER',\n      role: 'ADMIN',\n      isActive: true,\n      accountType: 'LOCAL',\n      gender: 'Male',\n    },\n  });\n  return created.idUser;\n}\n\nasync function seed() {\n  console.log('=== Seeding ${vocabList.length} Cambridge IELTS 19 words ===');\n  const systemUserId = await ensureSystemUser();\n\n  const existing = await prisma.vocabulary.findMany({ where: { tier: 3 }, select: { word: true } });\n  const existingWords = new Set(existing.map(w => w.word.toLowerCase()));\n\n  const newWords = CAMBRIDGE_IELTS_19.filter(w => !existingWords.has(w.word.toLowerCase()));\n  console.log('New words to insert: ' + newWords.length);\n\n  let inserted = 0;\n  for (let i = 0; i < newWords.length; i += 100) {\n    const batch = newWords.slice(i, i + 100);\n    await prisma.vocabulary.createMany({\n      data: batch.map((w, idx) => ({\n        word: w.word,\n        phonetic: w.phonetic,\n        meaning: w.meaning,\n        VocabType: w.VocabType,\n        level: 'High',\n        tier: 3,\n        frequencyRank: 5001 + i + idx,\n        idUser: systemUserId,\n        status: 'new',\n      })),\n      skipDuplicates: true,\n    });\n    inserted += batch.length;\n    console.log('Progress: ' + inserted + '/' + newWords.length);\n  }\n\n  console.log('Done! Inserted ' + inserted + ' words');\n  await prisma.\\$disconnect();\n}\n\nseed().catch(console.error);\n`;

    fs.writeFileSync('/home/garan/code/doan1/ielts_training_app/seed-cambridge-19-reviewed.js', seedContent);
    console.log('\nGenerated seed-cambridge-19-reviewed.js');

  });
}).on('error', (err) => {
  console.error('Error:', err.message);
});