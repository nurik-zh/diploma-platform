import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { generateVacancyPrepData } from '../services/aiService.js';

const prisma = new PrismaClient();

export const getAllVacancies = async (req: Request, res: Response) => {
  try {
    const vacancies = await prisma.vacancy.findMany({
      include: {
        _count: {
          select: { realTasks: true }
        }
      }
    });
    res.json(vacancies);
  } catch (error) {
    res.status(500).json({ error: "Деректерді алу мүмкін болмады" });
  }
};

export const getVacancyById = async (req: Request, res: Response) => {
  try {
    const vacancy = await prisma.vacancy.findUnique({
      where: { id: req.params.id },
      include: { 
        questions: true, 
        tests: true,
        realTasks: true 
      }
    });

    if (!vacancy) return res.status(404).json({ error: "Вакансия табылмады" });

    // Фронтенд күтетін форматқа келтіру (Preparation нысанын құрастыру)
    const formattedVacancy = {
      ...vacancy,
      preparation: {
        direction: vacancy.tags[0] || "General", // немесе базаға жаңа өріс қосу
        questions: vacancy.questions,
        test: vacancy.tests
      }
    };

    res.json(formattedVacancy);
  } catch (error) {
    res.status(500).json({ error: "Қате орын алды" });
  }
};

export const getVacancyTaskLeaderboard = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const submissions = await prisma.submission.findMany({
      where: { task: { vacancyId: id } },
      include: { 
        user: true,
        task: true // Тапсырманың күрделілігін білу үшін
      }
    });

    const userStats = submissions.reduce((acc: any, sub) => {
      if (!acc[sub.userId]) {
        acc[sub.userId] = {
          userId: sub.userId,
          fullName: sub.user.fullName || "Anonymous",
          tasksSubmitted: 0,
          totalScore: 0,
        };
      }
      
      // Ұпай есептеу логикасы: 
      // Мысалы: әр тапсырма үшін 50 ұпай + (күрделілік сағаты * 10)
      const taskScore = 50 + (sub.task.estimatedHours * 10); 
      
      acc[sub.userId].tasksSubmitted += 1;
      acc[sub.userId].totalScore += taskScore;
      return acc;
    }, {});

    const leaders = Object.values(userStats)
      .map((l: any) => ({
        ...l,
        // Орташа сапа ұпайы (0-100 аралығында)
        averageQualityScore: Math.min(100, Math.round(l.totalScore / (l.tasksSubmitted * 1.5))),
        aiVerdict: l.totalScore > 150 ? "excellent" : "good",
        sentToHr: l.totalScore > 200 // 200 ұпайдан асса HR-ға кетеді
      }))
      .sort((a, b) => b.totalScore - a.totalScore) // Ұпайы көптер жоғарыда
      .map((l, index) => ({ ...l, rank: index + 1 }));

    res.json({
      vacancyId: id,
      leaders: leaders.slice(0, 10),
      currentUser: leaders.find(l => l.userId === Number((req as any).user?.userId)) || null
    });
  } catch (error) {
    res.status(500).json({ error: "Лидербордты есептеу қатесі" });
  }
};

export const getVacancyRealTasks = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.userId;

    const tasks = await prisma.task.findMany({
      where: { vacancyId: id },
      include: {
        submissions: {
          where: { userId: Number(userId) },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    const result = tasks.map(task => ({
      task: task,
      submission: task.submissions[0] ? {
        solutionUrl: task.submissions[0].githubUrl,
        comment: task.submissions[0].notes,
        submittedAt: task.submissions[0].createdAt
      } : null
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Тапсырмаларды алу мүмкін болмады" });
  }
};

export const getVacancyTasks = async (req: Request, res: Response) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { vacancyId: req.params.id }
    });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: "Тапсырмаларды алу қатесі" });
  }
};

export const submitTask = async (req: Request, res: Response) => {
  try {
    const { vacancyId, taskId } = req.params;
    const { githubUrl, notes } = req.body;
    const userId = (req as any).user.userId; // JWT-ден алынған ID

    // Тапсырманы базаға сақтау немесе жаңарту (Upsert)
    const submission = await prisma.submission.upsert({
      where: {
        userId_taskId: { // Prisma-да User және Task үшін unique constraint болуы керек
          userId: Number(userId),
          taskId: taskId
        }
      },
      update: {
        githubUrl,
        notes,
        createdAt: new Date()
      },
      create: {
        userId: Number(userId),
        taskId: taskId,
        githubUrl,
        notes
      }
    });

    res.json(submission);
  } catch (error) {
    console.error("Submission error:", error);
    res.status(500).json({ error: "Ошибка при сохранении решения" });
  }
};

export const generateAIPrep = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 1. Вакансияны табу
    const vacancy = await prisma.vacancy.findUnique({ where: { id } });
    if (!vacancy) return res.status(404).json({ error: "Vacancy not found" });

    // 2. AI арқылы сұрақтар мен тест генерациялау
    const aiData = await generateVacancyPrepData(vacancy.title, vacancy.company);

    if (!aiData) throw new Error("AI Generation failed");

    // 3. Сұрақтарды базаға сақтау (Relation бойынша)
    // Ескерту: Сұрақтар мен Тесттер базада жеке кесте болса:
    await prisma.question.createMany({
      data: aiData.questions.map((q: any) => ({
        vacancyId: id,
        question: q.question,
        answer: q.answer
      }))
    });

    await prisma.test.createMany({
      data: aiData.test.map((t: any) => ({
        vacancyId: id,
        question: t.question,
        options: t.options,
        correctAnswerIndex: t.correctAnswerIndex
      }))
    });

    res.json(aiData);
  } catch (error) {
    console.error("AI Prep Error:", error);
    res.status(500).json({ error: "Генерация кезінде қате кетті" });
  }
};