// profileController.ts
import { Response } from 'express';
import pkg from '@prisma/client';
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

export const getProfile = async (req: any, res: Response) => {
  try {
    const userId = parseInt(req.user.userId, 10); 

    // 1. Пайдаланушыны барлық қажетті байланыстарымен алу
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { 
        progress: { 
          where: { status: "completed" },
          include: {
            node: {
              include: { roadmap: true } // Бағыттың атын білу үшін
            }
          }
        } 
      }
    });

    if (!user) return res.status(404).json({ message: "Пайдаланушы табылмады" });

    // 2. Жалпы ұпайды есептеу (барлық аяқталған түйіндердің ұпайларын қосу)
    const totalPoints = user.progress.reduce((sum, p) => sum + p.score, 0);

    // 3. Жетістіктерді динамикалық түрде құру
    const achievements = ["Зарегистирован на платформу"];
    if (user.progress.length >= 1) achievements.push("Алғашқы қадам (1 тест)");
    if (user.progress.length >= 5) achievements.push("Жүйелі оқушы (5 тест)");
    if (totalPoints > 300) achievements.push("Білімді маман (300+ ұпай)");

    // 4. Паутина знаний (Radar Chart) үшін дағдыларды есептеу
    // Бағыт (Roadmap) атауларына қарап категорияларға бөлеміз
    const skillCategories: Record<string, { totalScore: number, count: number }> = {
      'Frontend': { totalScore: 0, count: 0 },
      'Backend': { totalScore: 0, count: 0 },
      'Database': { totalScore: 0, count: 0 },
      'DevOps': { totalScore: 0, count: 0 },
      'Soft Skills': { totalScore: 0, count: 0 }
    };

    user.progress.forEach(p => {
      const roadmapTitle = p.node.roadmap.title.toLowerCase();
      let category = 'Soft Skills'; // Әдепкі
      
      if (roadmapTitle.includes('front') || roadmapTitle.includes('react') || roadmapTitle.includes('vue') || roadmapTitle.includes('html')) category = 'Frontend';
      else if (roadmapTitle.includes('back') || roadmapTitle.includes('node') || roadmapTitle.includes('python')) category = 'Backend';
      else if (roadmapTitle.includes('sql') || roadmapTitle.includes('database') || roadmapTitle.includes('postgre')) category = 'Database';
      else if (roadmapTitle.includes('docker') || roadmapTitle.includes('ci/cd') || roadmapTitle.includes('devops')) category = 'DevOps';

      skillCategories[category].totalScore += p.score;
      skillCategories[category].count += 1;
    });

    const radarSkills = Object.keys(skillCategories).map(key => {
      const cat = skillCategories[key];
      const value = cat.count > 0 ? Math.round(cat.totalScore / cat.count) : 10; 
      return { id: key.toLowerCase().replace(' ', '-'), label: key, value: value > 100 ? 100 : value };
    });

    const simpleSkillsList = radarSkills.filter(s => s.value > 20).map(s => s.label); // Тек 20%-дан асқандарды "Навыки" тізіміне шығарамыз

    res.json({
      id: user.id,
      fullName: user.fullName || "Пользователь",
      email: user.email,
      createdAt: user.createdAt.toISOString(),
      joinedAt: new Date(user.createdAt).toLocaleDateString('ru-RU'),
      country: user.country,
      city: user.city,
      university: user.university,
      firstLogin: user.firstLogin,
      completedTests: user.progress.length,
      points: totalPoints,
      skills: simpleSkillsList.length > 0 ? simpleSkillsList : ["Начинающий"],
      radarSkills: radarSkills,
      achievements: achievements
    });
  } catch (error) {
    console.error("Profile error:", error);
    res.status(500).json({ message: "Профиль деректерін алуда қате шықты" });
  }
};

export const getUserYearActivity = async (req: any, res: Response) => {
  try {
    const userId = parseInt(req.user.userId, 10);

    // Пайдаланушының "completed" болған барлық прогрестерін аламыз
    const progress = await prisma.userProgress.findMany({
      where: { 
        userId,
        status: "completed" 
      },
      select: { updatedAt: true }
    });

    // Деректерді күн бойынша топтастыру (Activity Heatmap үшін)
    // Формат: { [date]: count } -> кейін [{date, count}] айналдырамыз
    const activityMap: Record<string, number> = {};

    progress.forEach(p => {
      const date = p.updatedAt.toISOString().split('T')[0]; // YYYY-MM-DD
      activityMap[date] = (activityMap[date] || 0) + 1;
    });

    const formattedActivity = Object.keys(activityMap).map(date => ({
      date,
      count: activityMap[date]
    }));

    res.json(formattedActivity);
  } catch (error) {
    console.error("Activity fetch error:", error);
    res.status(500).json({ error: "Белсенділік деректерін алу мүмкін болмады" });
  }
};