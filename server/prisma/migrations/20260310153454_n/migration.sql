/*
  Warnings:

  - Added the required column `roadmapTitle` to the `FriendChallenge` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "FriendChallenge" ADD COLUMN     "quizData" JSONB,
ADD COLUMN     "roadmapTitle" TEXT NOT NULL;
