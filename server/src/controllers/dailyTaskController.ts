import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { generateDailyQuiz } from '../services/aiService.js';

const prisma = new PrismaClient();

// Құлып (Lock) механикасы
const generatingUsers = new Set<number>();

export const getTodayTasks = async (req: any, res: Response) => {
  try {
    const userId = parseInt(req.user.userId, 10);
    const today = new Date().toISOString().split('T')[0];

    // 1. Базада бар тапсырмаларды аламыз
    const existingTasks = await prisma.dailyTask.findMany({
      where: { userId, date: today }
    });

    // 2. Жауапты бірден қайтарамыз (Фронтенд күтіп қалмауы үшін)
    res.json(existingTasks);

    // 3. ҚҰЛЫПТЫ ТЕКСЕРУ: Егер қазір бір тест жасалып жатса, жаңасын бастамаймыз
    if (generatingUsers.has(userId)) return;

    // 4. Роадмаптарды алу
    const userRoadmapRecords = await prisma.userRoadmap.findMany({ where: { userId } });
    const selectedRoadmapIds = userRoadmapRecords.map((r: any) => r.roadmapId);
    
    const activeRoadmaps = await prisma.roadmap.findMany({
      where: { id: { in: selectedRoadmapIds } },
      include: { nodes: true }
    });

    // 5. Қай роадмаптарға тест әлі ЖОҚ екенін анықтау
    const roadmapsToGenerate = activeRoadmaps.filter(r => 
      !existingTasks.some(t => String(t.roadmapId) === String(r.id))
    );
    const hasGlobal = existingTasks.some(t => t.roadmapId === "global");

    // Егер бәрі дайын болса, ештеңе істемейміз
    if (roadmapsToGenerate.length === 0 && hasGlobal) return;

    // 6. ГЕНЕРАЦИЯНЫ БАСТАУ (БІР УАҚЫТТА ТЕК БІРЕУІН ҒАНА ЖАСАЙМЫЗ)
    generatingUsers.add(userId);

    const runSingleGeneration = async () => {
      try {
        // А) Бірінші кезекте Global Task жасалады
        if (!hasGlobal) {
          console.log("[AI] Global Task дайындалуда...");
          const quizData = await generateDailyQuiz("IT жалпы білім", "Бағдарламалау негіздері");
          
          if (quizData && quizData.questions) {
            await prisma.dailyTask.create({
              data: {
                userId, date: today, roadmapId: "global", roadmapTitle: "Күннің басты тесті",
                nodeId: "global_all", nodeTitle: "Жалпылама сұрақтар",
                description: "Барлық саладан сұрақтар", points: 100, completed: false, quizData
              }
            });
            console.log("✅ Global Task сақталды");
          }
          return; // МАҢЫЗДЫ: Біреуін жасадық па, тоқтаймыз! Қалғанын келесі сұраныста жасайды.
        }

        // Ә) Егер Global бар болса, онда жетіспейтін РОАДМАПТАРДЫҢ ТЕК БІРІНШІСІН жасаймыз
        if (roadmapsToGenerate.length > 0) {
          const roadmap = roadmapsToGenerate[0]; // Тек 1-шісін аламыз (цикл жоқ!)
          const nodes = roadmap.nodes;

          if (nodes && nodes.length > 0) {
            const randomNode = nodes[Math.floor(Math.random() * nodes.length)];
            
            console.log(`[AI] ${roadmap.title} үшін тест дайындалуда...`);
            const quizData = await generateDailyQuiz(roadmap.title, randomNode.title);
            
            if (quizData && quizData.questions) {
              await prisma.dailyTask.create({
                data: {
                  userId, date: today, roadmapId: String(roadmap.id), roadmapTitle: roadmap.title,
                  nodeId: randomNode.id, nodeTitle: randomNode.title,
                  description: `${roadmap.title} бойынша білім тексеру`, points: 50, completed: false, quizData
                }
              });
              console.log(`✅ ${roadmap.title} тесті сақталды`);
            }
          }
        }
      } catch (err: any) {
        console.error("AI Generation Error:", err.message || err);
      } finally {
        generatingUsers.delete(userId); // Құлыпты ашамыз
      }
    };

    runSingleGeneration();

  } catch (error) {
    console.error("Controller Error:", error);
  }
};

export const submitTask = async (req: Request, res: Response): Promise<any> => {
  try {
    const { taskId } = req.params;
    const { optionId } = req.body; 
    const userId = (req as any).user.userId;

    const task = await prisma.dailyTask.findUnique({ where: { id: taskId } });
    
    if (!task || task.userId !== userId) {
      return res.status(404).json({ error: "Task not found" });
    }

    const quizData = task.quizData as any;
    let correctAnswerId = null;

    if (quizData.questions && Array.isArray(quizData.questions)) {
      correctAnswerId = quizData.questions[0].correctOptionId; 
    } else {
      correctAnswerId = quizData.correctOptionId;
    }

    if (String(optionId) !== String(correctAnswerId)) {
      return res.status(400).json({ 
        success: false, 
        message: "Қате жауап! Қайтадан көріңіз." 
      });
    }

    const updatedTask = await prisma.dailyTask.update({
      where: { id: taskId },
      data: { completed: true, completedAt: new Date() }
    });

    return res.json({ success: true, task: updatedTask });

  } catch (error) {
    console.error("Submit error:", error);
    return res.status(500).json({ error: 'Server error' });
  }
};