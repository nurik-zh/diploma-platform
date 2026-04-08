import { Router } from 'express';
import * as vacancyController from '../controllers/vacancyController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', vacancyController.getAllVacancies);
router.get('/:id', vacancyController.getVacancyById);
router.get('/:id/tasks', authenticateToken, vacancyController.getVacancyRealTasks);
router.post('/:id/tasks/:taskId/submission',authenticateToken, vacancyController.submitTask);

// Басқа роуттардың қасына қосыңыз
router.post('/:id/generate-ai-prep',authenticateToken, vacancyController.generateAIPrep);

router.get('/:id/leaderboard', vacancyController.getVacancyTaskLeaderboard);

export default router;