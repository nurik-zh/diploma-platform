import { Router } from 'express';
import * as vacancyController from '../controllers/vacancyController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', vacancyController.getAllVacancies);
router.get('/:id', vacancyController.getVacancyById);
router.get('/:id/tasks', vacancyController.getVacancyTasks);
router.post('/:id/tasks/:taskId/submission',authenticateToken, vacancyController.submitTask);

export default router;