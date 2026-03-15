import { Router } from 'express';
import { getLeaderboard } from '../controllers/leaderboardController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();
router.get('/', authenticateToken, getLeaderboard); // /api/leaderboard

export default router;