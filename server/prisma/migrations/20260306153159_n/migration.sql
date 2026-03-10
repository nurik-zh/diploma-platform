-- AlterTable
ALTER TABLE "UserRoadmap" ADD COLUMN     "customData" JSONB,
ADD COLUMN     "goal" TEXT,
ADD COLUMN     "isCustom" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "title" TEXT,
ALTER COLUMN "roadmapId" DROP NOT NULL;
