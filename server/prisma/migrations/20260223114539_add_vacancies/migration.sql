/*
  Warnings:

  - The primary key for the `RoadmapNode` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `firstName` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `lastName` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `completedAt` on the `UserProgress` table. All the data in the column will be lost.
  - You are about to drop the column `isCompleted` on the `UserProgress` table. All the data in the column will be lost.
  - You are about to drop the column `roadmapId` on the `UserProgress` table. All the data in the column will be lost.
  - You are about to drop the column `roadmapNodeId` on the `UserProgress` table. All the data in the column will be lost.
  - You are about to drop the column `stepIndex` on the `UserProgress` table. All the data in the column will be lost.
  - You are about to drop the column `content` on the `UserRoadmap` table. All the data in the column will be lost.
  - You are about to drop the column `level` on the `UserRoadmap` table. All the data in the column will be lost.
  - You are about to drop the column `profession` on the `UserRoadmap` table. All the data in the column will be lost.
  - You are about to drop the `Quiz` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[userId,nodeId]` on the table `UserProgress` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `roadmapId` to the `RoadmapNode` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nodeId` to the `UserProgress` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `UserProgress` table without a default value. This is not possible if the table is not empty.
  - Added the required column `assignedLevel` to the `UserRoadmap` table without a default value. This is not possible if the table is not empty.
  - Added the required column `roadmapId` to the `UserRoadmap` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "UserProgress" DROP CONSTRAINT "UserProgress_roadmapNodeId_fkey";

-- AlterTable
ALTER TABLE "RoadmapNode" DROP CONSTRAINT "RoadmapNode_pkey",
ADD COLUMN     "level" TEXT NOT NULL DEFAULT 'beginner',
ADD COLUMN     "roadmapId" TEXT NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "RoadmapNode_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "RoadmapNode_id_seq";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "firstName",
DROP COLUMN "lastName",
ADD COLUMN     "city" TEXT NOT NULL DEFAULT 'Almaty',
ADD COLUMN     "country" TEXT NOT NULL DEFAULT 'Kazakhstan',
ADD COLUMN     "firstLogin" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "fullName" TEXT,
ADD COLUMN     "university" TEXT NOT NULL DEFAULT 'Satbayev University';

-- AlterTable
ALTER TABLE "UserProgress" DROP COLUMN "completedAt",
DROP COLUMN "isCompleted",
DROP COLUMN "roadmapId",
DROP COLUMN "roadmapNodeId",
DROP COLUMN "stepIndex",
ADD COLUMN     "nodeId" TEXT NOT NULL,
ADD COLUMN     "score" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'locked',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "UserRoadmap" DROP COLUMN "content",
DROP COLUMN "level",
DROP COLUMN "profession",
ADD COLUMN     "assignedLevel" TEXT NOT NULL,
ADD COLUMN     "roadmapId" TEXT NOT NULL;

-- DropTable
DROP TABLE "Quiz";

-- CreateTable
CREATE TABLE "Vacancy" (
    "id" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "employment" TEXT NOT NULL,
    "salaryRange" TEXT NOT NULL,
    "tags" TEXT[],
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vacancy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "vacancyId" TEXT NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestQuestion" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "options" TEXT[],
    "correctAnswerIndex" INTEGER NOT NULL,
    "vacancyId" TEXT NOT NULL,

    CONSTRAINT "TestQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "brief" TEXT NOT NULL,
    "requirements" TEXT[],
    "deliverables" TEXT[],
    "estimatedHours" INTEGER NOT NULL,
    "vacancyId" TEXT NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Roadmap" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "recommended" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Roadmap_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserProgress_userId_nodeId_key" ON "UserProgress"("userId", "nodeId");

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_vacancyId_fkey" FOREIGN KEY ("vacancyId") REFERENCES "Vacancy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestQuestion" ADD CONSTRAINT "TestQuestion_vacancyId_fkey" FOREIGN KEY ("vacancyId") REFERENCES "Vacancy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_vacancyId_fkey" FOREIGN KEY ("vacancyId") REFERENCES "Vacancy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoadmapNode" ADD CONSTRAINT "RoadmapNode_roadmapId_fkey" FOREIGN KEY ("roadmapId") REFERENCES "Roadmap"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProgress" ADD CONSTRAINT "UserProgress_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "RoadmapNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
