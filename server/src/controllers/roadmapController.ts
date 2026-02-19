import { Request, Response } from 'express';
import { getAIResponse } from '../services/aiService.js';
import pkg from '@prisma/client';
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

// src/controllers/roadmapController.ts
export const generateUserRoadmap = async (req: any, res: Response) => {
  try {
    const { profession, score } = req.body;
    const userId = req.user.userId;

    const aiData = await getAIResponse(profession, score);

    const newRoadmap = await prisma.userRoadmap.create({
      data: {
        userId: userId,
        profession: profession,
        level: score >= 8 ? 'Middle' : 'Beginner', // А нүктесі
        content: aiData, // AI-дан келген толық жол (Path summary-мен бірге)
      }
    });

    // RoadmapNode-тарды құру (Duolingo шарлары)
    const nodes = await Promise.all(
      aiData.roadmap.map(async (item: any, index: number) => {
        return await prisma.roadmapNode.create({
          data: {
            title: item.topic,
            description: item.task,
            orderIndex: index,
            theory: `Апта: ${item.week}. Мақсат: ${item.milestone}`
          }
        });
      })
    );

    res.status(201).json({ 
      message: "А-дан Б-ға жол құрылды",
      summary: aiData.path_summary,
      roadmap: newRoadmap, 
      nodes 
    });
  } catch (error) {
    res.status(500).json({ error: "Roadmap жасау мүмкін болмады" });
  }
};