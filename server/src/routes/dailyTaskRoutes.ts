// routes/dailyTaskRoutes.ts
import { Router } from 'express';
import { getTodayTasks, submitTask } from '../controllers/dailyTaskController.js';
import { authenticateToken } from '../middleware/authMiddleware.js'; 

const router = Router();

router.get('/', authenticateToken, getTodayTasks);
router.post('/:taskId/submit', authenticateToken, submitTask);

export default router;