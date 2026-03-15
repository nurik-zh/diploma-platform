import { Router } from 'express';
import { register, login, getMe } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

/**
 * @openapi
 * /api/auth/register:
 * post:
 * summary: "Жаңа пайдаланушы тіркеу"
 * tags: ["Auth"]
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: "object"
 * required: ["email", "password"]
 * properties:
 * email:
 * type: "string"
 * password:
 * type: "string"
 * responses:
 * 201:
 * description: "Пайдаланушы сәтті тіркелді"
 * 400:
 * description: "Қате мәліметтер"
 */
router.post('/register', register);

/**
 * @openapi
 * /api/auth/login:
 * post:
 * summary: "Жүйеге кіру"
 * tags: ["Auth"]
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: "object"
 * required: ["email", "password"]
 * properties:
 * email:
 * type: "string"
 * password:
 * type: "string"
 * responses:
 * 200:
 * description: "Сәтті кіру"
 * 401:
 * description: "Аутентификация қатесі"
 */
router.post('/login', login);

router.get('/me', authenticateToken, getMe);

export default router;