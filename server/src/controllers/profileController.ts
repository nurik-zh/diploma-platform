import type { Response } from "express";
import { prisma } from "../prisma/client.js";
import type { AuthRequest } from "../middleware/authMiddleware.js";

const asIso = (value: Date) => value.toISOString();

const fallbackFullName = (email: string) => {
  const prefix = email.split("@")[0]?.trim();
  return prefix ? prefix : "User";
};

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = Number(req.userId);
    if (!Number.isFinite(userId)) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ message: "User not found" });

    const completedTests = await prisma.userProgress.count({
      where: { userId, status: "completed" },
    });

    return res.json({
      id: user.id,
      fullName: user.fullName ?? fallbackFullName(user.email),
      email: user.email,
      createdAt: asIso(user.createdAt),
      joinedAt: asIso(user.createdAt),
      country: user.country,
      city: user.city,
      university: user.university,
      firstLogin: user.firstLogin,
      completedTests,
      skills: [],
      achievements: [],
    });
  } catch (error) {
    console.error("getProfile error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = Number(req.userId);
    if (!Number.isFinite(userId)) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { fullName, country, city, university } = req.body ?? {};

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(fullName !== undefined ? { fullName: String(fullName) } : {}),
        ...(country !== undefined ? { country: String(country) } : {}),
        ...(city !== undefined ? { city: String(city) } : {}),
        ...(university !== undefined ? { university: String(university) } : {}),
        firstLogin: false,
      },
    });

    const completedTests = await prisma.userProgress.count({
      where: { userId, status: "completed" },
    });

    return res.json({
      id: updated.id,
      fullName: updated.fullName ?? fallbackFullName(updated.email),
      email: updated.email,
      createdAt: asIso(updated.createdAt),
      joinedAt: asIso(updated.createdAt),
      country: updated.country,
      city: updated.city,
      university: updated.university,
      firstLogin: updated.firstLogin,
      completedTests,
      skills: [],
      achievements: [],
    });
  } catch (error: any) {
    console.error("updateProfile error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

