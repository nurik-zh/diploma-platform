import type { Request, Response } from "express";
import { prisma } from "../prisma/client.js";

const clampInt = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Math.floor(value)));

const toDay = (date: Date) => date.toISOString().slice(0, 10);

const activityLevelFromCount = (count: number): 0 | 1 | 2 | 3 | 4 => {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 6) return 3;
  return 4;
};

const parseUserIdParam = (req: Request) => {
  const userId = Number(req.params.userId);
  return Number.isFinite(userId) ? userId : null;
};

export const getUserRoadmapCollection = async (req: Request, res: Response) => {
  try {
    const userId = parseUserIdParam(req);
    if (!userId) return res.status(400).json({ message: "Invalid userId" });

    const rows = await prisma.userRoadmap.findMany({
      where: { userId },
      select: { roadmapId: true },
      orderBy: { createdAt: "asc" },
    });

    return res.json(rows.map((row) => row.roadmapId));
  } catch (error) {
    console.error("getUserRoadmapCollection error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateUserRoadmapCollection = async (req: Request, res: Response) => {
  try {
    const userId = parseUserIdParam(req);
    if (!userId) return res.status(400).json({ message: "Invalid userId" });

    const roadmapIds: unknown = req.body?.roadmapIds;
    if (!Array.isArray(roadmapIds)) {
      return res.status(400).json({ message: "roadmapIds must be an array" });
    }

    const normalized = [...new Set(roadmapIds.map((id) => String(id)).filter(Boolean))];

    await prisma.$transaction(async (tx) => {
      await tx.userRoadmap.deleteMany({ where: { userId } });
      if (!normalized.length) return;

      await tx.userRoadmap.createMany({
        data: normalized.map((roadmapId) => ({
          userId,
          roadmapId,
          assignedLevel: "Beginner",
        })),
      });
    });

    return res.json(normalized);
  } catch (error) {
    console.error("updateUserRoadmapCollection error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const removeUserRoadmapFromCollection = async (req: Request, res: Response) => {
  try {
    const userId = parseUserIdParam(req);
    if (!userId) return res.status(400).json({ message: "Invalid userId" });

    const roadmapId = String(req.params.roadmapId ?? "");
    if (!roadmapId) return res.status(400).json({ message: "Invalid roadmapId" });

    await prisma.userRoadmap.deleteMany({ where: { userId, roadmapId } });

    const rows = await prisma.userRoadmap.findMany({
      where: { userId },
      select: { roadmapId: true },
      orderBy: { createdAt: "asc" },
    });

    return res.json(rows.map((row) => row.roadmapId));
  } catch (error) {
    console.error("removeUserRoadmapFromCollection error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getRoadmapProgress = async (req: Request, res: Response) => {
  try {
    const userId = parseUserIdParam(req);
    if (!userId) return res.status(400).json({ message: "Invalid userId" });

    const collection = await prisma.userRoadmap.findMany({
      where: { userId },
      select: { roadmapId: true },
    });
    const roadmapIds = collection.map((row) => row.roadmapId);

    if (!roadmapIds.length) return res.json([]);

    const nodes = await prisma.roadmapNode.findMany({
      where: { roadmapId: { in: roadmapIds } },
      select: { id: true, roadmapId: true },
    });

    const nodesByRoadmap = nodes.reduce<Record<string, string[]>>((acc, node) => {
      (acc[node.roadmapId] ??= []).push(node.id);
      return acc;
    }, {});

    const progresses = await prisma.userProgress.findMany({
      where: { userId, status: "completed" },
      select: { nodeId: true },
    });
    const completedSet = new Set(progresses.map((p) => p.nodeId));

    const result = roadmapIds.map((roadmapId) => {
      const nodeIds = nodesByRoadmap[roadmapId] ?? [];
      const totalTopics = nodeIds.length;
      const completedTopics = nodeIds.filter((id) => completedSet.has(id)).length;
      const completionPercent = totalTopics ? Math.round((completedTopics / totalTopics) * 100) : 0;

      return {
        roadmapId,
        completionPercent,
        completedTopics,
        totalTopics,
      };
    });

    return res.json(result);
  } catch (error) {
    console.error("getRoadmapProgress error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getUserYearActivity = async (req: Request, res: Response) => {
  try {
    const userId = parseUserIdParam(req);
    if (!userId) return res.status(400).json({ message: "Invalid userId" });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const since = new Date(today);
    since.setDate(since.getDate() - 364);

    const [progressEvents, submissions] = await Promise.all([
      prisma.userProgress.findMany({
        where: { userId, updatedAt: { gte: since } },
        select: { updatedAt: true },
      }),
      prisma.submission.findMany({
        where: { userId, createdAt: { gte: since } },
        select: { createdAt: true },
      }),
    ]);

    const countsByDay = new Map<string, number>();
    const bump = (key: string, value = 1) => countsByDay.set(key, (countsByDay.get(key) ?? 0) + value);

    for (const item of progressEvents) bump(toDay(item.updatedAt), 1);
    for (const item of submissions) bump(toDay(item.createdAt), 2);

    const days: Array<{ date: string; level: 0 | 1 | 2 | 3 | 4 }> = [];
    for (let i = 0; i < 365; i += 1) {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      const key = toDay(d);
      const count = countsByDay.get(key) ?? 0;
      days.push({ date: key, level: activityLevelFromCount(clampInt(count, 0, 12)) });
    }

    return res.json(days);
  } catch (error) {
    console.error("getUserYearActivity error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

