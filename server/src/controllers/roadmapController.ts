import { Response } from 'express';
import pkg from '@prisma/client';
import { getAIResponse, generateCustomRoadmap, generateAssessmentQuestions, // ЖАҢА
  evaluateAssessmentAnswers } from '../services/aiService.js';
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

export const getRoadmaps = async (req: any, res: Response) => {
  try {
    const userId = req.user?.userId ? parseInt(req.user.userId, 10) : null;
    const allRoadmaps = await prisma.roadmap.findMany();

    if (userId) {
      // Қолданушының өзіне тиесілі бағыттар тізімін алу
      const userRoadmapLinks = await prisma.userRoadmap.findMany({ 
        where: { userId } 
      });
      const userRoadmapIds = userRoadmapLinks.map(ur => ur.roadmapId);

      // Басқа адамдардың "ai_" префиксі бар бағыттарын жалпы каталогтан жасыру
      // (Яғни, стандарттыларды ЖӘНЕ тек өзі қосқан AI бағыттарын ғана қалдырамыз)
      const filtered = allRoadmaps.filter(r => 
        !r.id.startsWith("ai_") || userRoadmapIds.includes(r.id)
      );
      return res.json(filtered);
    }

    // Авторизациясыз сұрау болса, тек қана стандартты бағыттар жіберіледі
    const filtered = allRoadmaps.filter(r => !r.id.startsWith("ai_"));
    res.json(filtered);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Roadmaps алу қатесі" });
  }
};

export const getRoadmapTree = async (req: any, res: Response) => {
  try {
    const userId = req.user.userId

    const nodes = await prisma.roadmapNode.findMany({
      orderBy: { orderIndex: 'asc' }
    })

    // получить прогресс пользователя
    const progress = await prisma.userProgress.findMany({
      where: { userId }
    })

    const tree: Record<string, any[]> = {}

    for (const node of nodes) {

      let userNodeProgress = progress.find(p => p.nodeId === node.id)

      // если прогресса нет и это первая тема roadmap → открыть её
      if (!userNodeProgress) {
        const firstNode = await prisma.roadmapNode.findFirst({
          where: { roadmapId: node.roadmapId },
          orderBy: { orderIndex: "asc" }
        })

        if (firstNode?.id === node.id) {
          userNodeProgress = await prisma.userProgress.create({
            data: {
              userId,
              nodeId: node.id,
              status: "not_started"
            }
          })
        }
      }

      if (!tree[node.roadmapId]) tree[node.roadmapId] = []

      tree[node.roadmapId].push({
        ...node,
        status: userNodeProgress?.status ?? "locked"
      })
    }

    res.json(tree)

  } catch (error) {
    console.error(error)
    res.status(500).json({ error: "Roadmap tree error" })
  }
}

export const getRoadmapAssessment = async (req: any, res: Response) => {
  const { roadmapId } = req.params;
  try {
    
    
    // Базадан бағыттың атын алу (AI-ға тақырыпты жіберу үшін)
    const roadmap = await prisma.roadmap.findUnique({ where: { id: roadmapId } });
    
    if (!roadmap) {
      return res.status(404).json({ error: "Roadmap табылмады" });
    }

    // AI арқылы нақты осы бағытқа сұрақтар генерациялау
    const aiQuestions = await generateAssessmentQuestions(roadmap.title);

    // Фронтендке сұрақтарды қайтару
    res.json({
      roadmapId,
      title: `${roadmap.title} бойынша білімді бағалау`,
      theoryQuestions: aiQuestions.theoryQuestions,
      writtenQuestions: aiQuestions.writtenQuestions,
      questions: aiQuestions.questions || []
    });

  } catch (error) {
    console.error("Ассессмент генерациялау қатесі:", error);
    
    // ЕГЕР AI ІСТЕМЕЙ ҚАЛСА (Конфликт болмас үшін Fallback/Mock дерек қайтарамыз)
    res.json({
      roadmapId,
      title: "Бастапқы тест (Резервтік)",
      theoryQuestions: ["HTML деген не?", "CSS деген не?"],
      writtenQuestions: [
        { id: "wq1", text: "React пен Vue айырмашылығын жазыңыз", placeholder: "Жауап...", hint: "", keywords: [] }
      ]
    });
  }
};

