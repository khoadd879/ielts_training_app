-- CreateEnum ProficiencyLevel
CREATE TYPE "ProficiencyLevel" AS ENUM ('UNKNOWN', 'WEAK', 'MEDIUM', 'STRONG', 'MASTERED');

-- VocabMastery.status: table empty, drop + recreate as enum
ALTER TABLE "VocabMastery" DROP COLUMN "status";
ALTER TABLE "VocabMastery" ADD COLUMN "status" "ProficiencyLevel" NOT NULL DEFAULT 'UNKNOWN';

-- UserGrammarProficiency.proficiency: map old string values (Vietnamese + English) → enum
-- Fix 2: handle "trung bình" (Vietnamese) and lowercase "unknown"/"medium"/"strong"/"weak"
ALTER TABLE "UserGrammarProficiency"
ALTER COLUMN "proficiency" TYPE "ProficiencyLevel" USING (
  CASE LOWER("proficiency")
    WHEN 'mastered' THEN 'MASTERED'::"ProficiencyLevel"
    WHEN 'strong'   THEN 'STRONG'::"ProficiencyLevel"
    WHEN 'medium'   THEN 'MEDIUM'::"ProficiencyLevel"
    WHEN 'trung bình' THEN 'MEDIUM'::"ProficiencyLevel"
    WHEN 'weak'     THEN 'WEAK'::"ProficiencyLevel"
    ELSE 'UNKNOWN'::"ProficiencyLevel"
  END
);

ALTER TABLE "UserGrammarProficiency" ALTER COLUMN "proficiency" SET DEFAULT 'UNKNOWN';
