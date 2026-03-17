import { Response } from 'express';
import pkg from '@prisma/client';
import { generateTopicContent } from '../services/aiService.js';
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

export const getTopicContent = async (req: any, res: Response) => {
  const { topicId } = req.params;
  
  const node = await prisma.roadmapNode.findUnique({ 
    where: { id: topicId }, include: { roadmap: true } 
  });

  if (!node) return res.status(404).json({ message: "Topic not found" });

  // Егер теория бос болса, AI-ды шақырамыз
  if (!node.theory) {
    console.log(`🤖 AI "${node.title}" тақырыбына мазмұн дайындауда...`);
    const aiContent = await generateTopicContent(node.title, node.roadmap.title);
    
    await prisma.roadmapNode.update({
      where: { id: topicId },
      data: { theory: aiContent.theory, testData: aiContent.questions }
    });
    
    // Контракт: TopicContentResponse []
    return res.json([{ topicId: node.id, theory: aiContent.theory }]);
  }

  res.json([{ topicId: node.id, theory: node.theory }]);
};

// export const getTopicTest = async (req: any, res: Response) => {
//   const { topicId } = req.params;
//   const node = await prisma.roadmapNode.findUnique({ where: { id: topicId } });
  
//   if (!node || !node.testData) {
//     return res.status(404).json({ message: "Тест әлі жасалмаған. Алдымен /content шақырыңыз." });
//   }

//   // Контракт: TopicTestsResponse []
//   res.json([{ topicId: node.id, questions: node.testData }]);
// };

export const getTopicTest = async (req:any,res:any)=>{
  try{

    const topicId = req.params.topicId

    const questions = await prisma.topicQuestion.findMany({
      where:{
        topicId: topicId
      }
    })

    res.json({
      questions
    })

  }catch(error){

    console.error("TEST ERROR:",error)

    res.status(500).json({
      error:"Test load error"
    })

  }
}

export const submitTopicResult = async (req: any, res: Response) => {
  try {
    const { topicId } = req.params;
    const { score } = req.body; // Фронтендтен келетін балл (мысалы 0-ден 100-ге дейін)
    const userId = req.user.userId;

    // 1. Прогрессті жаңарту немесе жасау
    const progress = await prisma.userProgress.upsert({
      where: {
        userId_nodeId: { userId, nodeId: topicId }
      },
      update: {
        status: score >= 70 ? "completed" : "in_progress", // 70-тен асса - бітті
        score: score
      },
      create: {
        userId,
        nodeId: topicId,
        status: score >= 70 ? "completed" : "in_progress",
        score: score
      }
    });

    // 2. Егер сабақ бітсе, келесі сабақтың "құлпын" ашу (status: 'not_started')
    if (progress.status === "completed") {
      const currentNode = await prisma.roadmapNode.findUnique({ where: { id: topicId } });
      if (!currentNode) {
  return res.status(404).json({ message: "Topic not found" });
}
      const nextNode = await prisma.roadmapNode.findFirst({
        where: {
          roadmapId: currentNode?.roadmapId,
          orderIndex: (currentNode?.orderIndex || 0) + 1
        }
      });

      if (nextNode) {
        await prisma.userProgress.upsert({
          where: { userId_nodeId: { userId, nodeId: nextNode.id } },
          update: { status: "not_started" },
          create: { userId, nodeId: nextNode.id, status: "not_started" }
        });
      }
    }

    res.json({ message: "Нәтиже сақталды", status: progress.status });
  } catch (error) {
    res.status(500).json({ message: "Прогрессті сақтау қатесі" });
  }
};

export const getTopicById = async (req: any, res: Response) => {
  try {

   const { topicId } = req.params

    const topic = await prisma.roadmapNode.findUnique({
      where: { id: topicId }
    })

    if (!topic) {
      return res.status(404).json({ error: "Topic not found" })
    }

    res.json(topic)

  } catch (error) {
    console.error(error)
    res.status(500).json({ error: "Topic error" })
  }
};