export const submitAssessment = async (req: any, res: Response) => {
  try {
    const { roadmapId } = req.params;
    const userId = parseInt(req.user.userId, 10);
    
    // Фронтендтен келетін деректер (Жаңа формат немесе Ескі формат болуы мүмкін)
    const { theoryScore, writtenAnswers, answers } = req.body;

    let finalScore = 0;
    let assignedLevel = "Junior";
    let aiFeedback = "Бастапқы деңгей";

    // 1-ЖАҒДАЙ: ЖАҢА AI ФОРМАТЫ КЕЛСЕ (theoryScore + writtenAnswers)
    if (writtenAnswers && Array.isArray(writtenAnswers)) {
      const roadmap = await prisma.roadmap.findUnique({ where: { id: roadmapId } });
      
      if (roadmap) {
        // AI арқылы жазбаша мәтінді бағалау
        const evaluation = await evaluateAssessmentAnswers(roadmap.title, writtenAnswers);
        
        finalScore = (theoryScore || 0) + (evaluation.aiScore || 0);
        assignedLevel = evaluation.levelLabel || "Junior";
        aiFeedback = evaluation.feedback || "Бағаланды";
      }
    } 
    // 2-ЖАҒДАЙ: ЕСКІ ФОРМАТ КЕЛСЕ (Конфликтті болдырмау үшін)
    else if (answers) {
      finalScore = Object.values(answers).reduce((a: any, b: any) => a + b, 0) as number;
      assignedLevel = finalScore > 10 ? "Middle" : "Junior";
    }

    const existingSkill = await prisma.userSkillLevel.findFirst({
      where: { userId, roadmapId }
    });

    const finalScoreInt = Math.floor(Number(finalScore) || 0);

    if (existingSkill) {
      await prisma.userSkillLevel.update({
        where: { id: existingSkill.id },
        data: { levelLabel: assignedLevel, score: finalScoreInt }
      });
    } else {
      await prisma.userSkillLevel.create({
        data: { userId, roadmapId, levelLabel: assignedLevel, score: finalScore }
      });
    }

    const existingRoadmap = await prisma.userRoadmap.findFirst({
      where: { userId, roadmapId }
    });
    if (!existingRoadmap) {
      // Егер бұл бағыт тізімде жоқ болса, оны жаңадан қосамыз
      await prisma.userRoadmap.create({
        data: {
          userId,
          roadmapId,
          assignedLevel
        }
      });
    } else {
      // Егер бар болса, деңгейін ғана жаңартамыз (мысалы Junior-дан Middle-ге өтсе)
      await prisma.userRoadmap.update({
        where: { id: existingRoadmap.id },
        data: { assignedLevel }
      });
    }

    res.json({ 
      roadmapId, 
      score: finalScore,
      levelLabel: assignedLevel, 
      feedback: aiFeedback,
      message: "Деңгей сәтті сақталды!" 
    })

  } catch (error) {
    console.error("Ассессмент сақтау қатесі:", error);
    res.status(500).json({ error: "Тест нәтижесін сақтау мүмкін болмады" });
  }
};

export const getUserRoadmapCollection = async (req: any, res: Response) => {
  try {
    const userId = req.user.userId; // Токеннен алынған ID

    const collection = await prisma.userRoadmap.findMany({
      where: { userId: userId },
      select: { roadmapId: true }
    });

    // Тек ID-лер тізімін қайтару: ["frontend", "backend"]
    res.json(collection.map(c => c.roadmapId));
  } catch (error) {
    res.status(500).json({ error: "Коллекцияны алу мүмкін болмады" });
  }
};

export const getRoadmapProgress = async (req: any, res: Response) => {
  try {
    const userId = parseInt(req.user.userId, 10);

    // 1. Пайдаланушының барлық бағыттарын (Roadmap) табамыз
    const userRoadmaps = await prisma.userRoadmap.findMany({
      where: { userId }
    });

    if (userRoadmaps.length === 0) {
      return res.json([]);
    }

    const progressList = [];

    // 2. Әр бағыт үшін жеке прогресс есептейміз
    for (const ur of userRoadmaps) {
      const roadmapId = ur.roadmapId;

      // Сол бағытқа тиесілі жалпы тақырыптар (Node) саны
      const totalTopics = await prisma.roadmapNode.count({
        where: { roadmapId }
      });

      // Пайдаланушының сол бағытта "completed" қылған тақырыптар саны
      const completedTopics = await prisma.userProgress.count({
        where: {
          userId,
          status: "completed",
          node: { roadmapId } // Байланыс арқылы бағытқа тиесілі екенін тексеру
        }
      });

      // Пайызды есептеу
      const completionPercent = totalTopics > 0 
        ? Math.round((completedTopics / totalTopics) * 100) 
        : 0;

      progressList.push({
        roadmapId,
        completionPercent,
        completedTopics,
        totalTopics
      });
    }

    // 3. Фронтенд күткен форматта қайтарамыз
    res.json(progressList);

  } catch (error) {
    console.error("Прогресс алу қатесі:", error);
    res.status(500).json({ error: "Прогрессті алу қатесі" });
  }
};

