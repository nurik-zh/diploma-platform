import { Router } from 'express';
import { getProfile } from '../controllers/profileController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();
router.get('/', authenticateToken, getProfile);

export default router;