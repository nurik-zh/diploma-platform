// routes/friendRoutes.ts
import { Router } from 'express';
import * as friendController from '../controllers/friendController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticateToken); // Барлық достар маршруты авторизация сұрайды

router.get('/', friendController.getFriends);
router.get('/suggestions', friendController.getFriendSuggestions);
router.post('/add', friendController.addFriendByEmail);
router.delete('/:friendId', friendController.removeFriend);
router.get('/map', friendController.getGlobalItMap);
router.get('/challenges', friendController.getChallenges);
router.post('/challenges', friendController.createChallenge);
router.get('/challenges/notifications', friendController.getNotifications);
router.patch('/challenges/:id/read', friendController.markNotificationRead);
router.get('/search', friendController.searchUsers);

router.post('/challenges/complete', friendController.completeChallenge);

export default router;