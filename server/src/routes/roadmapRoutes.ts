import { Router } from 'express';
import { getRoadmaps, getRoadmapAssessment, submitAssessment, getRoadmapTree } from '../controllers/roadmapController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', authenticateToken, getRoadmaps);
router.get('/tree', authenticateToken, getRoadmapTree);
router.get('/:roadmapId/assessment', authenticateToken, getRoadmapAssessment);
router.post('/:roadmapId/assessment/submit', authenticateToken, submitAssessment);

export default router;