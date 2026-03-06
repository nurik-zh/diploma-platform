import type { Request, Response } from "express";
import { prisma } from "../prisma/client.js";

const verdictByScore = (score: number): "excellent" | "strong" | "good" | "needs_improvement" => {
  if (score >= 85) return "excellent";
  if (score >= 72) return "strong";
  if (score >= 55) return "good";
  return "needs_improvement";
};

const computePoints = (completedTopics: number, submissions: number) => completedTopics * 35 + submissions * 120;

const avatarFromName = (fullName: string) => (fullName.trim().slice(0, 1).toUpperCase() || "U");

export const getLeaderboard = async (req: Request, res: Response) => {
  try {
    const userId = Number(req.query.userId);
    if (!Number.isFinite(userId)) {
      return res.status(400).json({ message: "userId query param is required" });
    }

    const users = await prisma.user.findMany({
      select: { id: true, email: true, fullName: true, country: true, city: true, university: true },
      take: 50,
    });

    const progressByUser = await prisma.userProgress.groupBy({
      by: ["userId"],
      where: { status: "completed", userId: { in: users.map((u) => u.id) } },
      _count: { _all: true },
    });
    const progressMap = new Map(progressByUser.map((row) => [row.userId, row._count._all]));

    const submissionsByUser = await prisma.submission.groupBy({
      by: ["userId"],
      where: { userId: { in: users.map((u) => u.id) } },
      _count: { _all: true },
    });
    const submissionsMap = new Map(submissionsByUser.map((row) => [row.userId, row._count._all]));

    const leaders = users
      .map((u) => {
        const completedTopics = progressMap.get(u.id) ?? 0;
        const submissions = submissionsMap.get(u.id) ?? 0;
        const points = computePoints(completedTopics, submissions);
        const totalTests = Math.max(1, completedTopics);
        const passedTests = Math.round(totalTests * 0.7);
        const failedTests = totalTests - passedTests;

        return {
          userId: u.id,
          fullName: u.fullName ?? u.email.split("@")[0] ?? `User ${u.id}`,
          avatar: avatarFromName(u.fullName ?? u.email),
          country: u.country,
          city: u.city,
          university: u.university,
          points,
          completedTests: totalTests,
          passedTests,
          failedTests,
          roadmapProgressPercent: Math.min(100, Math.round((completedTopics / 30) * 100)),
          badges: points >= 1800 ? ["Fast Learner"] : ["Starter"],
          rank: 0,
        };
      })
      .sort((a, b) => b.points - a.points)
      .map((item, index) => ({ ...item, rank: index + 1 }));

    const currentUser = leaders.find((l) => l.userId === userId) ?? null;

    if (!currentUser) {
      const u = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, fullName: true, country: true, city: true, university: true },
      });
      if (!u) return res.status(404).json({ message: "User not found" });

      const completedTopics = await prisma.userProgress.count({ where: { userId, status: "completed" } });
      const submissions = await prisma.submission.count({ where: { userId } });
      const points = computePoints(completedTopics, submissions);
      const totalTests = Math.max(1, completedTopics);

      const entry = {
        userId: u.id,
        fullName: u.fullName ?? u.email.split("@")[0] ?? `User ${u.id}`,
        avatar: avatarFromName(u.fullName ?? u.email),
        country: u.country,
        city: u.city,
        university: u.university,
        points,
        completedTests: totalTests,
        passedTests: Math.round(totalTests * 0.7),
        failedTests: totalTests - Math.round(totalTests * 0.7),
        roadmapProgressPercent: Math.min(100, Math.round((completedTopics / 30) * 100)),
        badges: points >= 1800 ? ["Fast Learner"] : ["Starter"],
        rank: leaders.length + 1,
      };

      return res.json({ leaders, currentUser: entry });
    }

    return res.json({ leaders, currentUser });
  } catch (error) {
    console.error("getLeaderboard error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getCandidateWorkLeaderboard = async (req: Request, res: Response) => {
  try {
    const userId = Number(req.query.userId);
    if (!Number.isFinite(userId)) {
      return res.status(400).json({ message: "userId query param is required" });
    }

    const submissions = await prisma.submission.findMany({
      include: { task: { include: { vacancy: true } }, user: true },
      take: 500,
    });

    const byUser = new Map<number, typeof submissions>();
    for (const s of submissions) {
      (byUser.get(s.userId) ?? byUser.set(s.userId, []).get(s.userId)!).push(s);
    }

    const entries = [...byUser.entries()].map(([uid, items]) => {
      const latest = [...items].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
      const base = 55;
      const hasNotesBonus = items.some((i) => (i.notes ?? "").trim().length >= 20) ? 10 : 0;
      const hasGithubBonus = items.every((i) => i.githubUrl.includes("github")) ? 10 : 0;
      const countBonus = Math.min(20, items.length * 4);
      const averageQualityScore = Math.min(100, base + hasNotesBonus + hasGithubBonus + countBonus);
      const sentToHr = averageQualityScore >= 75;

      return {
        userId: uid,
        fullName: latest.user.fullName ?? latest.user.email.split("@")[0] ?? `User ${uid}`,
        avatar: avatarFromName(latest.user.fullName ?? latest.user.email),
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

    const currentUser = ranked.find((e) => e.userId === userId) ?? null;

    return res.json({ leaders: ranked, currentUser });
  } catch (error) {
    console.error("getCandidateWorkLeaderboard error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

