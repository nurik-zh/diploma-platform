import type { Request, Response } from "express";
import { prisma } from "../prisma/client.js";

export const getRoadmaps = async (_req: Request, res: Response) => {
  try {
    const roadmaps = await prisma.roadmap.findMany({
      select: { id: true, title: true, description: true, level: true, recommended: true },
      orderBy: [{ recommended: "desc" }, { title: "asc" }],
      take: 500,
    });

    return res.json(roadmaps);
  } catch (error) {
    console.error("getRoadmaps error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getRoadmapTree = async (_req: Request, res: Response) => {
  // Frontend currently uses local mocks for trees; keep endpoint for future compatibility.
  return res.json({});
};

