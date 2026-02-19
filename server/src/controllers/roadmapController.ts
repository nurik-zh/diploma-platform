import { Request, Response } from 'express';
import { getAIResponse } from '../services/aiService.js';
import pkg from '@prisma/client';
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

export const generateUserRoadmap = async (req: any, res: Response) => {
  try {
    const { profession, score } = req.body; // Фронтендтен келеді
    const userId = req.user.userId;

    // 1. Mock AI-дан Roadmap алу
    const aiData = await getAIResponse(profession, score);

    // 2. Дерекқорға (UserRoadmap) сақтау
    const newRoadmap = await prisma.userRoadmap.create({
      data: {
        userId: userId,
        profession: profession,
        level: score > 5 ? 'Middle' : 'Beginner', // Баллға байланысты деңгей
        content: aiData.roadmap,
      }
    });

    res.status(201).json(newRoadmap);
  } catch (error) {
    res.status(500).json({ error: "Roadmap жасау мүмкін болмады" });
  }
};