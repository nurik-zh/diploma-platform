import type { Request, Response } from "express";
import { prisma } from "../prisma/client.js";
import type { AuthRequest } from "../middleware/authMiddleware.js";
import { generateTopicContent } from "../services/aiService.js";

const asIso = (date: Date) => date.toISOString();

const safeString = (value: unknown, fallback = "") => (typeof value === "string" ? value : fallback);

const ensureUserId = (req: Request) => {
  const userId = Number((req as AuthRequest).userId);
  return Number.isFinite(userId) ? userId : null;
};

export const getTopics = async (_req: Request, res: Response) => {
  try {
    const nodes = await prisma.roadmapNode.findMany({
      select: { id: true, roadmapId: true, title: true, description: true, level: true },
      orderBy: { orderIndex: "asc" },
      take: 2000,
    });

    return res.json(
      nodes.map((node) => ({
        id: node.id,
        roadmapId: node.roadmapId,
        title: node.title,
        description: node.description ?? "",
        level: (node.level as "beginner" | "intermediate" | "advanced") ?? "beginner",
      })),
    );
  } catch (error) {
    console.error("getTopics error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getTopicContent = async (req: Request, res: Response) => {
  try {
    const topicId = String(req.params.topicId ?? "");
    if (!topicId) return res.status(400).json({ message: "Invalid topicId" });

    const node = await prisma.roadmapNode.findUnique({
      where: { id: topicId },
      select: { id: true, title: true, theory: true, roadmapId: true },
    });
    if (!node) return res.status(404).json({ message: "Topic not found" });

    // Contract returns array (TopicContentResponse = TopicContent[])
    return res.json([{ topicId: node.id, theory: node.theory ?? "" }]);
  } catch (error) {
    console.error("getTopicContent error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getTopicTest = async (req: Request, res: Response) => {
  try {
    const topicId = String(req.params.topicId ?? "");
    if (!topicId) return res.status(400).json({ message: "Invalid topicId" });

    const node = await prisma.roadmapNode.findUnique({
      where: { id: topicId },
      select: { id: true, testData: true, title: true },
    });
    if (!node) return res.status(404).json({ message: "Topic not found" });

    const data = node.testData as any;
    const questions = Array.isArray(data?.questions)
      ? data.questions.map((q: any, index: number) => ({
          id: safeString(q.id, `q-${topicId}-${index}`),
          question: safeString(q.question, ""),
          options: Array.isArray(q.options) ? q.options.map(String) : [],
          correctAnswerIndex: Number.isFinite(Number(q.correctAnswerIndex)) ? Number(q.correctAnswerIndex) : 0,
        }))
      : [];

    return res.json([{ topicId, questions }]);
  } catch (error) {
    console.error("getTopicTest error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const postTopicResult = async (req: Request, res: Response) => {
  try {
    const topicId = String(req.params.topicId ?? "");
    if (!topicId) return res.status(400).json({ message: "Invalid topicId" });

    const userId = ensureUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const score = Number(req.body?.score ?? 0);
    const passed = Boolean(req.body?.passed ?? score >= 70);

    const progress = await prisma.userProgress.upsert({
      where: { userId_nodeId: { userId, nodeId: topicId } },
      update: {
        status: passed ? "completed" : "in_progress",
        score: Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 0,
      },
      create: {
        userId,
        nodeId: topicId,
        status: passed ? "completed" : "in_progress",
        score: Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 0,
      },
    });

    return res.json({
      topicId,
      score: progress.score,
      passed: progress.status === "completed",
      updatedAt: asIso(progress.updatedAt),
    });
  } catch (error) {
    console.error("postTopicResult error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getTopicInterviewQuestions = async (req: Request, res: Response) => {
  try {
    const topicId = String(req.params.topicId ?? "");
    if (!topicId) return res.status(400).json({ message: "Invalid topicId" });

    const node = await prisma.roadmapNode.findUnique({
      where: { id: topicId },
      select: { id: true, title: true },
    });

    const baseTitle = node?.title ?? topicId;

    // If Gemini key is configured, generate a short theory + test and convert to Q&A.
    if (process.env.GEMINI_API_KEY) {
      try {
        const generated = await generateTopicContent(baseTitle, "Software Developer");
        const questions = Array.isArray(generated?.questions) ? generated.questions : [];
        const items = questions.slice(0, 6).map((q: any, idx: number) => ({
          id: `iq-${topicId}-${idx}`,
          topicId,
          question: safeString(q.question, `Вопрос ${idx + 1}`),
          answer:
            "Подумайте о ключевых понятиях темы и приведите короткий пример. " +
            "Если вы не уверены, вернитесь к теории и попробуйте сформулировать ответ своими словами.",
        }));
        return res.json(items);
      } catch {
        // fall through to static list
      }
    }

    return res.json([
      {
        id: `iq-${topicId}-1`,
        topicId,
        question: `Что такое «${baseTitle}» и зачем это нужно?`,
        answer: "Дайте определение, перечислите 2–3 ключевых свойства и приведите пример из практики.",
      },
      {
        id: `iq-${topicId}-2`,
        topicId,
        question: `Какие типичные ошибки встречаются в теме «${baseTitle}»?`,
        answer: "Опишите частые ошибки, причины и как их диагностировать/исправлять.",
      },
      {
        id: `iq-${topicId}-3`,
        topicId,
        question: `Как вы применяли «${baseTitle}» в проекте?`,
        answer: "Расскажите про задачу, выбранный подход, компромиссы и результат.",
      },
      {
        id: `iq-${topicId}-4`,
        topicId,
        question: `Какие альтернативы есть у «${baseTitle}» и когда их выбирать?`,
        answer: "Сравните 2–3 альтернативы по сложности, скорости разработки и поддержке.",
      },
    ]);
  } catch (error) {
    console.error("getTopicInterviewQuestions error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

