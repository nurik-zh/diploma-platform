import { Response } from 'express';
import pkg from '@prisma/client';
import { getAIResponse } from '../services/aiService.js';
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

export const getRoadmaps = async (req: any, res: Response) => {
  const roadmaps = await prisma.roadmap.findMany();
  res.json(roadmaps);
};

// export const getRoadmapTree = async (req: any, res: Response) => {
//   const nodes = await prisma.roadmapNode.findMany({ orderBy: { orderIndex: 'asc' } });
  
//   // Контракт: Record<string, RoadmapNode[]>
//   const tree: Record<string, any[]> = {};
//   nodes.forEach(node => {
//     if (!tree[node.roadmapId]) tree[node.roadmapId] = [];
//     tree[node.roadmapId].push({
//       id: node.id,
//       title: node.title,
//       status: "locked" // Фронтенд үшін, прогрессті қоссаң 'in_progress' болады
//     });
//   });
//   res.json(tree);
// };

export const getRoadmapTree = async (req: any, res: Response) => {
  try {
    const userId = req.user.userId

    const nodes = await prisma.roadmapNode.findMany({
      orderBy: { orderIndex: 'asc' }
    })

    // получить прогресс пользователя
    const progress = await prisma.userProgress.findMany({
      where: { userId }
    })

    const tree: Record<string, any[]> = {}

    for (const node of nodes) {

      let userNodeProgress = progress.find(p => p.nodeId === node.id)

      // если прогресса нет и это первая тема roadmap → открыть её
      if (!userNodeProgress) {
        const firstNode = await prisma.roadmapNode.findFirst({
          where: { roadmapId: node.roadmapId },
          orderBy: { orderIndex: "asc" }
        })

        if (firstNode?.id === node.id) {
          userNodeProgress = await prisma.userProgress.create({
            data: {
              userId,
              nodeId: node.id,
              status: "not_started"
            }
          })
        }
      }

      if (!tree[node.roadmapId]) tree[node.roadmapId] = []

      tree[node.roadmapId].push({
        id: node.id,
        title: node.title,
        status: userNodeProgress?.status ?? "locked"
      })
    }

    res.json(tree)

  } catch (error) {
    console.error(error)
    res.status(500).json({ error: "Roadmap tree error" })
  }
}


export const getRoadmapAssessment = async (req: any, res: Response) => {
  const { roadmapId } = req.params;
  // Mock assessment (бұрынғы quizData)
  res.json({
    roadmapId,
    title: "Бастапқы тест",
    questions: [
      {
        id: "q1",
        text: "HTML деген не?",
        options: [{ id: "1", label: "Тіл", score: 10 }, { id: "2", label: "Қате", score: 0 }]
      }
    ]
  });
};

export const submitAssessment = async (req: any, res: Response) => {
  const { roadmapId } = req.params;
  const { answers } = req.body; // Контракт: Record<string, number>
  const userId = req.user.userId;

  let score = Object.values(answers).reduce((a: any, b: any) => a + b, 0);
  const professionTitle = "Frontend Developer"; // roadmapId арқылы табуға болады
  const assignedLevel = score > 10 ? "Intermediate" : "Beginner";

  // 1. AI арқылы жеке бағыт құру
  const aiData = await getAIResponse(professionTitle, score);

  // 2. БД-ға Roadmap және Node-тарды сақтау
  let roadmap = await prisma.roadmap.findUnique({ where: { id: roadmapId } });
  if (!roadmap) {
    roadmap = await prisma.roadmap.create({
      data: { id: roadmapId, title: professionTitle, description: "AI Road", level: assignedLevel }
    });
  }

  await prisma.userRoadmap.create({
    data: { userId, roadmapId: roadmap.id, assignedLevel }
  });

  // AI-дан келген сабақтарды қосу
  for (let i = 0; i < aiData.roadmap.length; i++) {
    const item = aiData.roadmap[i];
    await prisma.roadmapNode.create({
      data: {
        roadmapId: roadmap.id,
        title: item.topic,
        description: item.task,
        orderIndex: i
      }
    });
  }

  // Контрактқа сай AssessmentSubmitResponse
  res.json({ roadmapId: roadmap.id, level: assignedLevel });
};

// roadmapController.ts

