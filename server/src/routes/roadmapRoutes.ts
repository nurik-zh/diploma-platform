// server/src/routes/roadmapRoutes.ts
import { Router } from "express"
import {
  getRoadmaps,
  getRoadmapAssessment,
  submitAssessment,
  getRoadmapTree,
  getUserRoadmapCollection,
  getRoadmapProgress,
  getUserYearActivity,
  updateUserRoadmapCollection,
  completeOnboarding,
  completeNode,
  startNode
} from "../controllers/roadmapController.js"
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();
// router.post(
//   "/collection",
//   authenticateToken,
//   updateUserRoadmapCollection
// )

// Реті маңызды: нақты жолдарды (collection, progress) параметрлерден (:roadmapId) жоғары қой
router.get('/collection', authenticateToken, getUserRoadmapCollection);
router.post("/collection", authenticateToken, updateUserRoadmapCollection)
router.post("/onboarding/complete", authenticateToken, completeOnboarding)
router.post("/start-node", authenticateToken, startNode)

router.post("/complete-node", authenticateToken, completeNode)

router.get('/progress', authenticateToken, getRoadmapProgress);

router.get('/', authenticateToken, getRoadmaps);
router.get('/tree', authenticateToken, getRoadmapTree);
router.get('/:roadmapId/assessment', authenticateToken, getRoadmapAssessment);
router.post('/:roadmapId/assessment/submit', authenticateToken, submitAssessment);
router.get('/activity', authenticateToken, getUserYearActivity);

export default router;