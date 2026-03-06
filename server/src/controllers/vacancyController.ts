import type { Request, Response } from "express";
import { prisma } from "../prisma/client.js";
import type { AuthRequest } from "../middleware/authMiddleware.js";

const asIso = (date: Date) => date.toISOString();

const verdictByScore = (score: number): "excellent" | "strong" | "good" | "needs_improvement" => {
  if (score >= 85) return "excellent";
  if (score >= 72) return "strong";
  if (score >= 55) return "good";
  return "needs_improvement";
};

const computeSubmissionQuality = (githubUrl: string, notes: string | null, tasksSubmitted: number) => {
  const urlScore = githubUrl.includes("github") ? 20 : 8;
  const notesScore = Math.min(20, Math.floor(((notes ?? "").trim().length || 0) / 20) * 5);
  const countScore = Math.min(25, tasksSubmitted * 5);
  return Math.min(100, 40 + urlScore + notesScore + countScore);
};

const mapVacancy = (vacancy: any) => ({
  id: vacancy.id,
  company: vacancy.company,
  title: vacancy.title,
  level: vacancy.level,
  location: vacancy.location,
  employment: vacancy.employment,
  salaryRange: vacancy.salaryRange,
  tags: vacancy.tags ?? [],
  summary: vacancy.summary,
  preparation: {
    direction: (vacancy.tags ?? []).join(" / ") || vacancy.title,
    questions: (vacancy.questions ?? []).map((q: any) => ({
      id: q.id,
      question: q.question,
      answer: q.answer,
    })),
    test: (vacancy.tests ?? []).map((t: any) => ({
      id: t.id,
      question: t.question,
      options: t.options ?? [],
      correctAnswerIndex: t.correctAnswerIndex,
    })),
  },
  realTasks: (vacancy.realTasks ?? []).map((task: any) => ({
    id: task.id,
    title: task.title,
    brief: task.brief,
    requirements: task.requirements ?? [],
    deliverables: task.deliverables ?? [],
    estimatedHours: task.estimatedHours,
  })),
});

const resolveUserId = (req: Request) => {
  const fromQuery = req.query.userId;
  if (fromQuery !== undefined && fromQuery !== null && String(fromQuery).trim() !== "") {
    const parsed = Number(fromQuery);
    if (Number.isFinite(parsed)) return parsed;
  }
  const authReq = req as AuthRequest;
  const fromToken = Number(authReq.userId);
  return Number.isFinite(fromToken) ? fromToken : null;
};