export const updateUserRoadmapCollection = async (req:any, res: any) => {
  try {
    const userId = req.user.userId
    const { roadmapIds } = req.body

    if (!Array.isArray(roadmapIds)) {
      return res.status(400).json({ error: "roadmapIds must be array" })
    }

    // удалить старые
    await prisma.userRoadmap.deleteMany({
      where: { userId }
    })

    // создать новые
    const data = roadmapIds.map((roadmapId) => ({
      userId,
      roadmapId,
       assignedLevel: "Beginner"
    }))

    await prisma.userRoadmap.createMany({
      data
    })

    res.json(roadmapIds)

  } catch (error) {
    console.error(error)
    res.status(500).json({ error: "Failed to save roadmaps" })
  }
};

export const getUserYearActivity = async (req: any, res: Response) => {
  try {
    const userId = req.user.userId;
    
    // Пайдаланушының өткен тесттері мен бітірген сабақтарын базадан аламыз
    const progress = await prisma.userProgress.findMany({
      where: { 
        userId,
        status: "completed" 
      },
      select: { updatedAt: true }
    });

    // Күндер бойынша топтастыру
    const activity = progress.map(p => ({
      date: p.updatedAt.toISOString().split('T')[0],
      count: 1 // Күніне неше сабақ бітіргенін есептеуге болады
    }));

    res.json(activity);
  } catch (error) {
    res.status(500).json({ error: "Белсенділік қатесі" });
  }
};

export const completeOnboarding = async (req: any, res: Response) => {
  try {
    const userId = req.user.userId

    await prisma.user.update({
      where: { id: userId },
      data: { firstLogin: false }
    })

    res.json({ success: true })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: "Failed to complete onboarding" })
  }
};

// roadmapController.ts ішіндегі completeNode функциясы

export const completeNode = async (req: any, res: Response) => {
  try {
    const userId = req.user.userId
    const { nodeId } = req.body

    const node = await prisma.roadmapNode.findUnique({
      where: { id: nodeId }
    })

    if (!node) return res.status(404).json({ error: "Node not found" })

    // 1️⃣ Қазіргі тақырыпты "completed" жасау
    await prisma.userProgress.upsert({
      where: { userId_nodeId: { userId, nodeId } },
      update: { status: "completed" },
      create: { userId, nodeId, status: "completed" }
    })

    // 2️⃣ КЕЛЕСІ ТАҚЫРЫПТЫ ТАБУ (Дұрыс жолы: қазіргіден үлкен ең біріншісі)
    const nextNode = await prisma.roadmapNode.findFirst({
      where: {
        roadmapId: node.roadmapId,
        orderIndex: { gt: node.orderIndex } // gt - "greater than" (үлкен)
      },
      orderBy: { orderIndex: 'asc' } // Ең жақынын алу үшін
    })

    // 3️⃣ Егер келесі тақырып болса, оны "not_started" (ашық) күйіне ауыстыру
    if (nextNode) {
      await prisma.userProgress.upsert({
        where: { userId_nodeId: { userId, nodeId: nextNode.id } },
        update: { 
          // Егер ол бұрын бітіп қоймаса ғана ашамыз
          status: { set: 'not_started' } 
        },
        create: { userId, nodeId: nextNode.id, status: "not_started" }
      })
    }

    res.json({ success: true })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: "Completion error" })
  }
};

export const startNode = async (req: any, res: Response) => {
  try {
    const userId = req.user.userId
    const { nodeId } = req.body

    await prisma.userProgress.update({
      where: {
        userId_nodeId: {
          userId,
          nodeId
        }
      },
      data: {
        status: "in_progress"
      }
    })

    res.json({ success: true })

  } catch (error) {
    console.error(error)
    res.status(500).json({ error: "Start node error" })
  }
};

export const removeUserRoadmap = async (req: any, res: Response) => {
  try {
    const userId = req.user.userId;
    const { roadmapId } = req.params;

    // Базадан осы қолданушыға тиесілі нақты бағытты өшіру
    await prisma.userRoadmap.deleteMany({
      where: {
        userId: userId,
        roadmapId: roadmapId
      }
    });

    res.json({ success: true, message: "Бағыт сәтті өшірілді" });
  } catch (error) {
    console.error("Өшіру қатесі:", error);
    res.status(500).json({ error: "Базадан өшіру мүмкін болмады" });
  }
};

