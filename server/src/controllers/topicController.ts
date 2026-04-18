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

  // ӨЗГЕРІС: Егер теория бос болса НЕМЕСЕ бұрынғы қате сақталып қалған болса, AI-ды қайта шақырамыз
  if (!node.theory || node.theory === "Мазмұн уақытша қолжетімсіз.") {
    console.log(`🤖 AI "${node.title}" тақырыбына мазмұн дайындауда...`);
    const aiContent = await generateTopicContent(node.title, node.roadmap.title);
    
    // ӨЗГЕРІС: AI дұрыс жауап берсе ғана базаны жаңартамыз
    if (aiContent.theory !== "Мазмұн уақытша қолжетімсіз.") {
        await prisma.roadmapNode.update({
          where: { id: topicId },
          data: { theory: aiContent.theory, testData: aiContent.questions }
        });
    }
    
    return res.json([{ topicId: node.id, theory: aiContent.theory }]);
  }

  res.json([{ topicId: node.id, theory: node.theory }]);
};

// topicController.ts
export const getTopicTest = async (req: any, res: Response) => {
  try {
    const { topicId } = req.params;
    const node = await prisma.roadmapNode.findUnique({ where: { id: topicId } });

    if (!node) return res.status(404).json({ message: "Тақырып табылмады" });

    const testData = node.testData as any;

    // Егер тест базада болса, ИИ-ді мазаламаймыз
    if (testData?.questions?.length > 0) {
      return res.json(testData);
    }

    // Егер тест жоқ болса, генерация жасаймыз
    const profession = "Fullstack Developer";
    console.log(`[AI] Generating content ONLY for: ${node.title}`);
    
    const aiResult = await generateTopicContent(node.title, profession);

    if (!aiResult.questions || aiResult.questions.length === 0) {
      return res.status(503).json({ error: "ИИ қазір бос емес, сәлден соң қайталаңыз" });
    }

    // Теория мен тестті бірден сақтаймыз
    await prisma.roadmapNode.update({
      where: { id: topicId },
      data: {
        theory: aiResult.theory,
        testData: { questions: aiResult.questions }
      }
    });

    res.json({ questions: aiResult.questions });
  } catch (error) {
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

    // getRoadmapTree: нода без userProgress → "locked". После теста ≥70% открываем следующую
    // (логика как в roadmapController.completeNode).
    if (score >= 70) {
      const node = await prisma.roadmapNode.findUnique({
        where: { id: topicId },
      });
      if (node) {
        const nextNode = await prisma.roadmapNode.findFirst({
          where: {
            roadmapId: node.roadmapId,
            orderIndex: node.orderIndex + 1,
          },
        });
        if (nextNode) {
          await prisma.userProgress.upsert({
            where: {
              userId_nodeId: {
                userId,
                nodeId: nextNode.id,
              },
            },
            update: { status: "not_started" },
            create: {
              userId,
              nodeId: nextNode.id,
              status: "not_started",
            },
          });
        }
      }
    }

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