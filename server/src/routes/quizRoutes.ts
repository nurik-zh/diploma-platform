// src/routes/quizRoutes.ts
import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { generateUserRoadmap } from '../controllers/roadmapController.js'; // Импорттау

const router = Router();

const quizData = {
  "frontend": [
    { 
      id: 1, 
      question: "HTML-де гиперсілтеме жасау үшін қай тег қолданылады?", 
      options: ["<link>", "<a>", "<href>", "<nav>"], 
      correct: 1 
    },
    { 
      id: 2, 
      question: "CSS-те элементтің ішкі арақашықтығын (отступ) қай қасиет реттейді?", 
      options: ["margin", "border", "padding", "spacing"], 
      correct: 2 
    },
    { 
      id: 3, 
      question: "JavaScript-те айнымалыны өзгермейтін (constant) етіп жариялау үшін не қолданылады?", 
      options: ["let", "var", "const", "set"], 
      correct: 2 
    },
    { 
      id: 4, 
      question: "React-та компонент қайта рендеринг жасалуы үшін не өзгеруі керек?", 
      options: ["Тек props", "Тек state", "State немесе Props", "HTML құрылымы"], 
      correct: 2 
    },
    { 
      id: 5, 
      question: "API-ден деректер алу үшін JavaScript-те ең көп қолданылатын әдіс?", 
      options: ["JSON.parse()", "fetch()", "get.data()", "push()"], 
      correct: 1 
    }
  ],
  "backend": [
    { 
      id: 1, 
      question: "Node.js деген не?", 
      options: ["JavaScript фреймворкі", "JavaScript браузерден тыс жұмыс істейтін ортасы (Runtime)", "Мәліметтер базасы", "Бағдарламалау тілі"], 
      correct: 1 
    },
    { 
      id: 2, 
      question: "SQL базасынан деректерді таңдап алу үшін қай команда қолданылады?", 
      options: ["GET", "SELECT", "PICK", "EXTRACT"], 
      correct: 1 
    },
    { 
      id: 3, 
      question: "REST API-де ресурс сәтті жасалғанда қай HTTP статус коды қайтарылады?", 
      options: ["200 OK", "201 Created", "404 Not Found", "500 Error"], 
      correct: 1 
    },
    { 
      id: 4, 
      question: "Middleware-дің (аралық бағдарлама) негізгі міндеті не?", 
      options: ["Дизайнды реттеу", "Сұраныс пен жауап арасында кодты орындау", "Базаны өшіру", "Фронтендті қосу"], 
      correct: 1 
    },
    { 
      id: 5, 
      question: "JWT (JSON Web Token) көбіне не үшін қолданылады?", 
      options: ["Деректерді форматтау", "Авторизация және қауіпсіздік", "Анимация жасау", "Базаны синхрондау"], 
      correct: 1 
    }
  ],
  "ui-ux": [
    { 
      id: 1, 
      question: "Figma-да компоненттің басты мақсаты не?", 
      options: ["Түсті өзгерту", "Элементтерді қайта қолдану және орталықтан басқару", "Экспорттау", "Қабаттарды жасыру"], 
      correct: 1 
    },
    { 
      id: 2, 
      question: "UX дизайнындағы 'User Flow' деген не?", 
      options: ["Пайдаланушының қолданба ішіндегі жүру жолы", "Түстер палитрасы", "Қолданбаның логотипі", "Экранның жарықтығы"], 
      correct: 0 
    },
    { 
      id: 3, 
      question: "Дизайндағы 'Иерархия' принципі нені білдіреді?", 
      options: ["Барлық элементтің бірдей болуы", "Маңызды элементтерді көзге түсетіндей етіп реттеу", "Тек қара-ақ түсті қолдану", "Суреттерді жою"], 
      correct: 1 
    },
    { 
      id: 4, 
      question: "Адаптивті дизайн (Responsive design) деген не?", 
      options: ["Тек компьютерге арналған дизайн", "Дизайнның кез келген экран өлшеміне бейімделуі", "Қолданбаның жылдамдығы", "Тек қараңғы режим"], 
      correct: 1 
    },
    { 
      id: 5, 
      question: "Пайдаланушы зерттеуінде (User Research) 'Интервью' не үшін жасалады?", 
      options: ["Дизайнды бояу үшін", "Пайдаланушының қажеттіліктері мен мәселелерін түсіну үшін", "Код жазу үшін", "Серверді тексеру үшін"], 
      correct: 1 
    }
  ]
};

// 1. Сұрақтарды алу
router.get('/:profession', authenticateToken, (req, res) => {
  const { profession } = req.params;
  const questions = quizData[profession as keyof typeof quizData];
  if (!questions) return res.status(404).json({ error: "Мамандық табылмады" });
  
  // Қауіпсіздік үшін "correct" жауабын фронтендке жібермейміз
  const safeQuestions = questions.map(({ correct, ...rest }) => rest);
  res.json(safeQuestions);
});

// 2. Жауаптарды тапсыру және Roadmap-қа бағыттау
router.post('/submit', authenticateToken, async (req: any, res) => {
  const { profession, answers } = req.body; // answers: { "1": 1, "2": 0 } сияқты объект
  const questions = quizData[profession as keyof typeof quizData];

  if (!questions) return res.status(400).json({ error: "Қате мамандық" });

  let score = 0;
  questions.forEach(q => {
    if (answers[q.id] === q.correct) {
      score += 1;
    }
  });

  // Орташа баллды 10-дық жүйеге келтіру (мысалы)
  const finalScore = (score / questions.length) * 10;

  // Енді осы баллды қолданып, Roadmap жасау функциясын бірден шақырамыз
  // Біз generateUserRoadmap-қа Request/Response нысандарын қолдан жасап жібереміз
  req.body.score = finalScore;
  req.body.profession = profession;
  
  return generateUserRoadmap(req, res);
});

export default router;