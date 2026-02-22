import { Router } from 'express';
import { getTopicContent, getTopicTest, submitTopicResult } from '../controllers/topicController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/:topicId/content', authenticateToken, getTopicContent);
router.get('/:topicId/test', authenticateToken, getTopicTest);
router.post('/:topicId/result', authenticateToken, submitTopicResult);

export default router;