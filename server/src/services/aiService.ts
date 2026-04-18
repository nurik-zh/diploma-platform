import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export const getAIResponse = async (profession: string, score: number) => {
  try {
    // 10 баллдық жүйе бойынша деңгейді анықтау
    const currentLevel = score >= 8 ? 'Middle' : score >= 4 ? 'Beginner+' : 'Newbie';
    const targetLevel = "Junior+ Developer";

    const prompt = `
      Сен IT-менторсың. Пайдаланушының мақсаты: ${profession} болу (Б нүктесі).
      Оның қазіргі деңгейі: ${currentLevel} (А нүктесі), Тест нәтижесі: ${score}/10 балл.
      
      Оған А нүктесінен Б нүктесіне жету үшін 4 апталық нақты "Learning Path" құрастыр.
      Жоспар біртіндеп күрделенуі керек.
      
      Жауапты ТЕК JSON форматында қайтар:
      {
        "path_summary": "А-дан Б-ға дейінгі қысқаша сипаттама",
        "roadmap": [
          { 
            "week": 1, 
            "topic": "Тақырып аты", 
            "task": "Орындалатын тапсырма", 
            "milestone": "Осы аптада жететін нәтижесі"
          }
        ]
      }
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/); // Тек JSON форматын жұлып алады
    if (!jsonMatch) {
      throw new Error("AI жауабынан дұрыс дерек табылмады");
    }
    const cleanJson = jsonMatch[0];
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("AI Error:", error);
    return { roadmap: [] }; // Mock деректерді осында қоссаң болады
  }
};

export const generateTopicContent = async (title: string, profession: string) => {
  try {
    const prompt = `
      Сен ${profession} маманына арналған менторсың. 
      "${title}" тақырыбы бойынша:
      1. Сапалы әрі қысқаша теориялық материал жаз (Markdown форматында).
      2. Тақырыпты бекітуге арналған 3 сұрақтан тұратын тест жаса.
      
      МАҢЫЗДЫ ТАЛАПТАР:
      - Жауапты ТЕК қана таза JSON форматында қайтар.
      - "theory" мәтінінің ішінде ЕШҚАШАН қос тырнақша (") қолданба! Оның орнына жалаң тырнақша (') қолдан.
      
      {
        "theory": "Мәтін...",
        "questions": [
          { "question": "сұрақ?", "options": ["а", "б", "в", "г"], "correctIndex": 0 }
        ]
      }
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    // Markdown-нан тазарту
    const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("AI жауабынан дұрыс дерек табылмады");
    }
    const cleanJson = jsonMatch[0];
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("AI Topic Generation failed:", error);
    // Сервер құламас үшін бос массив қайтарамыз
    return { theory: "Мазмұн уақытша қолжетімсіз.", questions: [] };
  }
};

export const generateChallengeQuiz = async (roadmapTitle: string) => {
  try {
    // aiService.ts ішіндегі prompt-ты жаңартыңыз
    const prompt = `
      Ты — эксперт в области IT и ментор. Составь тест из 5 сложных и актуальных вопросов по теме "${roadmapTitle}".
      Вопросы должны быть на русском языке. У каждого вопроса должно быть 4 варианта ответа.
      
      Верни ответ ТОЛЬКО в формате JSON:
      {
        "questions": [
          { 
            "id": 1,
            "question": "Текст вопроса?", 
            "options": ["вариант 1", "вариант 2", "вариант 3", "вариант 4"], 
            "correctOption": 0 
          }
        ]
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/); // Тек JSON форматын жұлып алады
    if (!jsonMatch) {
      throw new Error("AI жауабынан дұрыс дерек табылмады");
    }
    const cleanJson = jsonMatch[0];
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("Gemini Error:", error);
    // Егер AI қате берсе, Postman-да көру үшін null қайтармай, бос тізім қайтарайық
    return { questions: [] };
  }
};

export const generateCustomRoadmap = async (promptData: { title: string, goal: string, interests: string }) => {
  try {
    const prompt = `
      Сен IT-менторсың. Пайдаланушының мақсаты: ${promptData.goal}.
      Оның қызығушылықтары: ${promptData.interests}.
      Оған арнап "${promptData.title}" деген тақырыпта нақты оқу жоспарын (Learning Path) құрастыр.
      
      Жауапты ТЕК JSON форматында қайтар. Форматы дәл мынадай болуы тиіс:
      {
        "title": "${promptData.title}",
        "goal": "${promptData.goal}",
        "milestones": [
          "1-апта: Негіздерді меңгеру...",
          "2-апта: Практикалық тапсырмалар...",
          "3-апта: Күрделі концепциялар...",
          "4-апта: Қорытынды жоба..."
        ]
      }
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/); // Тек JSON форматын жұлып алады
    if (!jsonMatch) {
      throw new Error("AI жауабынан дұрыс дерек табылмады");
    }
    const cleanJson = jsonMatch[0];
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("AI Error:", error);
    throw new Error("AI генерациясы сәтсіз аяқталды");
  }
};

