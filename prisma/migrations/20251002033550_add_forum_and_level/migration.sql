-- CreateEnum
CREATE TYPE "public"."Level" AS ENUM ('Low', 'Mid', 'High');

-- CreateEnum
CREATE TYPE "public"."Gender" AS ENUM ('Male', 'Female');

-- AlterTable
ALTER TABLE "public"."De" ADD COLUMN     "level" "public"."Level" NOT NULL DEFAULT 'Low';

-- AlterTable
ALTER TABLE "public"."TuVung" ADD COLUMN     "level" "public"."Level";

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "gender" "public"."Gender",
ADD COLUMN     "level" "public"."Level";

-- CreateTable
CREATE TABLE "public"."ForumCategories" (
    "idForumCategories" TEXT NOT NULL,
    "Name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ForumCategories_pkey" PRIMARY KEY ("idForumCategories")
);

-- CreateTable
CREATE TABLE "public"."ForumThreads" (
    "idForumThreads" TEXT NOT NULL,
    "idForumCategories" TEXT NOT NULL,
    "idUser" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "views_count" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ForumThreads_pkey" PRIMARY KEY ("idForumThreads")
);

-- CreateTable
CREATE TABLE "public"."ForumPost" (
    "idForumPost" TEXT NOT NULL,
    "idForumThreads" TEXT NOT NULL,
    "idUser" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ForumPost_pkey" PRIMARY KEY ("idForumPost")
);

-- CreateTable
CREATE TABLE "public"."ForumComment" (
    "idForumComment" TEXT NOT NULL,
    "idForumPost" TEXT NOT NULL,
    "idUser" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ForumComment_pkey" PRIMARY KEY ("idForumComment")
);

-- CreateTable
CREATE TABLE "public"."ForumPostLikes" (
    "idForumPostLikes" TEXT NOT NULL,
    "idForumPost" TEXT NOT NULL,
    "idUser" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ForumPostLikes_pkey" PRIMARY KEY ("idForumPostLikes")
);

-- CreateTable
CREATE TABLE "public"."ForumCommentLikes" (
    "idForumCommentLikes" TEXT NOT NULL,
    "idForumComment" TEXT NOT NULL,
    "idUser" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ForumCommentLikes_pkey" PRIMARY KEY ("idForumCommentLikes")
);

-- AddForeignKey
ALTER TABLE "public"."ForumThreads" ADD CONSTRAINT "ForumThreads_idForumCategories_fkey" FOREIGN KEY ("idForumCategories") REFERENCES "public"."ForumCategories"("idForumCategories") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ForumThreads" ADD CONSTRAINT "ForumThreads_idUser_fkey" FOREIGN KEY ("idUser") REFERENCES "public"."User"("idUser") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ForumPost" ADD CONSTRAINT "ForumPost_idForumThreads_fkey" FOREIGN KEY ("idForumThreads") REFERENCES "public"."ForumThreads"("idForumThreads") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ForumPost" ADD CONSTRAINT "ForumPost_idUser_fkey" FOREIGN KEY ("idUser") REFERENCES "public"."User"("idUser") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ForumComment" ADD CONSTRAINT "ForumComment_idUser_fkey" FOREIGN KEY ("idUser") REFERENCES "public"."User"("idUser") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ForumComment" ADD CONSTRAINT "ForumComment_idForumPost_fkey" FOREIGN KEY ("idForumPost") REFERENCES "public"."ForumPost"("idForumPost") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ForumPostLikes" ADD CONSTRAINT "ForumPostLikes_idUser_fkey" FOREIGN KEY ("idUser") REFERENCES "public"."User"("idUser") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ForumPostLikes" ADD CONSTRAINT "ForumPostLikes_idForumPost_fkey" FOREIGN KEY ("idForumPost") REFERENCES "public"."ForumPost"("idForumPost") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ForumCommentLikes" ADD CONSTRAINT "ForumCommentLikes_idUser_fkey" FOREIGN KEY ("idUser") REFERENCES "public"."User"("idUser") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ForumCommentLikes" ADD CONSTRAINT "ForumCommentLikes_idForumComment_fkey" FOREIGN KEY ("idForumComment") REFERENCES "public"."ForumComment"("idForumComment") ON DELETE RESTRICT ON UPDATE CASCADE;
