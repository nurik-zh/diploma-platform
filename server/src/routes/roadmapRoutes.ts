import { Router } from 'express';
import { getRoadmaps, getRoadmapAssessment, submitAssessment, getRoadmapTree } from '../controllers/roadmapController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', authenticateToken, getRoadmaps);
router.get('/tree', authenticateToken, getRoadmapTree);
router.get('/:roadmapId/assessment', authenticateToken, getRoadmapAssessment);
router.post('/:roadmapId/assessment/submit', authenticateToken, submitAssessment);

export default router;

// import { Router } from 'express';
// import { generateUserRoadmap, getRoadmaps, getRoadmapAssessment, submitAssessment, getRoadmapTree } from '../controllers/roadmapController.js';
// import { authenticateToken } from '../middleware/authMiddleware.js';
// import pkg from '@prisma/client';
// const { PrismaClient } = pkg;
// const prisma = new PrismaClient();

// const router = Router();

// router.post('/generate', authenticateToken, generateUserRoadmap);

// // Тек жүйеге кірген (токені бар) адамдар Roadmap жасай алады
// router.get('/my-path', authenticateToken, async (req: any, res) => {
//   try {
//     const userId = req.user.userId;

//     const roadmap = await prisma.userRoadmap.findFirst({
//       where: { userId },
//       orderBy: { createdAt: 'desc' }
//     });

//     if (!roadmap) return res.status(404).json({ message: "Roadmap табылмады" });

//     const progress = await prisma.userProgress.findMany({
//       where: { userId },
//       select: { 
//         // nodeId жоқ болғандықтан, қатеде көрсетілген қолжетімді өрісті аламыз
//         roadmapNodeId: true, 
//         isCompleted: true 
//       }
//     });

//     res.json({
//       id: roadmap.id,
//       profession: roadmap.profession,
//       level: roadmap.level,
//       content: roadmap.content,
//       createdAt: roadmap.createdAt,
//       // Мұнда да өріс атын өзгертеміз
//       completedNodeIds: progress.map(p => p.roadmapNodeId)
//     });
//   } catch (error: any) {
//     console.error("DEBUG ERROR:", error);
//     res.status(500).json({ error: "Деректерді алу қатесі", details: error.message });
//   }
// });

// router.post('/complete-node', authenticateToken, async (req: any, res) => {
//   const { nodeId } = req.body;
//   const userId = req.user.userId;

//   try {
//     const progress = await prisma.userProgress.findMany({
//       where: { userId },
//       select: { 
//         nodeId: true, // Схемада "nodeId" деп тұрғандықтан, осылай қалдыр
//         isDone: true  // Схемада "isDone" деп тұр (isCompleted емес)
//       }
//     });

//     // JSON жауапта:
//     completedNodeIds: progress.map(p => p.nodeId)
//   } catch (error) {
//     res.status(500).json({ error: "Прогрессті сақтау мүмкін болмады" });
//   }
// });

// export default router;