-- AlterTable Topic: make idUser nullable + add isDefault
ALTER TABLE "Topic" ALTER COLUMN "idUser" DROP NOT NULL;
ALTER TABLE "Topic" ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;

-- Topic uniqueness (mirror GrammarCategory pattern)
CREATE UNIQUE INDEX "Topic_idUser_nameTopic_key" ON "Topic"("idUser", "nameTopic");
CREATE INDEX "Topic_isDefault_idx" ON "Topic"("isDefault");

-- CreateTable TopicVocabSeed
CREATE TABLE "TopicVocabSeed" (
    "idTopic" TEXT NOT NULL,
    "idVocabSeed" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TopicVocabSeed_pkey" PRIMARY KEY ("idTopic", "idVocabSeed")
);

-- AddForeignKey TopicVocabSeed → Topic
ALTER TABLE "TopicVocabSeed" ADD CONSTRAINT "TopicVocabSeed_idTopic_fkey"
    FOREIGN KEY ("idTopic") REFERENCES "Topic"("idTopic") ON DELETE CASCADE;

-- AddForeignKey TopicVocabSeed → VocabSeed
ALTER TABLE "TopicVocabSeed" ADD CONSTRAINT "TopicVocabSeed_idVocabSeed_fkey"
    FOREIGN KEY ("idVocabSeed") REFERENCES "VocabSeed"("idSeed") ON DELETE CASCADE;
