import { Response } from 'express';
import pkg from '@prisma/client';
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

export const getLeaderboard = async (req: any, res: Response) => {
  try {
    const currentUserId = req.user.userId;

    // 1. Барлық пайдаланушыларды олардың прогресімен ЖӘНЕ күнделікті тапсырмаларымен бірге алу
    const users = await prisma.user.findMany({
      include: {
        progress: true,
        // ЖАҢА ЖОЛ: Лидерборд үшін де тек орындалғандарын аламыз
        dailyTasks: {
          where: { completed: true }
        }
      }
    });

    // 2. Ұпайларды есептеу және форматтау
    const leaders = users.map((user) => {
      const topicResults = user.progress || [];
      const passedTestsCount = topicResults.filter(r => r.status === "completed").length;
      
      // Прогресстен жиналған ұпайлар
      const totalScorePoints = topicResults.reduce((sum, r) => sum + (r.score || 0), 0);
      
      // Күнделікті тапсырмалардан жиналған ұпайлар
      const dailyPoints = user.dailyTasks.reduce((sum, task) => sum + task.points, 0);
      
      // ЖАЛПЫ ҰПАЙ: (Бітірген тест * 140) + Тесттегі балдар + Күнделікті балдар
      const totalPoints = (passedTestsCount * 140) + totalScorePoints + dailyPoints;

      return {
        userId: user.id,
        fullName: user.fullName || user.email.split('@')[0],
        avatar: (user.fullName?.[0] || user.email[0]).toUpperCase(),
        country: user.country,
        city: user.city,
        university: user.university,
        points: totalPoints, // <-- Біріккен ұпай
        completedTests: topicResults.length,
        passedTests: passedTestsCount,
        failedTests: topicResults.filter(r => r.status === "in_progress" && r.score < 70).length,
        roadmapProgressPercent: 0, 
        badges: totalPoints > 1000 ? ["Fast Learner"] : ["Starter"],
        rank: 0 
      };
    });

    // 3. Ұпай бойынша сұрыптау және Ранк (орын) беру
    const sortedLeaders = leaders
      .sort((a, b) => b.points - a.points)
      .map((leader, index) => ({
        ...leader,
        rank: index + 1
      }));

    // 4. Қазіргі юзерді табу
    const currentUser = sortedLeaders.find(l => l.userId === currentUserId);

    res.json({
      leaders: sortedLeaders,
      currentUser: currentUser || sortedLeaders[0]
    });

  } catch (error) {
    console.error("Leaderboard Error:", error);
    res.status(500).json({ error: "Лидербордты жүктеу қатесі" });
  }
};