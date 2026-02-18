import { Request, Response } from 'express';
import { getAIResponse } from '../services/aiService.js';
import pkg from '@prisma/client';
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

export const generateUserRoadmap = async (req: any, res: Response) => {
  try {
    const { profession, score } = req.body;
    const userId = req.user.userId; // Middleware-ден келген ID

    // 1. AI-дан Roadmap алу
    const aiData = await getAIResponse(profession, score);

    // 2. Дерекқорға сақтау
    const newRoadmap = await prisma.userRoadmap.create({
      data: {
        userId: userId,
        profession: profession,
        level: score > 4 ? 'Middle' : 'Beginner',
        content: aiData.roadmap,
      }
    });

    res.status(201).json(newRoadmap);
  } catch (error) {
    res.status(500).json({ error: "Roadmap жасау кезінде қате кетті" });
  }
};