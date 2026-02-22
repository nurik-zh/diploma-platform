import { Response } from 'express';
import pkg from '@prisma/client';
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

export const getProfile = async (req: any, res: Response) => {
  try {
    const userId = req.user.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { progress: { where: { status: "completed" } } }
    });

    if (!user) return res.status(404).json({ message: "Пайдаланушы табылмады" });

    // ProfileResponse контрактқа сай
    res.json({
      id: user.id,
      fullName: user.fullName || "User",
      email: user.email,
      createdAt: user.createdAt.toISOString(),
      joinedAt: user.createdAt.toISOString(),
      country: user.country,
      city: user.city,
      university: user.university,
      firstLogin: user.firstLogin,
      completedTests: user.progress.length,
      skills: [], // Кейін прогресске қарай қосуға болады
      achievements: []
    });
  } catch (error) {
    res.status(500).json({ message: "Профиль қатесі" });
  }
};