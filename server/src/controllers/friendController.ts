// controllers/friendController.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { generateChallengeQuiz } from '../services/aiService.js';

const prisma = new PrismaClient();

export const getFriends = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const friendships = await prisma.friendship.findMany({
      where: { userId: Number(userId) },
      include: { friend: true }
    });

    const formattedFriends = friendships.map(f => ({
      userId: f.friend.id,
      email: f.friend.email,
      fullName: f.friend.fullName || f.friend.email.split('@')[0],
      avatar: (f.friend.fullName?.[0] || f.friend.email[0]).toUpperCase(),
      country: f.friend.country,
      city: f.friend.city,
      points: 150, // Болашақта шынайы ұпай есептеледі
      roadmapProgressPercent: 45 // Болашақта шынайы прогресс есептеледі
    }));

    res.json(formattedFriends);
  } catch (error) {
    res.status(500).json({ error: "Қате орын алды" });
  }
};

export const addFriendByEmail = async (req: Request, res: Response) => {
  try {
    const userId = Number((req as any).user.userId);
    const { email } = req.body;

    const friend = await prisma.user.findUnique({ where: { email } });
    
    if (!friend) return res.status(404).json({ error: "Пайдаланушы табылмады" });
    if (friend.id === userId) return res.status(400).json({ error: "Өзіңізді дос ретінде қоса алмайсыз" });

    // Екі жақты достықты тексеру және құру
    // 1-ші бағыт: Мен -> Досым
    await prisma.friendship.upsert({
      where: { userId_friendId: { userId, friendId: friend.id } },
      update: {},
      create: { userId, friendId: friend.id }
    });

    // 2-ші бағыт: Досым -> Мен
    await prisma.friendship.upsert({
      where: { userId_friendId: { userId: friend.id, friendId: userId } },
      update: {},
      create: { userId: friend.id, friendId: userId }
    });

    return getFriends(req, res);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Дос қосу кезінде қате кетті" });
  }
};

export const removeFriend = async (req: Request, res: Response) => {
  try {
    const userId = Number((req as any).user.userId);
    const friendId = Number(req.params.friendId);

    // Екі бағытты да өшіру
    await prisma.friendship.deleteMany({
      where: {
        OR: [
          { userId, friendId },
          { userId: friendId, friendId: userId }
        ]
      }
    });

    return getFriends(req, res);
  } catch (error) {
    res.status(500).json({ error: "Өшіру кезінде қате кетті" });
  }
};

export const getFriendSuggestions = async (req: Request, res: Response) => { res.json([]); };

export const getGlobalItMap = async (req: Request, res: Response) => {
  try {
    const userId = Number((req as any).user.userId);
    
    // Барлық қолжетімді Roadmap-тарды алу
    const roadmaps = await prisma.roadmap.findMany({
      select: { id: true, title: true }
    });

    // Қолданушының өзін және оның достарын алу
    const friendships = await prisma.friendship.findMany({
      where: { userId },
      include: { friend: { include: { progress: true } } }
    });

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { progress: true }
    });

    // Қатысушылар тізімін құрастыру
    const participants = [currentUser, ...friendships.map(f => f.friend)].map(user => {
      if (!user) return null;
      
      // Әр бағыт бойынша прогресті есептеу (0-100)
      const roadmapProgress: Record<string, number> = {};
      roadmaps.forEach(r => {
        const scores = user.progress
          .filter(p => p.nodeId.startsWith(r.id)) // Шартты түрде
          .map(p => p.score);
        const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
        roadmapProgress[r.id] = avg;
      });

      return {
        userId: user.id,
        fullName: user.fullName || user.email,
        avatar: (user.fullName?.[0] || user.email[0]).toUpperCase(),
        isCurrentUser: user.id === userId,
        points: 100, // Уақытша
        overallProgressPercent: 50, // Уақытша
        roadmapProgress
      };
    }).filter(p => p !== null);

    res.json({
      roadmaps: roadmaps.map(r => ({ roadmapId: r.id, title: r.title })),
      participants
    });
  } catch (error) {
    res.status(500).json({ error: "Картаны жүктеу мүмкін болмады" });
  }
};

export const getChallenges = async (req: Request, res: Response) => {
  try {
    const userId = Number((req as any).user.userId);

    const challenges = await prisma.friendChallenge.findMany({
      where: {
        OR: [
          { challengerUserId: userId },
          { opponentUserId: userId }
        ]
      },
      orderBy: { createdAt: 'desc' },
      include: {
        challenger: true,
        opponent: true
      }
    });

    const formatted = challenges.map(c => ({
      id: c.id,
      challengerUserId: c.challengerUserId,
      opponentUserId: c.opponentUserId,
      opponentName: c.opponentUserId === userId ? c.challenger.fullName : c.opponent.fullName,
      roadmapId: c.roadmapId,
      roadmapTitle: "Frontend Development", // Немесе базадан алу
      quizData: c.quizData,
      challengerScore: c.challengerScore,
      challengerDurationSec: c.challengerDurationSec,
      opponentScore: c.opponentScore,
      opponentDurationSec: c.opponentDurationSec,
      winnerUserId: c.winnerUserId,
      status: c.status,
      createdAt: c.createdAt.toISOString(),
      completedAt: c.completedAt?.toISOString() || null,
      isNotificationRead: c.isNotificationRead
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: "Жарыстарды алу мүмкін болмады" });
  }
};

export const getNotifications = async (req: Request, res: Response) => {
  try {
    const userId = Number((req as any).user.userId);
    
    // 1. Шақырулар: Ағымдағы адам қарсылас (opponent) болатын және статусы күтудегі жарыстарды іздеу
    const pendingInvitations = await prisma.friendChallenge.findMany({
      where: {
        opponentUserId: userId,
        status: "waiting_opponent" // Күтіп тұрған шақырулар
      },
      include: { challenger: true }
    });

    const notifications = pendingInvitations.map(c => ({
      id: c.id,
      challengeId: c.id,
      challengerName: c.challenger.fullName || c.challenger.email,
      roadmapTitle: c.roadmapTitle,
      createdAt: c.createdAt.toISOString()
    }));

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: "Хабарламаларды алу қатесі" });
  }
};

