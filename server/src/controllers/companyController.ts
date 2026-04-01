import { Request, Response } from 'express';
import pkg from '@prisma/client';

const { PrismaClient } = pkg;
const prisma = new PrismaClient();

// Вакансияларды алу
export const getCompanyVacancies = async (req: Request, res: Response) => {
  try {
    const vacancies = await prisma.vacancy.findMany({
      include: { realTasks: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(vacancies);
  } catch (error) {
    res.status(500).json({ message: "Вакансиларды алу кезінде қате кетті" });
  }
};

// Жаңа вакансия қосу
export const createCompanyVacancy = async (req: Request, res: Response) => {
  try {
    const { title, level, location, employment, salaryRange, stack, description } = req.body;
    
    // Бұл жерде company атын req.user-ден алуға болады, әзірге статикалық:
    const companyName = "Skillo Company"; 

    const vacancy = await prisma.vacancy.create({
      data: {
        company: companyName,
        title,
        level,
        location,
        employment,
        salaryRange,
        tags: stack,
        summary: description
      },
      include: { realTasks: true }
    });
    res.status(201).json(vacancy);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Вакансия құру қатесі" });
  }
};

// Вакансияны жаңарту
export const updateCompanyVacancy = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, level, location, employment, salaryRange, stack, description } = req.body;
    
    const vacancy = await prisma.vacancy.update({
      where: { id },
      data: { title, level, location, employment, salaryRange, tags: stack, summary: description },
      include: { realTasks: true }
    });
    res.json(vacancy);
  } catch (error) {
    res.status(500).json({ message: "Жаңарту қатесі" });
  }
};

// Вакансияны жою (Байланысқан тапсырмаларды қоса жою керек, конфликт болмау үшін)
export const deleteCompanyVacancy = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // Алдымен вакансияға тиесілі тапсырмаларды жоямыз
    await prisma.task.deleteMany({ where: { vacancyId: id } });
    await prisma.testQuestion.deleteMany({ where: { vacancyId: id } });
    await prisma.question.deleteMany({ where: { vacancyId: id } });
    
    // Сосын вакансияның өзін жоямыз
    await prisma.vacancy.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Жою қатесі" });
  }
};

// --- ТЕСТТІК ТАПСЫРМАЛАР (TASKS) ---

export const createCompanyVacancyTask = async (req: Request, res: Response) => {
  try {
    const { id: vacancyId } = req.params;
    const { title, brief, requirements, deliverables, estimatedHours } = req.body;
    
    const task = await prisma.task.create({
      data: {
        vacancyId,
        title,
        brief,
        requirements,
        deliverables,
        estimatedHours
      }
    });
    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ message: "Тапсырма қосу қатесі" });
  }
};

export const updateCompanyVacancyTask = async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const { title, brief, requirements, deliverables, estimatedHours } = req.body;
    
    const task = await prisma.task.update({
      where: { id: taskId },
      data: { title, brief, requirements, deliverables, estimatedHours }
    });
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: "Тапсырманы жаңарту қатесі" });
  }
};

export const deleteCompanyVacancyTask = async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    await prisma.submission.deleteMany({ where: { taskId } }); // Тапсырма жауаптарын тазалау
    await prisma.task.delete({ where: { id: taskId } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Тапсырманы жою қатесі" });
  }
};

// --- КАНДИДАТТАР ---

export const getCompanyCandidates = async (req: Request, res: Response) => {
  try {
    // Кандидаттар - бұл Task-қа Submission жіберген студенттер
    const submissions = await prisma.submission.findMany({
      include: {
        user: true,
        task: { include: { vacancy: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const candidates = submissions.map(sub => ({
      id: sub.id,
      userId: sub.user.id,
      fullName: sub.user.fullName,
      email: sub.user.email,
      vacancyId: sub.task.vacancyId,
      vacancyTitle: sub.task.vacancy.title,
      taskId: sub.task.id,
      status: sub.status === "pending" ? "new" : sub.status, // Фронтендке сай
      githubUrl: sub.githubUrl,
      createdAt: sub.createdAt
    }));
    res.json(candidates);
  } catch (error) {
    res.status(500).json({ message: "Кандидаттарды алу қатесі" });
  }
};

export const sendInterviewInvite = async (req: Request, res: Response) => {
  try {
    const { candidateId } = req.params;
    const { subject, message } = req.body;

    // Мұнда сіз шынайы Email жіберу (Nodemailer т.б.) логикасын қоса аласыз
    // Әзірге базада статус жаңартамыз
    const submission = await prisma.submission.update({
      where: { id: candidateId },
      data: { status: 'invited' },
      include: { user: true }
    });

    res.json({
      candidateId,
      sentTo: submission.user.email,
      subject,
      sentAt: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ message: "Шақыру жіберу қатесі" });
  }
};