export const getVacancies = async (_req: Request, res: Response) => {
  try {
    const vacancies = await prisma.vacancy.findMany({
      include: { questions: true, tests: true, realTasks: true },
      orderBy: { createdAt: "desc" },
    });

    return res.json(vacancies.map(mapVacancy));
  } catch (error) {
    console.error("getVacancies error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getVacancyById = async (req: Request, res: Response) => {
  try {
    const vacancyId = String(req.params.vacancyId ?? "");
    if (!vacancyId) return res.status(400).json({ message: "Invalid vacancyId" });

    const vacancy = await prisma.vacancy.findUnique({
      where: { id: vacancyId },
      include: { questions: true, tests: true, realTasks: true },
    });

    if (!vacancy) return res.status(404).json({ message: "Vacancy not found" });

    return res.json(mapVacancy(vacancy));
  } catch (error) {
    console.error("getVacancyById error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getVacancyTasks = async (req: Request, res: Response) => {
  try {
    const vacancyId = String(req.params.vacancyId ?? "");
    if (!vacancyId) return res.status(400).json({ message: "Invalid vacancyId" });

    const userId = resolveUserId(req);

    const vacancy = await prisma.vacancy.findUnique({
      where: { id: vacancyId },
      include: { realTasks: true },
    });
    if (!vacancy) return res.status(404).json({ message: "Vacancy not found" });

    const submissions = userId
      ? await prisma.submission.findMany({
          where: {
            userId,
            task: { vacancyId },
          },
          orderBy: { createdAt: "desc" },
        })
      : [];

    const latestByTask = new Map<string, (typeof submissions)[number]>();
    for (const s of submissions) {
      if (!latestByTask.has(s.taskId)) latestByTask.set(s.taskId, s);
    }

    return res.json(
      vacancy.realTasks.map((task) => {
        const submission = latestByTask.get(task.id) ?? null;
        return {
          task: {
            id: task.id,
            title: task.title,
            brief: task.brief,
            requirements: task.requirements ?? [],
            deliverables: task.deliverables ?? [],
            estimatedHours: task.estimatedHours,
          },
          submission: submission
            ? {
                vacancyId,
                taskId: submission.taskId,
                userId: submission.userId,
                solutionUrl: submission.githubUrl,
                comment: submission.notes ?? "",
                status: "submitted" as const,
                submittedAt: asIso(submission.createdAt),
              }
            : null,
        };
      }),
    );
  } catch (error) {
    console.error("getVacancyTasks error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const submitVacancyTask = async (req: Request, res: Response) => {
  try {
    const vacancyId = String(req.params.vacancyId ?? "");
    const taskId = String(req.params.taskId ?? "");
    if (!vacancyId || !taskId) return res.status(400).json({ message: "Invalid vacancyId or taskId" });

    const userId = resolveUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { githubUrl, notes } = req.body ?? {};
    if (!githubUrl || typeof githubUrl !== "string") {
      return res.status(400).json({ message: "githubUrl is required" });
    }

    const task = await prisma.task.findUnique({ where: { id: taskId }, select: { id: true, vacancyId: true } });
    if (!task || task.vacancyId !== vacancyId) {
      return res.status(404).json({ message: "Task not found for this vacancy" });
    }

    await prisma.submission.deleteMany({ where: { userId, taskId } });

    const created = await prisma.submission.create({
      data: {
        githubUrl,
        notes: typeof notes === "string" ? notes : null,
        status: "submitted",
        userId,
        taskId,
      },
    });

    return res.json({
      vacancyId,
      taskId,
      userId: created.userId,
      solutionUrl: created.githubUrl,
      comment: created.notes ?? "",
      status: "submitted" as const,
      submittedAt: asIso(created.createdAt),
    });
  } catch (error) {
    console.error("submitVacancyTask error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getVacancyTaskLeaderboard = async (req: Request, res: Response) => {
  try {
    const vacancyId = String(req.params.vacancyId ?? "");
    if (!vacancyId) return res.status(400).json({ message: "Invalid vacancyId" });

    const userId = resolveUserId(req);

    const vacancy = await prisma.vacancy.findUnique({ where: { id: vacancyId }, select: { id: true, title: true } });
    if (!vacancy) return res.status(404).json({ message: "Vacancy not found" });

    const submissions = await prisma.submission.findMany({
      where: { task: { vacancyId } },
      include: { user: true },
      take: 1000,
    });

    const byUser = new Map<number, typeof submissions>();
    for (const s of submissions) {
      (byUser.get(s.userId) ?? byUser.set(s.userId, []).get(s.userId)!).push(s);
    }

    const entries = [...byUser.entries()].map(([uid, items]) => {
      const latest = [...items].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
      const averageQualityScore = Math.round(
        items.reduce((sum, i) => sum + computeSubmissionQuality(i.githubUrl, i.notes, items.length), 0) /
          Math.max(1, items.length),
      );
      const sentToHr = averageQualityScore >= 75;

      return {
        userId: uid,
        fullName: latest.user.fullName ?? latest.user.email.split("@")[0] ?? `User ${uid}`,
        avatar: (latest.user.fullName ?? latest.user.email).trim().slice(0, 1).toUpperCase() || "U",
        tasksSubmitted: items.length,
        averageQualityScore,
        aiVerdict: verdictByScore(averageQualityScore),
        sentToHr,
        sentAt: sentToHr ? new Date().toISOString() : null,
        rank: 0,
      };
    });

    const ranked = entries
      .sort((a, b) => {
        if (b.averageQualityScore !== a.averageQualityScore) return b.averageQualityScore - a.averageQualityScore;
        return b.tasksSubmitted - a.tasksSubmitted;
      })
      .map((item, index) => ({ ...item, rank: index + 1 }));

    return res.json({
      vacancyId,
      vacancyTitle: vacancy.title,
      leaders: ranked,
      currentUser: userId ? ranked.find((e) => e.userId === userId) ?? null : null,
    });
  } catch (error) {
    console.error("getVacancyTaskLeaderboard error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getCandidateWorkLeaderboard = async (req: Request, res: Response) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) return res.status(400).json({ message: "userId is required (query or token)" });

    const submissions = await prisma.submission.findMany({
      include: { task: { include: { vacancy: true } }, user: true },
      take: 2000,
    });

    const byUser = new Map<number, typeof submissions>();
    for (const s of submissions) {
      (byUser.get(s.userId) ?? byUser.set(s.userId, []).get(s.userId)!).push(s);
    }

    const entries = [...byUser.entries()].map(([uid, items]) => {
      const latest = [...items].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
      const averageQualityScore = Math.round(
        items.reduce((sum, i) => sum + computeSubmissionQuality(i.githubUrl, i.notes, items.length), 0) /
          Math.max(1, items.length),
      );

      const sentToHr = averageQualityScore >= 75;

      return {
        userId: uid,
        fullName: latest.user.fullName ?? latest.user.email.split("@")[0] ?? `User ${uid}`,
        avatar: (latest.user.fullName ?? latest.user.email).trim().slice(0, 1).toUpperCase() || "U",
        company: latest.task.vacancy.company,
        vacancyTitle: latest.task.vacancy.title,
        tasksSubmitted: items.length,
        averageQualityScore,
        aiVerdict: verdictByScore(averageQualityScore),
        sentToHr,
        sentAt: sentToHr ? new Date().toISOString() : null,
        rank: 0,
      };
    });

    const ranked = entries
      .sort((a, b) => {
        if (b.averageQualityScore !== a.averageQualityScore) return b.averageQualityScore - a.averageQualityScore;
        return b.tasksSubmitted - a.tasksSubmitted;
      })
      .map((item, index) => ({ ...item, rank: index + 1, sentToHr: item.sentToHr || index < 3 }));

    return res.json({
      leaders: ranked,
      currentUser: ranked.find((e) => e.userId === userId) ?? null,
    });
  } catch (error) {
    console.error("getCandidateWorkLeaderboard error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// =========================
// Company cabinet endpoints
// =========================

export const getCompanyVacancies = async (_req: Request, res: Response) => {
  return getVacancies(_req, res);
};

export const createCompanyVacancy = async (req: Request, res: Response) => {
  try {
    const payload = req.body ?? {};
    const requirements: string[] = Array.isArray(payload.requirements) ? payload.requirements.map(String) : [];

    const created = await prisma.vacancy.create({
      data: {
        company: "Skillo Company",
        title: String(payload.title ?? ""),
        level: String(payload.level ?? "junior"),
        location: String(payload.location ?? "Remote"),
        employment: String(payload.employment ?? "full-time"),
        salaryRange: String(payload.salaryRange ?? ""),
        tags: Array.isArray(payload.stack) ? payload.stack.map(String) : [],
        summary: String(payload.description ?? ""),
        questions: { create: [] },
        tests: { create: [] },
        realTasks: requirements.length
          ? {
              create: [
                {
                  title: "Базовое тестовое задание",
                  brief: "Опишите решение с учетом требований вакансии.",
                  requirements,
                  deliverables: ["Ссылка на репозиторий", "Краткое описание решения"],
                  estimatedHours: 6,
                },
              ],
            }
          : undefined,
      },
      include: { questions: true, tests: true, realTasks: true },
    });

    return res.status(201).json(mapVacancy(created));
  } catch (error) {
    console.error("createCompanyVacancy error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateCompanyVacancy = async (req: Request, res: Response) => {
  try {
    const vacancyId = String(req.params.vacancyId ?? "");
    if (!vacancyId) return res.status(400).json({ message: "Invalid vacancyId" });

    const payload = req.body ?? {};
    const updated = await prisma.vacancy.update({
      where: { id: vacancyId },
      data: {
        title: String(payload.title ?? ""),
        level: String(payload.level ?? "junior"),
        location: String(payload.location ?? "Remote"),
        employment: String(payload.employment ?? "full-time"),
        salaryRange: String(payload.salaryRange ?? ""),
        tags: Array.isArray(payload.stack) ? payload.stack.map(String) : [],
        summary: String(payload.description ?? ""),
      },
      include: { questions: true, tests: true, realTasks: true },
    });

    return res.json(mapVacancy(updated));
  } catch (error: any) {
    if (error?.code === "P2025") return res.status(404).json({ message: "Vacancy not found" });
    console.error("updateCompanyVacancy error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteCompanyVacancy = async (req: Request, res: Response) => {
  try {
    const vacancyId = String(req.params.vacancyId ?? "");
    if (!vacancyId) return res.status(400).json({ message: "Invalid vacancyId" });

    await prisma.$transaction(async (tx) => {
      const tasks = await tx.task.findMany({ where: { vacancyId }, select: { id: true } });
      const taskIds = tasks.map((t) => t.id);
      if (taskIds.length) {
        await tx.submission.deleteMany({ where: { taskId: { in: taskIds } } });
      }
      await tx.task.deleteMany({ where: { vacancyId } });
      await tx.testQuestion.deleteMany({ where: { vacancyId } });
      await tx.question.deleteMany({ where: { vacancyId } });
      await tx.vacancy.delete({ where: { id: vacancyId } });
    });

    return res.json({ success: true });
  } catch (error: any) {
    if (error?.code === "P2025") return res.status(404).json({ message: "Vacancy not found" });
    console.error("deleteCompanyVacancy error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const createCompanyVacancyTask = async (req: Request, res: Response) => {
  try {
    const vacancyId = String(req.params.vacancyId ?? "");
    if (!vacancyId) return res.status(400).json({ message: "Invalid vacancyId" });

    const payload = req.body ?? {};
    const created = await prisma.task.create({
      data: {
        vacancyId,
        title: String(payload.title ?? ""),
        brief: String(payload.brief ?? ""),
        requirements: Array.isArray(payload.requirements) ? payload.requirements.map(String) : [],
        deliverables: Array.isArray(payload.deliverables) ? payload.deliverables.map(String) : [],
        estimatedHours: Number(payload.estimatedHours ?? 6),
      },
    });

    return res.status(201).json({
      id: created.id,
      title: created.title,
      brief: created.brief,
      requirements: created.requirements ?? [],
      deliverables: created.deliverables ?? [],
      estimatedHours: created.estimatedHours,
    });
  } catch (error) {
    console.error("createCompanyVacancyTask error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateCompanyVacancyTask = async (req: Request, res: Response) => {
  try {
    const vacancyId = String(req.params.vacancyId ?? "");
    const taskId = String(req.params.taskId ?? "");
    if (!vacancyId || !taskId) return res.status(400).json({ message: "Invalid vacancyId or taskId" });

    const payload = req.body ?? {};
    const updated = await prisma.task.update({
      where: { id: taskId },
      data: {
        title: String(payload.title ?? ""),
        brief: String(payload.brief ?? ""),
        requirements: Array.isArray(payload.requirements) ? payload.requirements.map(String) : [],
        deliverables: Array.isArray(payload.deliverables) ? payload.deliverables.map(String) : [],
        estimatedHours: Number(payload.estimatedHours ?? 6),
      },
    });

    if (updated.vacancyId !== vacancyId) {
      return res.status(400).json({ message: "Task does not belong to vacancy" });
    }

    return res.json({
      id: updated.id,
      title: updated.title,
      brief: updated.brief,
      requirements: updated.requirements ?? [],
      deliverables: updated.deliverables ?? [],
      estimatedHours: updated.estimatedHours,
    });
  } catch (error: any) {
    if (error?.code === "P2025") return res.status(404).json({ message: "Task not found" });
    console.error("updateCompanyVacancyTask error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteCompanyVacancyTask = async (req: Request, res: Response) => {
  try {
    const vacancyId = String(req.params.vacancyId ?? "");
    const taskId = String(req.params.taskId ?? "");
    if (!vacancyId || !taskId) return res.status(400).json({ message: "Invalid vacancyId or taskId" });

    await prisma.$transaction(async (tx) => {
      await tx.submission.deleteMany({ where: { taskId } });
      const task = await tx.task.delete({ where: { id: taskId } });
      if (task.vacancyId !== vacancyId) {
        throw new Error("Task vacancy mismatch");
      }
    });

    return res.json({ success: true });
  } catch (error: any) {
    if (error?.code === "P2025") return res.status(404).json({ message: "Task not found" });
    console.error("deleteCompanyVacancyTask error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getCompanyCandidates = async (_req: Request, res: Response) => {
  try {
    const submissions = await prisma.submission.findMany({
      include: {
        user: true,
        task: { include: { vacancy: true } },
      },
      take: 2000,
      orderBy: { createdAt: "desc" },
    });

    const byCandidateKey = new Map<string, typeof submissions>();
    for (const s of submissions) {
      const key = `${s.userId}:${s.task.vacancyId}`;
      (byCandidateKey.get(key) ?? byCandidateKey.set(key, []).get(key)!).push(s);
    }

    const candidates = await Promise.all(
      [...byCandidateKey.entries()].map(async ([key, items]) => {
        const latest = items[0];
        const user = latest.user;
        const vacancy = latest.task.vacancy;

        const tasks = await prisma.task.findMany({ where: { vacancyId: vacancy.id }, select: { id: true, title: true } });
        const submittedTaskIds = new Set(items.map((i) => i.taskId));

        const taskResults = tasks.map((task) => ({
          taskId: task.id,
          taskTitle: task.title,
          status: submittedTaskIds.has(task.id) ? ("passed" as const) : ("not_submitted" as const),
          score: submittedTaskIds.has(task.id) ? Math.min(100, 60 + items.length * 5) : null,
          submittedAt: submittedTaskIds.has(task.id) ? asIso(latest.createdAt) : null,
        }));

        const tasksTotal = tasks.length;
        const tasksSubmitted = taskResults.filter((t) => t.status !== "not_submitted").length;
        const tasksPassed = taskResults.filter((t) => t.status === "passed").length;

        const overallScore = tasksSubmitted ? Math.min(100, 55 + tasksPassed * 10 + items.length * 3) : null;
        const workReadinessPercent = overallScore ?? 0;

        const fullName = user.fullName ?? user.email.split("@")[0] ?? `User ${user.id}`;
        const avatar = fullName.trim().slice(0, 1).toUpperCase() || "U";

        return {
          id: `cand-${key.replace(":", "-")}`,
          fullName,
          email: user.email,
          avatar,
          phone: "",
          country: user.country,
          city: user.city,
          university: user.university,
          experienceLevel: "junior" as const,
          about: "",
          skills: [],
          portfolioUrl: "",
          githubUrl: latest.githubUrl,
          linkedinUrl: "",
          vacancyId: vacancy.id,
          vacancyTitle: vacancy.title,
          appliedAt: asIso(latest.createdAt),
          status: "new" as const,
          inviteSentAt: null,
          evaluation: {
            tasks: taskResults,
            tasksSubmitted,
            tasksPassed,
            tasksTotal,
            test: { status: "not_submitted" as const, score: null, correctAnswers: 0, totalQuestions: 0 },
            interview: { status: "not_submitted" as const, score: null, answered: 0, totalQuestions: 0 },
            overallScore,
            workReadinessPercent,
            readyForWork: workReadinessPercent >= 75,
          },
        };
      }),
    );

    return res.json(candidates);
  } catch (error) {
    console.error("getCompanyCandidates error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const sendInterviewInvite = async (req: Request, res: Response) => {
  try {
    const candidateId = String(req.params.candidateId ?? "");
    if (!candidateId) return res.status(400).json({ message: "Invalid candidateId" });

    const payload = req.body ?? {};
    const sentAt = new Date().toISOString();

    return res.json({
      candidateId,
      sentTo: String(payload.to ?? payload.email ?? "candidate@example.com"),
      subject: String(payload.subject ?? "Interview invite"),
      sentAt,
    });
  } catch (error) {
    console.error("sendInterviewInvite error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

