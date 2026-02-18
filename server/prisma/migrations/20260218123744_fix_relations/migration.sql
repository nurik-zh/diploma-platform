/*
  Warnings:

  - You are about to drop the column `isDone` on the `UserProgress` table. All the data in the column will be lost.
  - You are about to drop the column `nodeId` on the `UserProgress` table. All the data in the column will be lost.
  - You are about to drop the column `score` on the `UserProgress` table. All the data in the column will be lost.
  - Added the required column `roadmapId` to the `UserProgress` table without a default value. This is not possible if the table is not empty.
  - Added the required column `stepIndex` to the `UserProgress` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "UserProgress" DROP CONSTRAINT "UserProgress_nodeId_fkey";

-- AlterTable
ALTER TABLE "UserProgress" DROP COLUMN "isDone",
DROP COLUMN "nodeId",
DROP COLUMN "score",
ADD COLUMN     "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "isCompleted" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "roadmapId" INTEGER NOT NULL,
ADD COLUMN     "roadmapNodeId" INTEGER,
ADD COLUMN     "stepIndex" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "UserProgress" ADD CONSTRAINT "UserProgress_roadmapNodeId_fkey" FOREIGN KEY ("roadmapNodeId") REFERENCES "RoadmapNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