export const generateDailyQuiz = async (roadmapTitle: string, nodeTitle: string) => {
  try {
    const prompt = `
      Сен IT-менторсың. "${roadmapTitle}" бағытындағы "${nodeTitle}" тақырыбы бойынша 
      күнделікті қайталауға арналған 3 сұрақтан тұратын мини-тест құрастыр. 
      Сұрақтар орыс тілінде болуы тиіс.
      
      Жауапты ТЕК қана JSON форматында қайтар:
      {
        "questions": [
          {
            "id": "q1",
            "question": "Текст вопроса?",
            "options": [
              { "id": "opt1", "label": "Вариант 1" },
              { "id": "opt2", "label": "Вариант 2" }
            ],
            "correctOptionId": "opt1"
          }
        ]
      }
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    // ЕҢ ҚАУІПСІЗ JSON ЖҰЛЫП АЛУ ӘДІСІ:
    const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("JSON табылмады");
    
    return JSON.parse(jsonMatch[0]);
  } catch (error: any) {
    console.error("Daily Quiz AI Error:", error.message);
    return null;
  }
};

export type GeneratedAssessment = {
  quizQuestions: {
    id: string;
    question: string;
    options: string[];
    correctIndex: number;
  }[];
  writtenQuestions: {
    id: string;
    text: string;
    placeholder?: string;
    hint?: string;
    keywords?: string[];
  }[];
};

export const generateAssessmentQuestions = async (
  roadmapTitle: string
): Promise<GeneratedAssessment> => {
  try {
    const prompt = `
      Ты IT-ментор. Сгенерируй тест для оценки уровня навыков по направлению "${roadmapTitle}".

      Нужно 6 вопросов с вариантами ответа (ровно 4 варианта у каждого), сложность от базовой к продвинутой.
      И 2 практических вопроса с развёрнутым свободным ответом (кейс / объяснение концепции).
      Вопросы на русском языке.

      Верни ответ ТОЛЬКО в формате JSON:
      {
        "quizQuestions": [
          {
            "id": "q1",
            "question": "Текст вопроса?",
            "options": ["вариант A", "вариант B", "вариант C", "вариант D"],
            "correctIndex": 0
          }
        ],
        "writtenQuestions": [
          {
            "id": "wq1",
            "text": "Текст практического вопроса",
            "placeholder": "Краткий ответ...",
            "hint": "Подсказка",
            "keywords": ["слово1"]
          }
        ]
      }

      correctIndex — индекс правильного варианта 0..3.
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("JSON табылмады");

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("AI Error:", error);

    return {
      quizQuestions: [
        {
          id: "q1",
          question: `Что такое ${roadmapTitle}?`,
          options: ["A", "B", "C", "D"],
          correctIndex: 0
        }
      ],
      writtenQuestions: [
        {
          id: "wq1",
          text: "Опишите ваш опыт или понимание темы.",
          placeholder: "Напишите развернутый ответ...",
          hint: "Минимум 40 символов",
          keywords: []
        }
      ]
    };
  }
};

