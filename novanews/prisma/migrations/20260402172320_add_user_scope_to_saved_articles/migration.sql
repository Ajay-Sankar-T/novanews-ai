/*
  Warnings:

  - A unique constraint covering the columns `[userId,url]` on the table `SavedArticle` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `SavedArticle` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "SavedArticle_url_key";

-- AlterTable
ALTER TABLE "SavedArticle" ADD COLUMN     "userId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "SavedArticle_userId_idx" ON "SavedArticle"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedArticle_userId_url_key" ON "SavedArticle"("userId", "url");
