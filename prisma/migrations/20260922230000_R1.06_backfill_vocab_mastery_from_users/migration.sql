-- R1.06: Backfill VocabMastery từ real-user Vocabulary rows (BỎ QUA system rows)
-- Real-user rows = idUser != system fake user
-- Map old status string (SM-2 lifecycle) → ProficiencyLevel enum
INSERT INTO "VocabMastery" (
    "idVocab", "timesReviewed", "easinessFactor", "interval", "nextReviewAt",
    "status", "createdAt", "updatedAt"
)
SELECT
    v."idVocab",
    v."timesReviewed",
    v."easinessFactor",
    v."interval",
    v."nextReviewAt",
    CASE v.status
        WHEN 'mastered' THEN 'MASTERED'::"ProficiencyLevel"
        WHEN 'review'   THEN 'STRONG'::"ProficiencyLevel"
        WHEN 'learning' THEN 'MEDIUM'::"ProficiencyLevel"
        ELSE 'UNKNOWN'::"ProficiencyLevel"
    END,
    v."createdAt",
    v."updatedAt"
FROM "Vocabulary" v
WHERE v."idUser" != 'c73c7a63-ca7e-4d64-9469-41cb8ce59d88';
