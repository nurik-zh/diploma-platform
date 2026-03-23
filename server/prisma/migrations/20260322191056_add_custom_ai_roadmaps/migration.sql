-- CreateTable
CREATE TABLE "custom_ai_roadmaps" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custom_ai_roadmaps_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "custom_ai_roadmaps" ADD CONSTRAINT "custom_ai_roadmaps_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
