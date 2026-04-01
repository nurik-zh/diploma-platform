import { Router } from 'express';
import { getPosts, createPost, toggleLike, addComment } from '../controllers/communityController.js';
// Токенді тексеретін middleware бар деп есептедім (өзіңде бар болуы керек)
import { authenticateToken } from '../middleware/authMiddleware.js'; 

const router = Router();

router.get('/', getPosts);
router.post('/', authenticateToken, createPost);
router.post('/:id/like', authenticateToken, toggleLike);
router.post('/:id/comments', authenticateToken, addComment);

export default router;