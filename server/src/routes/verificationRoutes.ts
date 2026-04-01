import { Router } from 'express';
import { getSlots, getBookings, createBooking, completeBooking, cancelBooking } from '../controllers/verificationController.js';
import { authenticateToken } from '../middleware/authMiddleware.js'; // Өзіңізде бар авторизация мидлвэрі

const router = Router();

router.get('/slots', authenticateToken, getSlots);
router.get('/bookings', authenticateToken, getBookings);
router.post('/bookings', authenticateToken, createBooking);
router.put('/bookings/:id/complete', authenticateToken, completeBooking);
router.delete('/bookings/:id', authenticateToken, cancelBooking);

export default router;