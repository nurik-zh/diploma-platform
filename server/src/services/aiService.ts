
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
      
      Жауапты ТЕК қана таза JSON форматында қайтар, ешқандай түсініктеме мәтін қоспа.
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
    const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/); // Тек JSON форматын жұлып алады
    if (!jsonMatch) {
      throw new Error("AI жауабынан дұрыс дерек табылмады");
    }
    const cleanJson = jsonMatch[0];
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("AI Generation failed:", error);
    // Қате болған жағдайда бос құрылым қайтару (интерфейс құламауы үшін)
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
      
      Жауапты ТЕК қана JSON форматында қайтар, ешқандай Markdown (बैक틱) немесе түсініктеме қоспа:
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
    const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("Daily Quiz AI Error:", error);
    return null;
  }
};

export const generateAssessmentQuestions = async (roadmapTitle: string) => {
  try {
    const prompt = `
      Ты IT-ментор. Сгенерируй тест для оценки уровня навыков по направлению "${roadmapTitle}".
      Мне нужно 5 теоретических вопросов (без вариантов ответов, просто текст вопроса) и 2 практических вопроса (где нужен развернутый текстовый ответ).
      
      Верни ответ ТОЛЬКО в формате JSON:
      {
        "theoryQuestions": [
          "Текст теоретического вопроса 1?",
          "Текст теоретического вопроса 2?",
          "Текст теоретического вопроса 3?",
          "Текст теоретического вопроса 4?",
          "Текст теоретического вопроса 5?"
        ],
        "writtenQuestions": [
          {
            "id": "wq1",
            "text": "Текст практического вопроса/кейса 1",
            "placeholder": "Подсказка для поля ввода...",
            "hint": "Краткая подсказка"
          },
          {
            "id": "wq2",
            "text": "Текст практического вопроса/кейса 2",
            "placeholder": "Подсказка для поля ввода...",
            "hint": "Краткая подсказка"
          }
        ]
      }
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/); 
    if (!jsonMatch) throw new Error("JSON табылмады");
    
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("AI Error:", error);
    // AI істемей қалса немесе лимит бітсе де бет бос қалмауы үшін Резервтік сұрақтар
    return {
      theoryQuestions: [
        `Что такое ${roadmapTitle} и как он работает?`,
        "Назовите основные принципы и концепции в этой сфере.",
        "Какие инструменты или технологии вы используете чаще всего?"
      ],
      writtenQuestions: [
        {
          id: "wq1",
          text: "Опишите ваш самый сложный проект или задачу в этой сфере.",
          placeholder: "Напишите развернутый ответ...",
          hint: "Минимум 40 символов"
        }
      ]
    };
  }
};

export const evaluateAssessmentAnswers = async (roadmapTitle: string, writtenAnswers: {question: string, answer: string}[]) => {
  try {
    const prompt = `
      Ты IT-ментор. Пользователь претендует на квалификацию по направлению "${roadmapTitle}".
      Вот его развернутые ответы на практические вопросы:
      ${JSON.stringify(writtenAnswers, null, 2)}
      
      Оцени эти ответы по 10-балльной шкале (общий балл за все ответы).
      Затем определи его уровень: "Junior", "Junior Strong", "Middle", "Middle Strong" или "Senior".
      
      Верни ответ ТОЛЬКО в формате JSON:
      {
        "aiScore": 8,
        "levelLabel": "Middle",
        "feedback": "Твой краткий отзыв о его знаниях (1-2 предложения)"
      }
    `;

    const result = await model.generateContent(prompt);
    const cleanJson = result.response.text().replace(/```json|```/g, "").trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("Evaluate Assessment Error:", error);
    return { aiScore: 0, levelLabel: "Junior", feedback: "Ошибка оценки" };
  }
};

// aiService.ts-ке қосу
export const generateVacancyPrepData = async (title: string, company: string) => {
  try {
    const prompt = `
      Сен IT-рекрутер және техникалық менторсың. 
      "${company}" компаниясындағы "${title}" вакансиясына дайындалу үшін:
      1. Ең жиі қойылатын 5 техникалық сұрақ пен олардың толық жауабын (FAQ).
      2. 5 сұрақтан тұратын тест (әр сұрақта 4 нұсқа және 1 дұрыс жауап).
      
      Жауапты ТЕК JSON форматында қайтар:
      {
        "questions": [
          { "id": "q1", "question": "...", "answer": "..." }
        ],
        "test": [
          { 
            "id": "t1", 
            "question": "...", 
            "options": ["A", "B", "C", "D"], 
            "correctAnswerIndex": 0 
          }
        ]
      }
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("AI JSON Error");
    
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("Vacancy Prep AI Error:", error);
    return null;
  }
};