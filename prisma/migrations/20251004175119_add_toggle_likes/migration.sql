/*
  Warnings:

  - A unique constraint covering the columns `[idForumComment,idUser]` on the table `ForumCommentLikes` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[idForumPost,idUser]` on the table `ForumPostLikes` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ForumCommentLikes_idForumComment_idUser_key" ON "public"."ForumCommentLikes"("idForumComment", "idUser");

-- CreateIndex
CREATE UNIQUE INDEX "ForumPostLikes_idForumPost_idUser_key" ON "public"."ForumPostLikes"("idForumPost", "idUser");
