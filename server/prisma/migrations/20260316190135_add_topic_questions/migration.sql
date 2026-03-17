-- CreateTable
CREATE TABLE "TopicQuestion" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "options" TEXT[],
    "correctIndex" INTEGER NOT NULL,

    CONSTRAINT "TopicQuestion_pkey" PRIMARY KEY ("id")
);
