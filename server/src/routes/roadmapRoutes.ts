import { Router } from 'express';
import { generateUserRoadmap } from '../controllers/roadmapController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import pkg from '@prisma/client';
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

const router = Router();

router.post('/generate', authenticateToken, generateUserRoadmap);

// Тек жүйеге кірген (токені бар) адамдар Roadmap жасай алады
router.get('/my-path', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.userId;

    const roadmap = await prisma.userRoadmap.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    if (!roadmap) return res.status(404).json({ message: "Roadmap табылмады" });

    const progress = await prisma.userProgress.findMany({
      where: { userId },
      select: { 
        // nodeId жоқ болғандықтан, қатеде көрсетілген қолжетімді өрісті аламыз
        roadmapNodeId: true, 
        isCompleted: true 
      }
    });

    res.json({
      id: roadmap.id,
      profession: roadmap.profession,
      level: roadmap.level,
      content: roadmap.content,
      createdAt: roadmap.createdAt,
      // Мұнда да өріс атын өзгертеміз
      completedNodeIds: progress.map(p => p.roadmapNodeId)
    });
  } catch (error: any) {
    console.error("DEBUG ERROR:", error);
    res.status(500).json({ error: "Деректерді алу қатесі", details: error.message });
  }
});

router.post('/complete-node', authenticateToken, async (req: any, res) => {
  const { nodeId } = req.body;
  const userId = req.user.userId;

  try {
    const progress = await prisma.userProgress.upsert({
      where: {
        userId_nodeId: { userId, nodeId }
      },
      update: { isDone: true },
      create: { userId, nodeId, isDone: true }
    });
    res.json(progress);
  } catch (error) {
    res.status(500).json({ error: "Прогрессті сақтау мүмкін болмады" });
  }
});

export default router;