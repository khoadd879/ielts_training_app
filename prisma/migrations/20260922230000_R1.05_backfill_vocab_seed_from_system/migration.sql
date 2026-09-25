-- R1.05: Backfill VocabSeed từ system rows trong Vocabulary
-- System rows = idUser = system fake user (giữ row, isActive=false sau R1.08)
-- DISTINCT ON để xử lý 102 duplicates: pick row cũ nhất per (word, VocabType)
INSERT INTO "VocabSeed" (
    "idSeed", "word", "meaning", "phonetic", "example", "VocabType",
    "tier", "frequencyRank", "createdAt", "updatedAt"
)
SELECT DISTINCT ON (word, "VocabType")
    "idVocab", "word", "meaning", "phonetic", "example", "VocabType",
    "tier", "frequencyRank", "createdAt", "updatedAt"
FROM "Vocabulary"
WHERE "idUser" = 'c73c7a63-ca7e-4d64-9469-41cb8ce59d88'
ORDER BY word, "VocabType", "createdAt" ASC;

-- Link Vocabulary.sourceSeedId → VocabSeed.idSeed (cho cả dupes, trỏ về 1 seed)
UPDATE "Vocabulary" uv
SET "sourceSeedId" = vs."idSeed"
FROM "VocabSeed" vs
WHERE uv.word = vs.word
  AND uv."VocabType" = vs."VocabType"
  AND uv."idUser" = 'c73c7a63-ca7e-4d64-9469-41cb8ce59d88';
