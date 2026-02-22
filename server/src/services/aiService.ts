
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