-- AddForeignKey
ALTER TABLE "UserGrammarProficiency" ADD CONSTRAINT "UserGrammarProficiency_idUser_fkey" FOREIGN KEY ("idUser") REFERENCES "User"("idUser") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGrammarViolation" ADD CONSTRAINT "UserGrammarViolation_idGrammar_fkey" FOREIGN KEY ("idGrammar") REFERENCES "Grammar"("idGrammar") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGrammarViolation" ADD CONSTRAINT "UserGrammarViolation_idUser_fkey" FOREIGN KEY ("idUser") REFERENCES "User"("idUser") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionTypePerformance" ADD CONSTRAINT "QuestionTypePerformance_idUser_fkey" FOREIGN KEY ("idUser") REFERENCES "User"("idUser") ON DELETE CASCADE ON UPDATE CASCADE;
