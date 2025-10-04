-- DropForeignKey
ALTER TABLE "public"."ForumComment" DROP CONSTRAINT "ForumComment_idForumPost_fkey";

-- DropForeignKey
ALTER TABLE "public"."ForumCommentLikes" DROP CONSTRAINT "ForumCommentLikes_idForumComment_fkey";

-- DropForeignKey
ALTER TABLE "public"."ForumPost" DROP CONSTRAINT "ForumPost_idForumThreads_fkey";

-- DropForeignKey
ALTER TABLE "public"."ForumPostLikes" DROP CONSTRAINT "ForumPostLikes_idForumPost_fkey";

-- DropForeignKey
ALTER TABLE "public"."ForumThreads" DROP CONSTRAINT "ForumThreads_idForumCategories_fkey";

-- AddForeignKey
ALTER TABLE "public"."ForumThreads" ADD CONSTRAINT "ForumThreads_idForumCategories_fkey" FOREIGN KEY ("idForumCategories") REFERENCES "public"."ForumCategories"("idForumCategories") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ForumPost" ADD CONSTRAINT "ForumPost_idForumThreads_fkey" FOREIGN KEY ("idForumThreads") REFERENCES "public"."ForumThreads"("idForumThreads") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ForumComment" ADD CONSTRAINT "ForumComment_idForumPost_fkey" FOREIGN KEY ("idForumPost") REFERENCES "public"."ForumPost"("idForumPost") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ForumPostLikes" ADD CONSTRAINT "ForumPostLikes_idForumPost_fkey" FOREIGN KEY ("idForumPost") REFERENCES "public"."ForumPost"("idForumPost") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ForumCommentLikes" ADD CONSTRAINT "ForumCommentLikes_idForumComment_fkey" FOREIGN KEY ("idForumComment") REFERENCES "public"."ForumComment"("idForumComment") ON DELETE CASCADE ON UPDATE CASCADE;
