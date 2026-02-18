import { Request, Response } from 'express';
import pkg from '@prisma/client';
const { PrismaClient } = pkg;

const prisma = new PrismaClient();

export const getProfile = async (req: any, res: Response) => {
  try {
    const userId = req.user.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        // Прогрессті бірге есептеп алу
        _count: {
          select: { progress: true } // Неше тапсырма бітіргені
        }
      }
    });

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Профильді алу мүмкін болмады" });
  }
};