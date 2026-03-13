
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// src/services/aiService.ts
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
    const cleanJson = text.replace(/```json|```/g, "").trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("AI Error:", error);
    return { roadmap: [] }; // Mock деректерді осында қоссаң болады
  }
};

export const generateTopicContent = async (title: string, profession: string) => {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `
    Сен ${profession} маманына арналған менторсың. 
    "${title}" тақырыбы бойынша:
    1. Сапалы әрі қысқаша теориялық материал жаз (Markdown форматында).
    2. Тақырыпты бекітуге арналған 3 сұрақтан тұратын тест жаса.
    
    Жауапты ТЕК мынадай JSON форматында бер:
    {
      "theory": "Мәтін осында...",
      "questions": [
        { "question": "сұрақ?", "options": ["а", "б", "в", "г"], "correctIndex": 0 }
      ]
    }
  `;

  const result = await model.generateContent(prompt);
  return JSON.parse(result.response.text().replace(/```json|```/g, "").trim());
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
    
    // JSON-ды тазарту (Markdown белгілерін алып тастау)
    const cleanJson = text.replace(/```json|```/g, "").trim();
    
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("Gemini Error:", error);
    // Егер AI қате берсе, Postman-да көру үшін null қайтармай, бос тізім қайтарайық
    return { questions: [] };
  }
};