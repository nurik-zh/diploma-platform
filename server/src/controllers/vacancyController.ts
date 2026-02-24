import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

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
    res.json(vacancy);
  } catch (error) {
    res.status(500).json({ error: "Қате орын алды" });
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
  const { taskId } = req.params;
  const { githubUrl, notes } = req.body;

  const rawUserId = (req as any).user?.userId; 

  if (!rawUserId) {
    return res.status(401).json({ error: "Авторизация қажет. Жүйеге кіріңіз." });
  }

  const userId = parseInt(rawUserId);

  if (isNaN(userId)) {
    return res.status(400).json({ error: "Пайдаланушы ID-і дұрыс емес (сан болуы керек)" });
  }

  if (!githubUrl) {
    return res.status(400).json({ error: "GitHub сілтемесі міндетті" });
  }

  try {
    const newSubmission = await prisma.submission.create({
      data: {
        githubUrl,
        notes,
        taskId,    
        userId,     
        status: "pending"
      }
    });

    res.status(201).json({ 
      message: "Тапсырма сәтті жіберілді!", 
      submission: newSubmission 
    });
  } catch (error) {
    console.error("Submission error details:", error);
    res.status(500).json({ error: "Тапсырманы жіберу кезінде серверлік қате кетті" });
  }
};