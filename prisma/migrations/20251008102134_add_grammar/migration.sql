-- CreateTable
CREATE TABLE "public"."GrammarCategory" (
    "idGrammarCategory" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrammarCategory_pkey" PRIMARY KEY ("idGrammarCategory")
);

-- CreateTable
CREATE TABLE "public"."Grammar" (
    "idGrammar" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "level" "public"."Level" NOT NULL DEFAULT 'Low',
    "commonMistakes" JSONB,
    "examples" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "idGrammarCategory" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Grammar_pkey" PRIMARY KEY ("idGrammar")
);

-- CreateIndex
CREATE UNIQUE INDEX "GrammarCategory_name_key" ON "public"."GrammarCategory"("name");

-- AddForeignKey
ALTER TABLE "public"."Grammar" ADD CONSTRAINT "Grammar_idGrammarCategory_fkey" FOREIGN KEY ("idGrammarCategory") REFERENCES "public"."GrammarCategory"("idGrammarCategory") ON DELETE CASCADE ON UPDATE CASCADE;