export const createAiRoadmap = async (req: any, res: any) => {
  try {
    const { title, goal, interests } = req.body;
    const userId = parseInt(req.user.userId, 10); // Пайдаланушы ID-ін сандарға айналдыру

    // AI-дан дерек алу
    const aiResult = await generateCustomRoadmap({ title, goal, interests });

    // Prisma арқылы PostgreSQL-ге сақтау
    const savedRoadmap = await prisma.customAiRoadmap.create({
      data: {
        userId: userId,
        title: aiResult.title,
        goal: aiResult.goal,
        content: aiResult.milestones, // Бұл жерде milestones (array) сақталады
      }
    });

    // Фронтендке базадағы дайын объектіні қайтару
    res.status(201).json(savedRoadmap);
  } catch (error) {
    console.error("AI Creation/DB Save Error:", error);
    res.status(500).json({ error: "AI жол картасын сақтау кезінде қате кетті" });
  }
};

// 2. Пайдаланушының базада сақталған барлық ИИ карталарын алу
export const getUserAiRoadmaps = async (req: any, res: any) => {
  try {
    const userId = parseInt(req.user.userId, 10);
    
    const roadmaps = await prisma.customAiRoadmap.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' } // Жаңалары жоғарыда тұруы үшін
    });
    
    res.json(roadmaps);
  } catch (error) {
    console.error("Fetch AI Roadmaps Error:", error);
    res.status(500).json({ error: "Сақталған карталарды алу мүмкін болмады" });
  }
};

export const getUserSkillLevels = async (req: any, res: Response) => {
  try {
    const userId = parseInt(req.user.userId, 10);
    
    // Енді UserRoadmap-тан емес, жаңа UserSkillLevel кестесінен аламыз!
    const skillLevels = await prisma.userSkillLevel.findMany({
      where: { userId }
    });

    const result = skillLevels.map(skill => ({
      roadmapId: skill.roadmapId,
      roadmapTitle: skill.roadmapId,
      levelLabel: skill.levelLabel, 
      score: skill.score,
      updatedAt: skill.updatedAt.toISOString()
    }));

    res.json(result);
  } catch (error) {
    console.error("getUserSkillLevels қатесі:", error);
    res.status(500).json({ error: "Деңгейлерді алу мүмкін болмады" });
  }
};

export const convertAndAddAiRoadmap = async (req: any, res: Response) => {
  try {
    const userId = parseInt(req.user.userId, 10);
    const { customRoadmapId } = req.body;

    // 1. ИИ жасаған картаны базадан табу
    const customRoadmap = await prisma.customAiRoadmap.findUnique({
      where: { id: customRoadmapId }
    });

    if (!customRoadmap) {
      return res.status(404).json({ error: "AI Roadmap табылмады" });
    }

    // 2. Бірегей ID жасаймыз (мысалы, "ai_" префиксімен)
    const standardRoadmapId = `ai_${customRoadmap.id}`;

    // 3. Бұл бағыт бұрыннан айналдырылған ба, жоқ па тексереміз
    let roadmap = await prisma.roadmap.findUnique({
      where: { id: standardRoadmapId }
    });

    if (!roadmap) {
      // Егер жоқ болса, кәдімгі Roadmap етіп құру
      roadmap = await prisma.roadmap.create({
        data: {
          id: standardRoadmapId,
          title: customRoadmap.title,
          description: customRoadmap.goal || "AI генерациялаған жеке бағыт",
          level: "Beginner",
          recommended: false
        }
      });

      // JSON ішіндегі апталық/тақырыптық жоспарларды Node етіп сақтау
      const milestones = customRoadmap.content as any[]; 
      
      if (Array.isArray(milestones)) {
        const nodesData = milestones.map((m: any, index: number) => ({
          roadmapId: standardRoadmapId,
          title: m.title || m.name || `Тақырып ${index + 1}`,
          description: m.description || m.details || "",
          orderIndex: index + 1,
          level: "beginner"
        }));

        await prisma.roadmapNode.createMany({
          data: nodesData
        });
      }
    }

    // 4. Оны "Мои направления" (UserRoadmap) қатарына қосу
    const existingRelation = await prisma.userRoadmap.findFirst({
      where: { userId, roadmapId: standardRoadmapId }
    });

    if (!existingRelation) {
      await prisma.userRoadmap.create({
        data: {
          userId,
          roadmapId: standardRoadmapId,
          assignedLevel: "Beginner" 
        }
      });
    }

    res.json({ success: true, newRoadmapId: standardRoadmapId });

  } catch (error) {
    console.error("AI Roadmap конвертациялау қатесі:", error);
    res.status(500).json({ error: "Бағытты қосу мүмкін болмады" });
  }
};