export const evaluateAssessmentAnswers = async (roadmapTitle: string, writtenAnswers: any[]) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const answersText = writtenAnswers.map((item, index) => 
      `Сұрақ ${index + 1}: ${item.question}\nПайдаланушы жауабы: ${item.answer}`
    ).join('\n\n');

    const prompt = `
      Сіз - "Senior Tech Lead" және IT сұхбат алушысыз. Пайдаланушының "${roadmapTitle}" бағыты бойынша берген жауаптарын бағалаңыз.

      Жауаптар:
      ${answersText}

      БАҒАЛАУ КРИТЕРИЙЛЕРІ:
      - Junior (0 - 40 балл): Тек базалық түсінік бар.
      - Middle (41 - 80 балл): Жақсы практикалық білімі бар, мысалдар келтіре алады.
      - Senior (81 - 100 балл): Архитектуралық деңгейде түсінеді.

      ТАЛАПТАР:
      1. Feedback (пікір) қазақ тілінде, 2-3 сөйлем болуы керек.
      2. МАҢЫЗДЫ: Feedback мәтінінің ішінде ешқашан қос тырнақша (") қолданбаңыз! Оның орнына жалаң тырнақша (') қолданыңыз.

      ШЫҒАРУ ФОРМАТЫ (Тек қана таза JSON қайтарыңыз):
      {
        "aiScore": 85,
        "levelLabel": "Senior",
        "feedback": "Сіздің жауаптарыңыз өте жақсы, бірақ 'best practices' жайлы оқу керек."
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Қауіпсіз JSON жұлып алу (алдыңғы функциялардағыдай)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("AI жауабынан JSON табылмады");
    }

    // JSON-ды парсинг жасау
    const evaluation = JSON.parse(jsonMatch[0]);

    return {
      aiScore: evaluation.aiScore || 0,
      levelLabel: evaluation.levelLabel || "Junior",
      feedback: evaluation.feedback || "Жауаптарыңыз қабылданды."
    };

  } catch (error) {
    console.error("AI бағалау кезіндегі қате (JSON Parsing немесе API):", error);
    // Қате болған жағдайда бағдарлама құлап қалмас үшін резервтік жауап
    return {
      aiScore: 0,
      levelLabel: "Junior",
      feedback: "Жауаптарыңыз сәтті сақталды (ИИ уақытша қолжетімсіз)."
    };
  }
};

// aiService.ts-ке қосу
export const generateVacancyPrepData = async (title: string, company: string) => {
  try {
    const prompt = `
      Сен IT-рекрутерсің.
      "${company}" компаниясындағы "${title}" үшін:
      1. 5 сұрақ + жауап
      2. 5 тест сұрақ
      
      JSON қайтар:
      {
        "questions": [],
        "test": []
      }
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("JSON error");

    return JSON.parse(jsonMatch[0]);

  } catch (error) {
    console.error("Vacancy Error:", error);
    return null;
  }
};

export const generateTopicsByLevel = async (roadmapTitle: string, levelLabel: string) => {
  try {
    const prompt = `
      Сен IT-менторсың. Пайдаланушының "${roadmapTitle}" бағыты бойынша қазіргі деңгейі: ${levelLabel}.
      Осы деңгейге сай келетін, білімін одан әрі дамытуға арналған 5 негізгі тақырыптан (nodes) тұратын оқу жоспарын құрастыр.
      Тақырыптар тым оңай болмауы тиіс, дәл осы ${levelLabel} деңгейінен бастап біртіндеп күрделенуі керек.
      
      Жауапты ТЕК қана JSON форматында қайтар:
      {
        "nodes": [
          {
            "title": "Тақырып атауы",
            "description": "Осы тақырыпта не үйренетіні туралы қысқаша сипаттама"
          }
        ]
      }
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/); 
    
    if (!jsonMatch) {
      throw new Error("AI жауабынан JSON табылмады");
    }
    
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("Topics generation AI Error:", error);
    // Қате болса, резервтік дерек қайтарамыз
    return {
      nodes: [
        { title: `${roadmapTitle}: Негізгі концепциялар`, description: "Базалық қайталау және кіріспе" },
        { title: `Күрделі тәжірибелер`, description: `${levelLabel} деңгейіне арналған тапсырмалар` }
      ]
    };
  }
};