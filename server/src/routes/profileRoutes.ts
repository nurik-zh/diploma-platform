import { Router } from 'express';
import { getProfile } from '../controllers/profileController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();
/**
 * @openapi
 * /api/profile:
 * get:
 * summary: Пайдаланушы профилін алу
 * tags: [Profile]
 * security:
 * - bearerAuth: []
 * responses:
 * 200:
 * description: Профиль мәліметтері сәтті алынды
 * 401:
 * description: Токен табылмады немесе қате
 */
router.get('/', authenticateToken, getProfile);

export default router;