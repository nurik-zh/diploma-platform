// profileController.ts
import { Response } from 'express';
import pkg from '@prisma/client';
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

export const getProfile = async (req: any, res: Response) => {
  try {
    // ӨЗГЕРІС: ID-ді міндетті түрде санға (Int) айналдырамыз
    const userId = parseInt(req.user.userId, 10); 

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { progress: { where: { status: "completed" } } }
    });

    if (!user) return res.status(404).json({ message: "Пайдаланушы табылмады" });

    // ProfileResponse контрактқа сай
    res.json({
      id: user.id,
      fullName: user.fullName || "Пайдаланушы",
      email: user.email,
      createdAt: user.createdAt.toISOString(),
      joinedAt: user.createdAt.toISOString(),
      country: user.country,
      city: user.city,
      university: user.university,
      firstLogin: user.firstLogin,
      completedTests: user.progress.length,
      skills: [], 
      achievements: []
    });
  } catch (error) {
    console.error("Profile error:", error); // Қатені консольден көру үшін қостық
    res.status(500).json({ message: "Профиль қатесі" });
  }
};