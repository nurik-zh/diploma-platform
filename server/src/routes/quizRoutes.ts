import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

const quizData = {
  "frontend": [
    { id: 1, question: "HTML деген не?", options: ["Тіл", "Маркап", "Стиль"], correct: 1 },
    { id: 2, question: "React-та мемлекетті қалай сақтаймыз?", options: ["useState", "useEffect", "useContext"], correct: 0 }
  ],
  "backend": [
    { id: 1, question: "Node.js не нәрсе?", options: ["Runtime", "Framework", "Library"], correct: 0 },
    { id: 2, question: "SQL деген не?", options: ["Тіл", "База", "Сервер"], correct: 0 }
  ],
  "ui-ux": [
    { id: 1, question: "Figma-да компонент не үшін керек?", options: ["Қайта қолдану", "Түс таңдау", "Экспорт"], correct: 0 }
  ]
};

router.get('/:profession', authenticateToken, (req, res) => {
  const { profession } = req.params;
  const questions = quizData[profession as keyof typeof quizData];
  
  if (!questions) return res.status(404).json({ error: "Мамандық табылмады" });
  res.json(questions);
});

export default router;