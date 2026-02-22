import { Response } from 'express';
import pkg from '@prisma/client';
import { getAIResponse } from '../services/aiService.js';
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

export const getRoadmaps = async (req: any, res: Response) => {
  const roadmaps = await prisma.roadmap.findMany();
  res.json(roadmaps);
};

export const getRoadmapTree = async (req: any, res: Response) => {
  const nodes = await prisma.roadmapNode.findMany({ orderBy: { orderIndex: 'asc' } });
  
  // Контракт: Record<string, RoadmapNode[]>
  const tree: Record<string, any[]> = {};
  nodes.forEach(node => {
    if (!tree[node.roadmapId]) tree[node.roadmapId] = [];
    tree[node.roadmapId].push({
      id: node.id,
      title: node.title,
      status: "locked" // Фронтенд үшін, прогрессті қоссаң 'in_progress' болады
    });
  });
  res.json(tree);
};

export const getRoadmapAssessment = async (req: any, res: Response) => {
  const { roadmapId } = req.params;
  // Mock assessment (бұрынғы quizData)
  res.json({
    roadmapId,
    title: "Бастапқы тест",
    questions: [
      {
        id: "q1",
        text: "HTML деген не?",
        options: [{ id: "1", label: "Тіл", score: 10 }, { id: "2", label: "Қате", score: 0 }]
      }
    ]
  });
};

export const submitAssessment = async (req: any, res: Response) => {
  const { roadmapId } = req.params;
  const { answers } = req.body; // Контракт: Record<string, number>
  const userId = req.user.userId;

  let score = Object.values(answers).reduce((a: any, b: any) => a + b, 0);
  const professionTitle = "Frontend Developer"; // roadmapId арқылы табуға болады
  const assignedLevel = score > 10 ? "Intermediate" : "Beginner";

  // 1. AI арқылы жеке бағыт құру
  const aiData = await getAIResponse(professionTitle, score);

  // 2. БД-ға Roadmap және Node-тарды сақтау
  let roadmap = await prisma.roadmap.findUnique({ where: { id: roadmapId } });
  if (!roadmap) {
    roadmap = await prisma.roadmap.create({
      data: { id: roadmapId, title: professionTitle, description: "AI Road", level: assignedLevel }
    });
  }

  await prisma.userRoadmap.create({
    data: { userId, roadmapId: roadmap.id, assignedLevel }
  });

  // AI-дан келген сабақтарды қосу
  for (let i = 0; i < aiData.roadmap.length; i++) {
    const item = aiData.roadmap[i];
    await prisma.roadmapNode.create({
      data: {
        roadmapId: roadmap.id,
        title: item.topic,
        description: item.task,
        orderIndex: i
      }
    });
  }

  // Контрактқа сай AssessmentSubmitResponse
  res.json({ roadmapId: roadmap.id, level: assignedLevel });
};