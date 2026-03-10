/*
  Warnings:

  - A unique constraint covering the columns `[userId,taskId]` on the table `Submission` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Submission_userId_taskId_key" ON "Submission"("userId", "taskId");
