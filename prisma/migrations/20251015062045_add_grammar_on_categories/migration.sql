/*
  Warnings:

  - You are about to drop the column `idGrammarCategory` on the `Grammar` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Grammar" DROP CONSTRAINT "Grammar_idGrammarCategory_fkey";

-- AlterTable
ALTER TABLE "Grammar" DROP COLUMN "idGrammarCategory";

-- CreateTable
CREATE TABLE "GrammarsOnCategories" (
    "idGrammarCategory" TEXT NOT NULL,
    "idGrammar" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT NOT NULL,

    CONSTRAINT "GrammarsOnCategories_pkey" PRIMARY KEY ("idGrammarCategory","idGrammar")
);

-- AddForeignKey
ALTER TABLE "GrammarsOnCategories" ADD CONSTRAINT "GrammarsOnCategories_idGrammarCategory_fkey" FOREIGN KEY ("idGrammarCategory") REFERENCES "GrammarCategory"("idGrammarCategory") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrammarsOnCategories" ADD CONSTRAINT "GrammarsOnCategories_idGrammar_fkey" FOREIGN KEY ("idGrammar") REFERENCES "Grammar"("idGrammar") ON DELETE CASCADE ON UPDATE CASCADE;
