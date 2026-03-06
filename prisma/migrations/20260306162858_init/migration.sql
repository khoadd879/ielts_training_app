-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN', 'GIAOVIEN');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('LOCAL', 'GOOGLE');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('Male', 'Female');

-- CreateEnum
CREATE TYPE "OTPType" AS ENUM ('OTP', 'RESET_LINK');

-- CreateEnum
CREATE TYPE "Level" AS ENUM ('Low', 'Mid', 'High', 'Great');

-- CreateEnum
CREATE TYPE "TestType" AS ENUM ('LISTENING', 'READING', 'WRITING', 'SPEAKING');

-- CreateEnum
CREATE TYPE "TestStatus" AS ENUM ('IN_PROGRESS', 'FINISHED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('MULTIPLE_CHOICE', 'TRUE_FALSE_NOT_GIVEN', 'YES_NO_NOT_GIVEN', 'MATCHING_HEADING', 'MATCHING_INFORMATION', 'MATCHING_FEATURES', 'MATCHING_SENTENCE_ENDINGS', 'SENTENCE_COMPLETION', 'SUMMARY_COMPLETION', 'NOTE_COMPLETION', 'TABLE_COMPLETION', 'FLOW_CHART_COMPLETION', 'DIAGRAM_LABELING', 'SHORT_ANSWER');

-- CreateEnum
CREATE TYPE "WritingTaskType" AS ENUM ('TASK1', 'TASK2');

-- CreateEnum
CREATE TYPE "SpeakingPartType" AS ENUM ('PART1', 'PART2', 'PART3');

-- CreateEnum
CREATE TYPE "GradingStatus" AS ENUM ('PENDING', 'GRADING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "VocabType" AS ENUM ('NOUN', 'VERB', 'ADJECTIVE', 'ADVERB', 'PHRASE', 'IDIOM', 'PREPOSITION', 'CONJUNCTION', 'INTERJECTION');

-- CreateTable
CREATE TABLE "User" (
    "idUser" TEXT NOT NULL,
    "nameUser" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "address" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "avatar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "accountType" "AccountType" NOT NULL DEFAULT 'LOCAL',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "gender" "Gender" NOT NULL DEFAULT 'Male',
    "level" "Level" NOT NULL DEFAULT 'Low',
    "xp" INTEGER NOT NULL DEFAULT 0,
    "xpToNext" INTEGER NOT NULL DEFAULT 100,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "lastStudiedAt" TIMESTAMP(3),
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "targetBandScore" DOUBLE PRECISION,
    "targetExamDate" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("idUser")
);

-- CreateTable
CREATE TABLE "VerificationCode" (
    "idCode" TEXT NOT NULL,
    "idUser" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "type" "OTPType" NOT NULL,
    "expiration" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationCode_pkey" PRIMARY KEY ("idCode")
);

-- CreateTable
CREATE TABLE "Test" (
    "idTest" TEXT NOT NULL,
    "idUser" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "img" TEXT,
    "testType" "TestType" NOT NULL,
    "duration" INTEGER NOT NULL,
    "numberQuestion" INTEGER NOT NULL,
    "audioUrl" TEXT,
    "level" "Level" NOT NULL DEFAULT 'Low',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Test_pkey" PRIMARY KEY ("idTest")
);

-- CreateTable
CREATE TABLE "Part" (
    "idPart" TEXT NOT NULL,
    "idTest" TEXT NOT NULL,
    "namePart" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "audioUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Part_pkey" PRIMARY KEY ("idPart")
);

-- CreateTable
CREATE TABLE "Passage" (
    "idPassage" TEXT NOT NULL,
    "idPart" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "image" TEXT,
    "description" TEXT,
    "audioUrl" TEXT,
    "numberParagraph" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Passage_pkey" PRIMARY KEY ("idPassage")
);

-- CreateTable
CREATE TABLE "QuestionGroup" (
    "idQuestionGroup" TEXT NOT NULL,
    "idPart" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" TEXT,
    "questionType" "QuestionType" NOT NULL,
    "imageUrl" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionGroup_pkey" PRIMARY KEY ("idQuestionGroup")
);

-- CreateTable
CREATE TABLE "Question" (
    "idQuestion" TEXT NOT NULL,
    "idQuestionGroup" TEXT NOT NULL,
    "idPart" TEXT NOT NULL,
    "questionNumber" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "questionType" "QuestionType" NOT NULL,
    "metadata" JSONB NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("idQuestion")
);

-- CreateTable
CREATE TABLE "WritingTask" (
    "idWritingTask" TEXT NOT NULL,
    "idTest" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "taskType" "WritingTaskType" NOT NULL,
    "timeLimit" INTEGER NOT NULL,
    "image" TEXT,
    "instructions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WritingTask_pkey" PRIMARY KEY ("idWritingTask")
);

-- CreateTable
CREATE TABLE "SpeakingTask" (
    "idSpeakingTask" TEXT NOT NULL,
    "idTest" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "part" "SpeakingPartType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpeakingTask_pkey" PRIMARY KEY ("idSpeakingTask")
);

-- CreateTable
CREATE TABLE "SpeakingQuestion" (
    "idSpeakingQuestion" TEXT NOT NULL,
    "idSpeakingTask" TEXT NOT NULL,
    "topic" TEXT,
    "prompt" TEXT,
    "subPrompts" JSONB,
    "preparationTime" INTEGER NOT NULL DEFAULT 0,
    "speakingTime" INTEGER NOT NULL DEFAULT 120,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SpeakingQuestion_pkey" PRIMARY KEY ("idSpeakingQuestion")
);

-- CreateTable
CREATE TABLE "UserTestResult" (
    "idTestResult" TEXT NOT NULL,
    "idUser" TEXT NOT NULL,
    "idTest" TEXT NOT NULL,
    "score" INTEGER DEFAULT 0,
    "totalCorrect" INTEGER DEFAULT 0,
    "totalQuestions" INTEGER DEFAULT 0,
    "rawScore" INTEGER DEFAULT 0,
    "bandScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "status" "TestStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "level" "Level" NOT NULL DEFAULT 'Low',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserTestResult_pkey" PRIMARY KEY ("idTestResult")
);

-- CreateTable
CREATE TABLE "UserAnswer" (
    "idUserAnswer" TEXT NOT NULL,
    "idUser" TEXT NOT NULL,
    "idQuestion" TEXT NOT NULL,
    "idTestResult" TEXT NOT NULL,
    "answerType" "QuestionType" NOT NULL,
    "answerPayload" JSONB NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAnswer_pkey" PRIMARY KEY ("idUserAnswer")
);

-- CreateTable
CREATE TABLE "UserWritingSubmission" (
    "idWritingSubmission" TEXT NOT NULL,
    "idUser" TEXT NOT NULL,
    "idWritingTask" TEXT NOT NULL,
    "idTestResult" TEXT,
    "submissionText" TEXT NOT NULL,
    "aiGradingStatus" "GradingStatus" NOT NULL DEFAULT 'PENDING',
    "aiOverallScore" DOUBLE PRECISION,
    "aiDetailedFeedback" JSONB,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gradedAt" TIMESTAMP(3),

    CONSTRAINT "UserWritingSubmission_pkey" PRIMARY KEY ("idWritingSubmission")
);

-- CreateTable
CREATE TABLE "UserSpeakingSubmission" (
    "idSpeakingSubmission" TEXT NOT NULL,
    "idUser" TEXT NOT NULL,
    "idSpeakingTask" TEXT NOT NULL,
    "idTestResult" TEXT,
    "audioUrl" TEXT NOT NULL,
    "transcript" TEXT,
    "aiGradingStatus" "GradingStatus" NOT NULL DEFAULT 'PENDING',
    "aiOverallScore" DOUBLE PRECISION,
    "aiDetailedFeedback" JSONB,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gradedAt" TIMESTAMP(3),

    CONSTRAINT "UserSpeakingSubmission_pkey" PRIMARY KEY ("idSpeakingSubmission")
);

-- CreateTable
CREATE TABLE "Vocabulary" (
    "idVocab" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "phonetic" TEXT,
    "meaning" TEXT NOT NULL,
    "example" TEXT,
    "VocabType" "VocabType" NOT NULL,
    "level" "Level",
    "correctStreak" INTEGER NOT NULL DEFAULT 0,
    "lastReviewed" TIMESTAMP(3),
    "xp" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "idUser" TEXT NOT NULL,
    "idTopic" TEXT,

    CONSTRAINT "Vocabulary_pkey" PRIMARY KEY ("idVocab")
);

-- CreateTable
CREATE TABLE "Topic" (
    "idTopic" TEXT NOT NULL,
    "nameTopic" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "idUser" TEXT NOT NULL,

    CONSTRAINT "Topic_pkey" PRIMARY KEY ("idTopic")
);

-- CreateTable
CREATE TABLE "GrammarCategory" (
    "idGrammarCategory" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "idUser" TEXT,

    CONSTRAINT "GrammarCategory_pkey" PRIMARY KEY ("idGrammarCategory")
);

-- CreateTable
CREATE TABLE "Grammar" (
    "idGrammar" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "level" "Level" NOT NULL DEFAULT 'Low',
    "commonMistakes" JSONB,
    "examples" JSONB,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Grammar_pkey" PRIMARY KEY ("idGrammar")
);

-- CreateTable
CREATE TABLE "GrammarsOnCategories" (
    "idGrammarCategory" TEXT NOT NULL,
    "idGrammar" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT NOT NULL,

    CONSTRAINT "GrammarsOnCategories_pkey" PRIMARY KEY ("idGrammarCategory","idGrammar")
);

-- CreateTable
CREATE TABLE "ForumThreads" (
    "idForumThreads" TEXT NOT NULL,
    "idUser" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ForumThreads_pkey" PRIMARY KEY ("idForumThreads")
);

-- CreateTable
CREATE TABLE "ForumPost" (
    "idForumPost" TEXT NOT NULL,
    "idForumThreads" TEXT NOT NULL,
    "idUser" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "file" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ForumPost_pkey" PRIMARY KEY ("idForumPost")
);

-- CreateTable
CREATE TABLE "ForumComment" (
    "idForumComment" TEXT NOT NULL,
    "idForumPost" TEXT NOT NULL,
    "idUser" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ForumComment_pkey" PRIMARY KEY ("idForumComment")
);

-- CreateTable
CREATE TABLE "ForumPostLikes" (
    "idForumPostLikes" TEXT NOT NULL,
    "idForumPost" TEXT NOT NULL,
    "idUser" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ForumPostLikes_pkey" PRIMARY KEY ("idForumPostLikes")
);

-- CreateTable
CREATE TABLE "ForumCommentLikes" (
    "idForumCommentLikes" TEXT NOT NULL,
    "idForumComment" TEXT NOT NULL,
    "idUser" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ForumCommentLikes_pkey" PRIMARY KEY ("idForumCommentLikes")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Test_testType_level_idx" ON "Test"("testType", "level");

-- CreateIndex
CREATE INDEX "Part_idTest_idx" ON "Part"("idTest");

-- CreateIndex
CREATE UNIQUE INDEX "Part_idTest_order_key" ON "Part"("idTest", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Passage_idPart_key" ON "Passage"("idPart");

-- CreateIndex
CREATE INDEX "QuestionGroup_idPart_order_idx" ON "QuestionGroup"("idPart", "order");

-- CreateIndex
CREATE INDEX "Question_idQuestionGroup_order_idx" ON "Question"("idQuestionGroup", "order");

-- CreateIndex
CREATE INDEX "Question_idPart_questionNumber_idx" ON "Question"("idPart", "questionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "SpeakingTask_idTest_part_key" ON "SpeakingTask"("idTest", "part");

-- CreateIndex
CREATE INDEX "SpeakingQuestion_idSpeakingTask_order_idx" ON "SpeakingQuestion"("idSpeakingTask", "order");

-- CreateIndex
CREATE INDEX "UserTestResult_idUser_status_finishedAt_idx" ON "UserTestResult"("idUser", "status", "finishedAt");

-- CreateIndex
CREATE INDEX "UserTestResult_idTest_createdAt_idx" ON "UserTestResult"("idTest", "createdAt");

-- CreateIndex
CREATE INDEX "UserAnswer_idTestResult_isCorrect_idx" ON "UserAnswer"("idTestResult", "isCorrect");

-- CreateIndex
CREATE UNIQUE INDEX "UserAnswer_idQuestion_idUser_idTestResult_key" ON "UserAnswer"("idQuestion", "idUser", "idTestResult");

-- CreateIndex
CREATE INDEX "UserWritingSubmission_idUser_aiGradingStatus_submittedAt_idx" ON "UserWritingSubmission"("idUser", "aiGradingStatus", "submittedAt");

-- CreateIndex
CREATE INDEX "UserWritingSubmission_aiGradingStatus_idx" ON "UserWritingSubmission"("aiGradingStatus");

-- CreateIndex
CREATE INDEX "UserSpeakingSubmission_idUser_aiGradingStatus_submittedAt_idx" ON "UserSpeakingSubmission"("idUser", "aiGradingStatus", "submittedAt");

-- CreateIndex
CREATE INDEX "UserSpeakingSubmission_aiGradingStatus_idx" ON "UserSpeakingSubmission"("aiGradingStatus");

-- CreateIndex
CREATE UNIQUE INDEX "GrammarCategory_idUser_name_key" ON "GrammarCategory"("idUser", "name");

-- CreateIndex
CREATE INDEX "ForumPost_idForumThreads_created_at_idx" ON "ForumPost"("idForumThreads", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "ForumPostLikes_idForumPost_idUser_key" ON "ForumPostLikes"("idForumPost", "idUser");

-- CreateIndex
CREATE UNIQUE INDEX "ForumCommentLikes_idForumComment_idUser_key" ON "ForumCommentLikes"("idForumComment", "idUser");

-- AddForeignKey
ALTER TABLE "VerificationCode" ADD CONSTRAINT "VerificationCode_idUser_fkey" FOREIGN KEY ("idUser") REFERENCES "User"("idUser") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Test" ADD CONSTRAINT "Test_idUser_fkey" FOREIGN KEY ("idUser") REFERENCES "User"("idUser") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Part" ADD CONSTRAINT "Part_idTest_fkey" FOREIGN KEY ("idTest") REFERENCES "Test"("idTest") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Passage" ADD CONSTRAINT "Passage_idPart_fkey" FOREIGN KEY ("idPart") REFERENCES "Part"("idPart") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionGroup" ADD CONSTRAINT "QuestionGroup_idPart_fkey" FOREIGN KEY ("idPart") REFERENCES "Part"("idPart") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_idQuestionGroup_fkey" FOREIGN KEY ("idQuestionGroup") REFERENCES "QuestionGroup"("idQuestionGroup") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_idPart_fkey" FOREIGN KEY ("idPart") REFERENCES "Part"("idPart") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WritingTask" ADD CONSTRAINT "WritingTask_idTest_fkey" FOREIGN KEY ("idTest") REFERENCES "Test"("idTest") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeakingTask" ADD CONSTRAINT "SpeakingTask_idTest_fkey" FOREIGN KEY ("idTest") REFERENCES "Test"("idTest") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeakingQuestion" ADD CONSTRAINT "SpeakingQuestion_idSpeakingTask_fkey" FOREIGN KEY ("idSpeakingTask") REFERENCES "SpeakingTask"("idSpeakingTask") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTestResult" ADD CONSTRAINT "UserTestResult_idUser_fkey" FOREIGN KEY ("idUser") REFERENCES "User"("idUser") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTestResult" ADD CONSTRAINT "UserTestResult_idTest_fkey" FOREIGN KEY ("idTest") REFERENCES "Test"("idTest") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAnswer" ADD CONSTRAINT "UserAnswer_idUser_fkey" FOREIGN KEY ("idUser") REFERENCES "User"("idUser") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAnswer" ADD CONSTRAINT "UserAnswer_idQuestion_fkey" FOREIGN KEY ("idQuestion") REFERENCES "Question"("idQuestion") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAnswer" ADD CONSTRAINT "UserAnswer_idTestResult_fkey" FOREIGN KEY ("idTestResult") REFERENCES "UserTestResult"("idTestResult") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserWritingSubmission" ADD CONSTRAINT "UserWritingSubmission_idUser_fkey" FOREIGN KEY ("idUser") REFERENCES "User"("idUser") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserWritingSubmission" ADD CONSTRAINT "UserWritingSubmission_idWritingTask_fkey" FOREIGN KEY ("idWritingTask") REFERENCES "WritingTask"("idWritingTask") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserWritingSubmission" ADD CONSTRAINT "UserWritingSubmission_idTestResult_fkey" FOREIGN KEY ("idTestResult") REFERENCES "UserTestResult"("idTestResult") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSpeakingSubmission" ADD CONSTRAINT "UserSpeakingSubmission_idUser_fkey" FOREIGN KEY ("idUser") REFERENCES "User"("idUser") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSpeakingSubmission" ADD CONSTRAINT "UserSpeakingSubmission_idSpeakingTask_fkey" FOREIGN KEY ("idSpeakingTask") REFERENCES "SpeakingTask"("idSpeakingTask") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSpeakingSubmission" ADD CONSTRAINT "UserSpeakingSubmission_idTestResult_fkey" FOREIGN KEY ("idTestResult") REFERENCES "UserTestResult"("idTestResult") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vocabulary" ADD CONSTRAINT "Vocabulary_idTopic_fkey" FOREIGN KEY ("idTopic") REFERENCES "Topic"("idTopic") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vocabulary" ADD CONSTRAINT "Vocabulary_idUser_fkey" FOREIGN KEY ("idUser") REFERENCES "User"("idUser") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Topic" ADD CONSTRAINT "Topic_idUser_fkey" FOREIGN KEY ("idUser") REFERENCES "User"("idUser") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrammarCategory" ADD CONSTRAINT "GrammarCategory_idUser_fkey" FOREIGN KEY ("idUser") REFERENCES "User"("idUser") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrammarsOnCategories" ADD CONSTRAINT "GrammarsOnCategories_idGrammarCategory_fkey" FOREIGN KEY ("idGrammarCategory") REFERENCES "GrammarCategory"("idGrammarCategory") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrammarsOnCategories" ADD CONSTRAINT "GrammarsOnCategories_idGrammar_fkey" FOREIGN KEY ("idGrammar") REFERENCES "Grammar"("idGrammar") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumThreads" ADD CONSTRAINT "ForumThreads_idUser_fkey" FOREIGN KEY ("idUser") REFERENCES "User"("idUser") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumPost" ADD CONSTRAINT "ForumPost_idForumThreads_fkey" FOREIGN KEY ("idForumThreads") REFERENCES "ForumThreads"("idForumThreads") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumPost" ADD CONSTRAINT "ForumPost_idUser_fkey" FOREIGN KEY ("idUser") REFERENCES "User"("idUser") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumComment" ADD CONSTRAINT "ForumComment_idForumPost_fkey" FOREIGN KEY ("idForumPost") REFERENCES "ForumPost"("idForumPost") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumComment" ADD CONSTRAINT "ForumComment_idUser_fkey" FOREIGN KEY ("idUser") REFERENCES "User"("idUser") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumPostLikes" ADD CONSTRAINT "ForumPostLikes_idForumPost_fkey" FOREIGN KEY ("idForumPost") REFERENCES "ForumPost"("idForumPost") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumPostLikes" ADD CONSTRAINT "ForumPostLikes_idUser_fkey" FOREIGN KEY ("idUser") REFERENCES "User"("idUser") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumCommentLikes" ADD CONSTRAINT "ForumCommentLikes_idForumComment_fkey" FOREIGN KEY ("idForumComment") REFERENCES "ForumComment"("idForumComment") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumCommentLikes" ADD CONSTRAINT "ForumCommentLikes_idUser_fkey" FOREIGN KEY ("idUser") REFERENCES "User"("idUser") ON DELETE CASCADE ON UPDATE CASCADE;
