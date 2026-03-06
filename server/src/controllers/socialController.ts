import type { Request, Response } from "express";
import { prisma } from "../prisma/client.js";

type FriendChallengeStatus = "waiting_opponent" | "completed";

interface FriendChallenge {
  id: string;
  challengerUserId: number;
  opponentUserId: number;
  opponentName: string;
  roadmapId: string;
  roadmapTitle: string;
  challengerScore: number;
  challengerDurationSec: number;
  opponentScore: number | null;
  opponentDurationSec: number | null;
  winnerUserId: number | null;
  status: FriendChallengeStatus;
  createdAt: string;
  completedAt: string | null;
  isNotificationRead: boolean;
}

const CHALLENGE_RESOLVE_MS = 45_000;

const friendsDb = new Map<number, Set<number>>();
const challengesDb = new Map<number, FriendChallenge[]>();

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const avatar = (name: string) => (name.trim().slice(0, 1).toUpperCase() || "U");

const safeUserId = (req: Request) => {
  const userId = Number(req.params.userId);
  return Number.isFinite(userId) ? userId : null;
};

const hashText = (text: string) => {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash;
};

const toDurationSec = (score: number, seed: number) => {
  const adjusted = 150 + (100 - score) * 4 + (seed % 80);
  return Math.max(90, adjusted);
};

const resolvePendingChallenges = (challenges: FriendChallenge[]) => {
  const now = Date.now();
  let changed = false;

  const resolved = challenges.map((challenge) => {
    if (challenge.status !== "waiting_opponent") return challenge;
    const elapsed = now - new Date(challenge.createdAt).getTime();
    if (elapsed < CHALLENGE_RESOLVE_MS) return challenge;

    const seed = hashText(`${challenge.id}:${challenge.opponentUserId}`);
    const opponentScore = clamp(50 + (seed % 19) - 9, 1, 100);
    const opponentDurationSec = toDurationSec(opponentScore, seed + 19);

    let winnerUserId: number | null = null;
    if (opponentScore > challenge.challengerScore) winnerUserId = challenge.opponentUserId;
    else if (opponentScore < challenge.challengerScore) winnerUserId = challenge.challengerUserId;
    else if (opponentDurationSec < challenge.challengerDurationSec) winnerUserId = challenge.opponentUserId;
    else if (opponentDurationSec > challenge.challengerDurationSec) winnerUserId = challenge.challengerUserId;

    changed = true;
    return {
      ...challenge,
      status: "completed" as const,
      opponentScore,
      opponentDurationSec,
      winnerUserId,
      completedAt: new Date(now).toISOString(),
      isNotificationRead: false,
    };
  });

  return { resolved, changed };
};

const computeUserRoadmapProgressMap = async (userId: number): Promise<Record<string, number>> => {
  const collection = await prisma.userRoadmap.findMany({ where: { userId }, select: { roadmapId: true } });
  const roadmapIds = collection.map((r) => r.roadmapId);
  if (!roadmapIds.length) return {};

  const nodes = await prisma.roadmapNode.findMany({
    where: { roadmapId: { in: roadmapIds } },
    select: { id: true, roadmapId: true },
  });
  const nodesByRoadmap = nodes.reduce<Record<string, string[]>>((acc, node) => {
    (acc[node.roadmapId] ??= []).push(node.id);
    return acc;
  }, {});

  const completed = await prisma.userProgress.findMany({
    where: { userId, status: "completed" },
    select: { nodeId: true },
  });
  const completedSet = new Set(completed.map((c) => c.nodeId));

  const progress: Record<string, number> = {};
  for (const roadmapId of roadmapIds) {
    const nodeIds = nodesByRoadmap[roadmapId] ?? [];
    const total = nodeIds.length;
    const done = nodeIds.filter((id) => completedSet.has(id)).length;
    progress[roadmapId] = total ? Math.round((done / total) * 100) : 0;
  }
  return progress;
};

const averageProgress = (map: Record<string, number>) => {
  const values = Object.values(map);
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
};