export const markNotificationRead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.friendChallenge.update({
      where: { id },
      data: { isNotificationRead: true }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Қате орын алды" });
  }
};

export const createChallenge = async (req: Request, res: Response) => {
  try {
    const userId = Number((req as any).user.userId);
    const { opponentUserId, roadmapId, roadmapTitle, challengerScore, challengerDurationSec } = req.body;

    // AI-дан сұрақтарды алдын-ала алу
    const aiQuiz = await generateChallengeQuiz(roadmapTitle);
    if (!aiQuiz || !aiQuiz.questions) {
      return res.status(500).json({ error: "ЖИ тест дайындай алмады" });
    }

    const challenge = await prisma.friendChallenge.create({
      data: {
        challengerUserId: userId,
        opponentUserId: Number(opponentUserId),
        roadmapId,
        roadmapTitle,
        quizData: aiQuiz.questions,
        challengerScore: Number(challengerScore), // Бірінші адамның ұпайы бірден сақталады
        challengerDurationSec: Number(challengerDurationSec),
        status: "waiting_opponent"
      }
    });

    res.json(challenge);
  } catch (error) {
    res.status(500).json({ error: "Жарыс құру мүмкін болмады" });
  }
};

export const completeChallenge = async (req: Request, res: Response) => {
  try {
    const userId = Number((req as any).user.userId);
    // Фронтенд қандай атаумен жіберсе де қабылдайтындай жасаймыз:
    const challengeId = req.body.challengeId;
    const score = Number(req.body.score ?? req.body.opponentScore ?? 0);
    const durationSec = Number(req.body.durationSec ?? req.body.opponentDurationSec ?? 0);

    const challenge = await prisma.friendChallenge.findUnique({
      where: { id: challengeId }
    });

    if (!challenge) return res.status(404).json({ error: "Жарыс табылмады" });

    // КІМ ТАПСЫРЫП ЖАТЫР? (Бірінші адам ба, әлде екінші ме?)
    const isChallenger = challenge.challengerUserId === userId;

    if (isChallenger) {
      // 1. Егер бұл ВЫЗОВ тастаған адам болса:
      const updated = await prisma.friendChallenge.update({
        where: { id: challengeId },
        data: {
          challengerScore: score,
          challengerDurationSec: durationSec
        }
      });
      return res.json(updated);

    } else {
        // 2. Егер бұл ВЫЗОВТЫ ҚАБЫЛДАҒАН адам болса:
      // 2. Егер бұл ВЫЗОВТЫ ҚАБЫЛДАҒАН адам болса (Opponent)
        let winnerUserId = null;

        if (score > challenge.challengerScore) {
        // Екінші адамның ұпайы көп
        winnerUserId = userId; 
        } else if (score < challenge.challengerScore) {
        // Бірінші адамның ұпайы көп
        winnerUserId = challenge.challengerUserId;
        } else {
        // ҰПАЙЛАР ТЕҢ БОЛҒАНДА (мысалы, екеуі де 0%)
        // Уақытты салыстырамыз: кім аз уақыт жұмсаса, сол жеңеді
        if (durationSec < challenge.challengerDurationSec) {
            winnerUserId = userId; // Екінші адам тезірек бітірді
        } else {
            winnerUserId = challenge.challengerUserId; // Бірінші адам тезірек бітірді
        }
        }

        const updated = await prisma.friendChallenge.update({
        where: { id: challengeId },
        data: {
          opponentScore: score,
          opponentDurationSec: durationSec,
          winnerUserId: winnerUserId,
          status: "completed",
          completedAt: new Date()
        }
      });
      return res.json(updated);
    }
  } catch (error) {
    console.error("Сақтау қатесі:", error);
    res.status(500).json({ error: "Нәтижені сақтау мүмкін болмады" });
  }
};

export const searchUsers = async (req: Request, res: Response) => {
  try {
    const userId = Number((req as any).user.userId);
    const query = req.query.q as string;

    // Егер іздеу жолы бос болса, бос массив қайтарамыз
    if (!query || query.trim() === "") {
      return res.json([]);
    }

    // 1. Ағымдағы достарды табу (оларды іздеу нәтижесінде көрсетпеу үшін)
    const existingFriends = await prisma.friendship.findMany({
      where: { userId },
      select: { friendId: true }
    });
    
    const excludeIds = existingFriends.map(f => f.friendId);
    excludeIds.push(userId); // Өзін де тізімнен алып тастаймыз

    // 2. Базадан аты немесе email-і бойынша іздеу
    const users = await prisma.user.findMany({
      where: {
        id: { notIn: excludeIds }, // Достарды және өзін қоспаймыз
        OR: [
          { email: { contains: query, mode: "insensitive" } },
          { fullName: { contains: query, mode: "insensitive" } }
        ]
      },
      take: 5 // Тек алғашқы 5 адамды шығарамыз
    });

    const formattedUsers = users.map(user => ({
      userId: user.id,
      email: user.email,
      fullName: user.fullName || user.email.split('@')[0],
      avatar: (user.fullName?.[0] || user.email[0]).toUpperCase(),
    }));

    res.json(formattedUsers);
  } catch (error) {
    console.error("Іздеу кезінде қате кетті:", error);
    res.status(500).json({ error: "Іздеу кезінде қате кетті" });
  }
};