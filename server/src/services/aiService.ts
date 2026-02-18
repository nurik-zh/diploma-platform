import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
// Мұнда "gemini-1.5-flash" орнына "gemini-pro" қолданып көреміз
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

export const getAIResponse = async (profession: string, score: number) => {
  try {
    const level = score > 8 ? 'Advanced' : score > 4 ? 'Middle' : 'Beginner';

    // Бұл жерде ЖИ-ді күтпестен, дайын жауап қайтарамыз
    console.log(`ЖИ-ге сұраныс симуляциясы: ${profession}, деңгейі: ${level}`);

    return {
      "roadmap": [
        { "week": 1, "topic": `${profession} негіздері (${level})`, "task": "Негізгі концепцияларды оқып шығу", "resource": "https://google.com" },
        { "week": 2, "topic": "Практикалық жұмыс", "task": "Кішігірім жоба құрастыру", "resource": "https://github.com" },
        { "week": 3, "topic": "Тереңдетілген тақырыптар", "task": "Оптимизация жасау", "resource": "https://stackoverflow.com" },
        { "week": 4, "topic": "Финалдық жоба", "task": "Жобаны деплой жасау", "resource": "https://vercel.com" }
      ]
    };

  } catch (error: any) {
    console.error("Қате кетті:", error);
    throw new Error("Roadmap жасау мүмкін болмады.");
  }
};

// export const getAIResponse = async (profession: string, score: number) => {
//   try {
//     const level = score > 8 ? 'Advanced' : score > 4 ? 'Middle' : 'Beginner';

//     const prompt = `
//       Сен IT менторсың. Пайдаланушының мамандығы: ${profession}, деңгейі: ${level}.
//       Оған арналған 4 апталық оқу жоспарын (Roadmap) құрастыр.
//       Жауапты тек мынадай JSON форматында қайтар (артық мәтінсіз):
//       {
//         "roadmap": [
//           { "week": 1, "topic": "Тақырып аты", "task": "Орындалатын тапсырма", "resource": "Сілтеме" }
//         ]
//       }
//     `;

//     const result = await model.generateContent(prompt);
//     const response = await result.response;
//     const text = response.text();

//     // JSON-ды тазалап алу (кейде ЖИ мәтін қосып жібереді)
//     const jsonStart = text.indexOf('{');
//     const jsonEnd = text.lastIndexOf('}') + 1;
//     const jsonData = text.substring(jsonStart, jsonEnd);

//     return JSON.parse(jsonData);

//   } catch (error: any) {
//     console.error("Gemini AI қатесі:", error);
//     throw new Error("ЖИ қате берді: " + error.message);
//   }
// };