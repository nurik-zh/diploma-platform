/*
  Warnings:

  - You are about to drop the column `customData` on the `UserRoadmap` table. All the data in the column will be lost.
  - You are about to drop the column `goal` on the `UserRoadmap` table. All the data in the column will be lost.
  - You are about to drop the column `isCustom` on the `UserRoadmap` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `UserRoadmap` table. All the data in the column will be lost.
  - Made the column `roadmapId` on table `UserRoadmap` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "UserRoadmap" DROP COLUMN "customData",
DROP COLUMN "goal",
DROP COLUMN "isCustom",
DROP COLUMN "title",
ALTER COLUMN "roadmapId" SET NOT NULL;
