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

export const getTopicTest = async (req: any, res: Response) => {
  try {
    const { topicId } = req.params;

    const node = await prisma.roadmapNode.findUnique({
      where: { id: topicId }
    });

    if (!node) {
      return res.status(404).json({ message: "Тақырып табылмады" });
    }

    // Егер тест базада болса, қайтарамыз
    if (node.testData && (node.testData as any).questions) {
      return res.json(node.testData);
    }

    // AI-ға жіберетін тақырып аты (label немесе title)
    // Егер node.label болмаса, node.title қолданыңыз
    const topicTitle = (node as any).label || (node as any).title || "IT Topic";
    const profession = "Fullstack Developer";

    console.log(`Generating AI content for topic: ${topicTitle}`);
    
    const aiResult = await generateTopicContent(topicTitle, profession);

    // 4. Деректерді базаға сақтаймыз
    // МАҢЫЗДЫ: 'content' орнына 'theory' деп жазыңыз
    await prisma.roadmapNode.update({
      where: { id: topicId },
      data: {
        theory: aiResult.theory, // Prisma-да 'theory' деп аталады
        testData: { questions: aiResult.questions }
      }
    });

    res.json({ questions: aiResult.questions });

  } catch (error) {
    console.error("GET TOPIC TEST ERROR:", error);
    res.status(500).json({ error: "Сервер қатесі" });
  }
};

export const submitTopicResult = async (req: any, res: Response) => {
  try {
    const { topicId } = req.params;
    const { score } = req.body; // Фронтендтен келетін пайыз (0-100)
    
    // МАҢЫЗДЫ: userId-ді міндетті түрде санға (Int) айналдырамыз
    const userId = parseInt(req.user.userId, 10); 

    // Prisma-ға сұраныс жасау (topicId емес, nodeId қолданамыз)
    const progress = await prisma.userProgress.upsert({
      where: {
        userId_nodeId: { // Schema-дағы unique constraint атауы
          userId: userId,
          nodeId: topicId // Schema-дағы баған атауы
        }
      },
      update: {
        score: score,
        status: score >= 70 ? "completed" : "in_progress",
        // updatedAt автоматты түрде жаңарады
      },
      create: {
        userId: userId,
        nodeId: topicId, // Schema-дағы баған атауы
        score: score,
        status: score >= 70 ? "completed" : "in_progress"
      }
    });

    res.json({ 
      status: "success", 
      completed: score >= 70,
      progress 
    });

  } catch (error) {
    console.error("SUBMIT ERROR:", error);
    res.status(500).json({ error: "Нәтижені сақтау кезінде қате кетті" });
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