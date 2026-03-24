// controllers/dailyTaskController.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { generateDailyQuiz } from '../services/aiService.js'; // Жолыңызға қарай өзгертіңіз

const prisma = new PrismaClient();

export const getTodayTasks = async (req: any, res: Response) => {
  try {
    const userId = parseInt(req.user.userId, 10);
    const today = new Date().toISOString().split('T')[0];

    const userRoadmapRecords = await prisma.userRoadmap.findMany({
      where: { userId: userId }
    });

    const selectedRoadmapIds = userRoadmapRecords.map((record: any) => record.roadmapId);

    const activeRoadmaps = await prisma.roadmap.findMany({
      where: { id: { in: selectedRoadmapIds } },
      include: { nodes: true }
    });

    const existingTasks = await prisma.dailyTask.findMany({
      where: { userId, date: today }
    });

    // Жаңа тапсырмаларды жинауға арналған массив
    const tasksToCreate = [];

    // 1. Әр бағыт үшін тест жасау
    for (const roadmap of activeRoadmaps) {
      const alreadyHasTask = existingTasks.find(t => String(t.roadmapId) === String(roadmap.id));
      
      if (!alreadyHasTask) {
        const nodes = roadmap.nodes;
        if (nodes && nodes.length > 0) {
          const randomNode = nodes[Math.floor(Math.random() * nodes.length)];
          
          console.log(`[AI] Generating quiz for: ${roadmap.title} - ${randomNode.title}`);
          
          // ИИ-ден тест сұрақтарын аламыз
          const quizData = await generateDailyQuiz(roadmap.title, randomNode.title);

          tasksToCreate.push({
            userId,
            date: today,
            roadmapId: String(roadmap.id), 
            roadmapTitle: roadmap.title,
            nodeId: randomNode.id,
            nodeTitle: randomNode.title,
            description: `${roadmap.title} бойынша тест`,
            points: 50,
            completed: false,
            quizData: quizData // <-- ИИ-ден келген JSON осы жерге сақталады
          });
        }
      }
    }

    // 2. Жалпылама тест (Global Task)
    const hasGlobal = existingTasks.find(t => t.roadmapId === "global");
    if (!hasGlobal) {
      // Жалпылама тест үшін кездейсоқ тақырып таңдаймыз немесе жалпы сұрақтар сұраймыз
      const quizData = await generateDailyQuiz("Общие ИТ знания", "Основы разработки");

      tasksToCreate.push({
        userId,
        date: today,
        roadmapId: "global",
        roadmapTitle: "Жалпылама тест",
        nodeId: "global_all",
        nodeTitle: "Күннің басты тапсырмасы",
        description: "Жалпы білімді тексеру",
        points: 100,
        completed: false,
        quizData: quizData
      });
    }

    // 3. Базаға сақтау
    if (tasksToCreate.length > 0) {
      // createMany кейде Json типін қолдамауы мүмкін, сондықтан 
      // егер қате шықса, loop-пен жеке-жеке create жасау керек
      for (const task of tasksToCreate) {
        await prisma.dailyTask.create({
          data: task
        });
      }
      console.log(`[DEBUG] ${tasksToCreate.length} жаңа тест базаға ИИ-мен бірге қосылды.`);
    }

    const finalTasks = await prisma.dailyTask.findMany({
      where: { userId, date: today }
    });

    res.json(finalTasks);

  } catch (error) {
    console.error("DETAILED ERROR:", error);
    res.status(500).json({ error: "Тест генерациялауда қате шықты" });
  }
};

export const submitTask = async (req: Request, res: Response): Promise<any> => {
  try {
    const { taskId } = req.params;
    const { optionId } = req.body;
    const userId = (req as any).user.userId;

    const task = await prisma.dailyTask.findUnique({ where: { id: taskId } });
    
    if (!task || task.userId !== userId) {
      return res.status(404).json({ error: "Task not found" });
    }

    const updatedTask = await prisma.dailyTask.update({
      where: { id: taskId },
      data: { completed: true, completedAt: new Date() }
    });
    

    return res.json({ success: true, task: updatedTask });
  } catch (error) {
    return res.status(500).json({ error: 'Server error' });
  }
};