-- AlterTable
ALTER TABLE "UserGrammarProficiency" ADD COLUMN     "correctUsages" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "consecutiveCorrect" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "violations" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "UserGrammarExerciseSR" (
    "id" TEXT NOT NULL,
    "idUser" TEXT NOT NULL,
    "idExercise" TEXT NOT NULL,
    "interval" INTEGER NOT NULL DEFAULT 1,
    "nextReviewAt" TIMESTAMP(3) NOT NULL,
    "easeFactor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,

    CONSTRAINT "UserGrammarExerciseSR_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserGrammarExerciseSR_idUser_idExercise_key" ON "UserGrammarExerciseSR"("idUser", "idExercise");