export const getFriends = async (req: Request, res: Response) => {
  try {
    const userId = safeUserId(req);
    if (!userId) return res.status(400).json({ message: "Invalid userId" });

    const friendIds = [...(friendsDb.get(userId) ?? new Set<number>())];
    if (!friendIds.length) return res.json([]);

    const users = await prisma.user.findMany({
      where: { id: { in: friendIds } },
      select: { id: true, email: true, fullName: true, country: true, city: true, university: true },
    });

    const profiles = await Promise.all(
      users.map(async (u) => {
        const roadmapProgress = await computeUserRoadmapProgressMap(u.id);
        const roadmapProgressPercent = averageProgress(roadmapProgress);
        return {
          userId: u.id,
          fullName: u.fullName ?? u.email.split("@")[0] ?? `User ${u.id}`,
          email: u.email,
          avatar: avatar(u.fullName ?? u.email),
          country: u.country,
          city: u.city,
          university: u.university,
          points: roadmapProgressPercent * 20,
          roadmapProgressPercent,
          roadmapProgress,
        };
      }),
    );

    return res.json(profiles);
  } catch (error) {
    console.error("getFriends error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getFriendSuggestions = async (req: Request, res: Response) => {
  try {
    const userId = safeUserId(req);
    if (!userId) return res.status(400).json({ message: "Invalid userId" });

    const current = friendsDb.get(userId) ?? new Set<number>();
    const users = await prisma.user.findMany({
      where: { id: { not: userId } },
      select: { id: true, email: true, fullName: true, country: true, city: true, university: true },
      take: 20,
    });

    const candidates = users.filter((u) => !current.has(u.id));

    const profiles = await Promise.all(
      candidates.map(async (u) => {
        const roadmapProgress = await computeUserRoadmapProgressMap(u.id);
        const roadmapProgressPercent = averageProgress(roadmapProgress);
        return {
          userId: u.id,
          fullName: u.fullName ?? u.email.split("@")[0] ?? `User ${u.id}`,
          email: u.email,
          avatar: avatar(u.fullName ?? u.email),
          country: u.country,
          city: u.city,
          university: u.university,
          points: roadmapProgressPercent * 20,
          roadmapProgressPercent,
          roadmapProgress,
        };
      }),
    );

    return res.json(profiles);
  } catch (error) {
    console.error("getFriendSuggestions error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const addFriendByEmail = async (req: Request, res: Response) => {
  try {
    const userId = safeUserId(req);
    if (!userId) return res.status(400).json({ message: "Invalid userId" });

    const email = String(req.body?.email ?? "").trim().toLowerCase();
    if (!email) return res.status(400).json({ message: "email is required" });

    const friend = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!friend) return res.status(404).json({ message: "User with this email not found" });
    if (friend.id === userId) return res.status(400).json({ message: "Cannot add yourself" });

    const set = friendsDb.get(userId) ?? new Set<number>();
    set.add(friend.id);
    friendsDb.set(userId, set);

    return getFriends(req, res);
  } catch (error) {
    console.error("addFriendByEmail error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const removeFriend = async (req: Request, res: Response) => {
  try {
    const userId = safeUserId(req);
    if (!userId) return res.status(400).json({ message: "Invalid userId" });

    const friendUserId = Number(req.params.friendUserId);
    if (!Number.isFinite(friendUserId)) return res.status(400).json({ message: "Invalid friendUserId" });

    const set = friendsDb.get(userId);
    set?.delete(friendUserId);
    return getFriends(req, res);
  } catch (error) {
    console.error("removeFriend error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getGlobalItMap = async (req: Request, res: Response) => {
  try {
    const userId = safeUserId(req);
    if (!userId) return res.status(400).json({ message: "Invalid userId" });

    const friendIds = [...(friendsDb.get(userId) ?? new Set<number>())];
    const ids = [userId, ...friendIds];

    const users = await prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, email: true, fullName: true },
    });

    const roadmaps = await prisma.roadmap.findMany({
      select: { id: true, title: true },
      orderBy: { title: "asc" },
      take: 50,
    });

    const participants = await Promise.all(
      users.map(async (u) => {
        const roadmapProgress = await computeUserRoadmapProgressMap(u.id);
        const overallProgressPercent = averageProgress(roadmapProgress);
        const points = overallProgressPercent * 20;

        return {
          userId: u.id,
          fullName: u.fullName ?? u.email.split("@")[0] ?? `User ${u.id}`,
          avatar: avatar(u.fullName ?? u.email),
          isCurrentUser: u.id === userId,
          points,
          overallProgressPercent,
          roadmapProgress,
        };
      }),
    );

    return res.json({
      roadmaps: roadmaps.map((r) => ({ roadmapId: r.id, title: r.title })),
      participants,
    });
  } catch (error) {
    console.error("getGlobalItMap error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getFriendChallenges = async (req: Request, res: Response) => {
  try {
    const userId = safeUserId(req);
    if (!userId) return res.status(400).json({ message: "Invalid userId" });

    const current = challengesDb.get(userId) ?? [];
    const { resolved, changed } = resolvePendingChallenges(current);
    if (changed) challengesDb.set(userId, resolved);

    const sorted = [...resolved].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return res.json(sorted);
  } catch (error) {
    console.error("getFriendChallenges error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const createFriendChallenge = async (req: Request, res: Response) => {
  try {
    const userId = safeUserId(req);
    if (!userId) return res.status(400).json({ message: "Invalid userId" });

    const opponentUserId = Number(req.body?.opponentUserId);
    const roadmapId = String(req.body?.roadmapId ?? "");
    const challengerScore = clamp(Math.round(Number(req.body?.challengerScore ?? 0)), 1, 100);
    const challengerDurationSec = Math.max(1, Math.round(Number(req.body?.challengerDurationSec ?? 1)));

    if (!Number.isFinite(opponentUserId) || !roadmapId) {
      return res.status(400).json({ message: "Invalid payload" });
    }

    const opponent = await prisma.user.findUnique({
      where: { id: opponentUserId },
      select: { fullName: true, email: true },
    });
    if (!opponent) return res.status(404).json({ message: "Opponent not found" });

    const roadmap = await prisma.roadmap.findUnique({ where: { id: roadmapId }, select: { title: true } });
    const roadmapTitle = roadmap?.title ?? roadmapId;

    const challenge: FriendChallenge = {
      id: `friend-challenge-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      challengerUserId: userId,
      opponentUserId,
      opponentName: opponent.fullName ?? opponent.email.split("@")[0] ?? `User ${opponentUserId}`,
      roadmapId,
      roadmapTitle,
      challengerScore,
      challengerDurationSec,
      opponentScore: null,
      opponentDurationSec: null,
      winnerUserId: null,
      status: "waiting_opponent",
      createdAt: new Date().toISOString(),
      completedAt: null,
      isNotificationRead: true,
    };

    const current = challengesDb.get(userId) ?? [];
    const { resolved } = resolvePendingChallenges(current);
    challengesDb.set(userId, [...resolved, challenge]);

    return res.status(201).json(challenge);
  } catch (error) {
    console.error("createFriendChallenge error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getFriendChallengeNotifications = async (req: Request, res: Response) => {
  try {
    const userId = safeUserId(req);
    if (!userId) return res.status(400).json({ message: "Invalid userId" });

    const current = challengesDb.get(userId) ?? [];
    const { resolved, changed } = resolvePendingChallenges(current);
    if (changed) challengesDb.set(userId, resolved);

    const notifications = resolved
      .filter((c) => c.status === "completed" && !c.isNotificationRead)
      .sort((a, b) => (b.completedAt ?? b.createdAt).localeCompare(a.completedAt ?? a.createdAt))
      .map((c) => ({
        id: c.id,
        challengeId: c.id,
        message:
          c.winnerUserId === null
            ? `Ничья в вызове по «${c.roadmapTitle}».`
            : c.winnerUserId === userId
              ? `Вы выиграли вызов по «${c.roadmapTitle}».`
              : `${c.opponentName} выиграл(а) вызов по «${c.roadmapTitle}».`,
        createdAt: c.completedAt ?? c.createdAt,
      }));

    return res.json(notifications);
  } catch (error) {
    console.error("getFriendChallengeNotifications error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const markFriendChallengeNotificationRead = async (req: Request, res: Response) => {
  try {
    const userId = safeUserId(req);
    if (!userId) return res.status(400).json({ message: "Invalid userId" });
    const challengeId = String(req.params.challengeId ?? "");
    if (!challengeId) return res.status(400).json({ message: "Invalid challengeId" });

    const current = challengesDb.get(userId) ?? [];
    challengesDb.set(
      userId,
      current.map((c) => (c.id === challengeId ? { ...c, isNotificationRead: true } : c)),
    );

    return res.json({ success: true });
  } catch (error) {
    console.error("markFriendChallengeNotificationRead error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

