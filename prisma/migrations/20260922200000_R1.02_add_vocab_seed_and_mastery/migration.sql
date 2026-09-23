-- CreateTable VocabSeed (shared pool, immutable content)
CREATE TABLE "VocabSeed" (
    "idSeed" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "meaning" TEXT NOT NULL,
    "phonetic" TEXT,
    "example" TEXT,
    "exampleAudioUrl" TEXT,
    "ipa" TEXT,
    "VocabType" "VocabType" NOT NULL,
    "tier" INTEGER NOT NULL DEFAULT 1,
    "frequencyRank" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "VocabSeed_pkey" PRIMARY KEY ("idSeed")
);

CREATE UNIQUE INDEX "VocabSeed_word_VocabType_key" ON "VocabSeed"("word", "VocabType");
CREATE INDEX "VocabSeed_tier_frequencyRank_idx" ON "VocabSeed"("tier", "frequencyRank");

-- CreateTable VocabMastery (1-to-1 SR state per Vocabulary)
CREATE TABLE "VocabMastery" (
    "idVocab" TEXT NOT NULL,
    "timesReviewed" INTEGER NOT NULL DEFAULT 0,
    "easinessFactor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "interval" INTEGER NOT NULL DEFAULT 1,
    "nextReviewAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'new',
    "totalAttempts" INTEGER NOT NULL DEFAULT 0,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "accuracy" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "VocabMastery_pkey" PRIMARY KEY ("idVocab")
);

CREATE INDEX "VocabMastery_nextReviewAt_idx" ON "VocabMastery"("nextReviewAt");

-- AlterTable Vocabulary: add sourceSeedId
ALTER TABLE "Vocabulary" ADD COLUMN "sourceSeedId" TEXT;

CREATE INDEX "Vocabulary_sourceSeedId_idx" ON "Vocabulary"("sourceSeedId");

-- AddForeignKey: VocabMastery.idVocab → Vocabulary.idVocab (CASCADE)
ALTER TABLE "VocabMastery" ADD CONSTRAINT "VocabMastery_idVocab_fkey"
    FOREIGN KEY ("idVocab") REFERENCES "Vocabulary"("idVocab") ON DELETE CASCADE;

-- AddForeignKey: Vocabulary.sourceSeedId → VocabSeed.idSeed (SET NULL)
ALTER TABLE "Vocabulary" ADD CONSTRAINT "Vocabulary_sourceSeedId_fkey"
    FOREIGN KEY ("sourceSeedId") REFERENCES "VocabSeed"("idSeed") ON DELETE SET NULL;