// Пайдаланушының таңдаған жол карталарын алу
export const getUserRoadmapCollection = async (req: any, res: Response) => {
  try {
    const userId = req.user.userId; // Токеннен алынған ID

    const collection = await prisma.userRoadmap.findMany({
      where: { userId: userId },
      select: { roadmapId: true }
    });

    // Тек ID-лер тізімін қайтару: ["frontend", "backend"]
    res.json(collection.map(c => c.roadmapId));
  } catch (error) {
    res.status(500).json({ error: "Коллекцияны алу мүмкін болмады" });
  }
};

// Прогрессті алу (әзірге бос массив немесе статус қайтару)
export const getRoadmapProgress = async (req: any, res: Response) => {
  try {
    // Болашақта бұл жерде әр тақырыптың орындалу пайызы есептеледі
    // Қазірше фронтенд қате бермес үшін бос массив қайтарамыз
    res.json([]); 
  } catch (error) {
    res.status(500).json({ error: "Прогрессті алу қатесі" });
  }
};

// roadmapController.ts
export const updateUserRoadmapCollection = async (req:any, res: any) => {
  try {
    const userId = req.user.userId
    const { roadmapIds } = req.body

    if (!Array.isArray(roadmapIds)) {
      return res.status(400).json({ error: "roadmapIds must be array" })
    }

    // удалить старые
    await prisma.userRoadmap.deleteMany({
      where: { userId }
    })

    // создать новые
    const data = roadmapIds.map((roadmapId) => ({
      userId,
      roadmapId,
       assignedLevel: "Beginner"
    }))

    await prisma.userRoadmap.createMany({
      data
    })

    res.json(roadmapIds)

  } catch (error) {
    console.error(error)
    res.status(500).json({ error: "Failed to save roadmaps" })
  }
};

export const getUserYearActivity = async (req: any, res: Response) => {
  try {
    const userId = req.user.userId;
    
    // Бұл жерде болашақта базадан юзердің іс-әрекеттерін (logs) табамыз.
    // Қазірше бос массив қайтарамыз, сонда фронтендтегі график бос болса да, қате шықпайды.
    const activity = []; 
    
    res.json(activity);
  } catch (error) {
    console.error("Activity error:", error);
    res.status(500).json({ error: "Белсенділік мәліметін алу мүмкін болмады" });
  }
};

export const completeOnboarding = async (req: any, res: Response) => {
  try {
    const userId = req.user.userId

    await prisma.user.update({
      where: { id: userId },
      data: { firstLogin: false }
    })

    res.json({ success: true })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: "Failed to complete onboarding" })
  }
};

export const completeNode = async (req: any, res: Response) => {
  try {
    const userId = req.user.userId
    const { nodeId } = req.body

    const node = await prisma.roadmapNode.findUnique({
      where: { id: nodeId }
    })

    if (!node) {
      return res.status(404).json({ error: "Node not found" })
    }

    // 1️⃣ отметить тему completed
    await prisma.userProgress.update({
      where: {
        userId_nodeId: {
          userId,
          nodeId
        }
      },
      data: {
        status: "completed"
      }
    })

    // 2️⃣ найти следующую тему
    const nextNode = await prisma.roadmapNode.findFirst({
      where: {
        roadmapId: node.roadmapId,
        orderIndex: node.orderIndex + 1
      }
    })

    // 3️⃣ открыть следующую
    if (nextNode) {
      await prisma.userProgress.upsert({
        where: {
          userId_nodeId: {
            userId,
            nodeId: nextNode.id
          }
        },
        update: {
          status: "not_started"
        },
        create: {
          userId,
          nodeId: nextNode.id,
          status: "not_started"
        }
      })
    }

    res.json({ success: true })

  } catch (error) {
    console.error(error)
    res.status(500).json({ error: "Completion error" })
  }
};
export const startNode = async (req: any, res: Response) => {
  try {
    const userId = req.user.userId
    const { nodeId } = req.body

    await prisma.userProgress.update({
      where: {
        userId_nodeId: {
          userId,
          nodeId
        }
      },
      data: {
        status: "in_progress"
      }
    })

    res.json({ success: true })

  } catch (error) {
    console.error(error)
    res.status(500).json({ error: "Start node error" })
  }
};

