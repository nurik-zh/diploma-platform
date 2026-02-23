import { Router } from 'express';
import { register, login } from '../controllers/authController.js';

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

export default router;