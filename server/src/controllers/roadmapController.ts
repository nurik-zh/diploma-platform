import { Response } from 'express';
import pkg from '@prisma/client';
import { getAIResponse, generateCustomRoadmap, generateAssessmentQuestions, // ЖАҢА
  evaluateAssessmentAnswers } from '../services/aiService.js';
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

function normalizeAssessmentPayload(raw: unknown, roadmapTitle: string): GeneratedAssessment {
  const o = raw as Record<string, unknown>;
  const quizRaw = Array.isArray(o?.quizQuestions) ? (o.quizQuestions as unknown[]) : [];
  const writtenRaw = Array.isArray(o?.writtenQuestions) ? (o.writtenQuestions as unknown[]) : [];

  const quizQuestions: AssessmentQuizQuestion[] = quizRaw.map((item, i) => {
    const q = item as Record<string, unknown>;
    const opts = Array.isArray(q.options) ? (q.options as unknown[]).map((x) => String(x)) : [];
    const options = opts.slice(0, 4);
    while (options.length < 4) options.push(`Вариант ${options.length + 1}`);
    let correctIndex = typeof q.correctIndex === 'number' ? q.correctIndex : parseInt(String(q.correctOption ?? q.correctIndex ?? 0), 10);
    if (!Number.isFinite(correctIndex)) correctIndex = 0;
    correctIndex = Math.max(0, Math.min(options.length - 1, correctIndex));
    return {
      id: String(q.id ?? `q${i + 1}`),
      question: String(q.question ?? `Вопрос ${i + 1} по ${roadmapTitle}`),
      options,
      correctIndex,
    };
  });

  const writtenQuestions: AssessmentWrittenQuestion[] = writtenRaw.map((item, i) => {
    const w = item as Record<string, unknown>;
    return {
      id: String(w.id ?? `wq${i + 1}`),
      text: String(w.text ?? `Развёрнутый вопрос ${i + 1}`),
      placeholder: w.placeholder ? String(w.placeholder) : undefined,
      hint: w.hint ? String(w.hint) : undefined,
      keywords: Array.isArray(w.keywords) ? (w.keywords as unknown[]).map(String) : undefined,
    };
  });

  return { quizQuestions, writtenQuestions };
}

function fallbackAssessment(roadmapTitle: string): GeneratedAssessment {
  return {
    quizQuestions: [
      {
        id: 'q1',
        question: `Что ближе всего к цели обучения по направлению «${roadmapTitle}»?`,
        options: ['Изучить основы и практиковаться', 'Только читать теорию', 'Пропускать практику', 'Не определять цели'],
        correctIndex: 0,
      },
      {
        id: 'q2',
        question: 'Как лучше закреплять знания после урока?',
        options: ['Повторить конспект и решить задачи', 'Ничего не делать', 'Только смотреть видео', 'Учить всё наизусть без понимания'],
        correctIndex: 0,
      },
      {
        id: 'q3',
        question: 'Что из перечисленного чаще всего важно в командной разработке?',
        options: ['Общение и код-ревью', 'Работа в полном одиночестве', 'Игнорировать стиль кода', 'Избегать документации'],
        correctIndex: 0,
      },
    ],
    writtenQuestions: [
      {
        id: 'wq1',
        text: `Кратко опишите, что вы уже знаете по теме «${roadmapTitle}» и что хотите освоить дальше.`,
        placeholder: '2–4 предложения...',
      },
      {
        id: 'wq2',
        text: 'Приведите пример реальной задачи, которую вы бы хотели уметь решать после обучения.',
        placeholder: 'Опишите задачу...',
      },
    ],
  };
}

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
    const userId = parseInt(req.user.userId, 10)

    const nodes = await prisma.roadmapNode.findMany({
      orderBy: [{ roadmapId: 'asc' }, { orderIndex: 'asc' }],
    })

    // получить прогресс пользователя
    const progress = await prisma.userProgress.findMany({
      where: { userId },
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
          progress.push(userNodeProgress)
        } else {
          // предыдущая тема пройдена, а запись для этой ноды не создалась (старые клиенты / до фикса submitTopicResult)
          const prevNode = await prisma.roadmapNode.findFirst({
            where: {
              roadmapId: node.roadmapId,
              orderIndex: node.orderIndex - 1,
            },
          })
          if (prevNode) {
            const prevProgress = progress.find((p) => p.nodeId === prevNode.id)
            if (prevProgress?.status === 'completed') {
              userNodeProgress = await prisma.userProgress.upsert({
                where: {
                  userId_nodeId: {
                    userId,
                    nodeId: node.id,
                  },
                },
                update: { status: 'not_started' },
                create: {
                  userId,
                  nodeId: node.id,
                  status: 'not_started',
                },
              })
              progress.push(userNodeProgress)
            }
          }
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

  const userId = parseInt(req.user.userId, 10); 

  try {
    const roadmap = await prisma.roadmap.findUnique({ where: { id: roadmapId } });

    if (!roadmap) {
      return res.status(404).json({ error: "Roadmap табылмады" });
    }

    const aiQuestions = await generateAssessmentQuestions(roadmap.title);

    let payload = normalizeAssessmentPayload(aiQuestions, roadmap.title);

    if (payload.quizQuestions.length === 0) {
      payload = fallbackAssessment(roadmap.title);
    }

    if (payload.writtenQuestions.length === 0) {
      payload = {
        ...payload,
        writtenQuestions: fallbackAssessment(roadmap.title).writtenQuestions
      };
    }

    const sessionId = createAssessmentSession({
      userId,
      roadmapId,
      quizQuestions: payload.quizQuestions, // ✅ СЕНІҢ ЛОГИКА
      writtenQuestions: payload.writtenQuestions
    });

    res.json({
      roadmapId,
      sessionId,
      title: `Оценка уровня: ${roadmap.title}`,
      quizQuestions: payload.quizQuestions.map(({ id, question, options }) => ({
        id,
        question,
        options
      })),
      writtenQuestions: payload.writtenQuestions
    });

  } catch (error) {
    console.error("Ассессмент генерациялау қатесі:", error);

    const roadmap = await prisma.roadmap.findUnique({ where: { id: roadmapId } });
    const title = roadmap?.title ?? roadmapId;

    const payload = fallbackAssessment(title);

    const sessionId = createAssessmentSession({
      userId,
      roadmapId,
      quizQuestions: payload.quizQuestions,
      writtenQuestions: payload.writtenQuestions
    });

    res.json({
      roadmapId,
      sessionId,
      title: "Тест (резерв)",
      quizQuestions: payload.quizQuestions.map(({ id, question, options }) => ({
        id,
        question,
        options
      })),
      writtenQuestions: payload.writtenQuestions
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
    let aiFeedback = "Бағалау мүмкін болмады";

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

    // 2. Деңгейді сақтау (UserSkillLevel)
    await prisma.userSkillLevel.upsert({
      where: {
        userId_roadmapId: { userId, roadmapId } // Егер бұл unique constraint болмаса, findFirst + update/create қолданыңыз
      },
      update: { levelLabel: assignedLevel, score: finalScoreInt },
      create: { userId, roadmapId, levelLabel: assignedLevel, score: finalScoreInt }
    });

    // =====================================================================
    // 3. ЖАҢА ФИШКА: Деңгейге сай жеке Roadmap және Nodes генерациялау
    // =====================================================================
    
    // Жаңа бірегей ID (әр қолданушыға жеке болуы үшін)
    const personalRoadmapId = `ai_tailored_${userId}_${roadmapId}`;

    // ИИ-ден осы деңгейге сай тақырыптарды сұрау
    const aiTopicsData = await generateTopicsByLevel(roadmap.title, assignedLevel);

    // Жеке Roadmap бар-жоғын тексеріп, болмаса құру немесе жаңарту
    await prisma.roadmap.upsert({
      where: { id: personalRoadmapId },
      update: { 
        level: assignedLevel,
        description: `Сіздің ${assignedLevel} деңгейіңізге арнайы құрастырылған оқу жоспары.` 
      },
      create: {
        id: personalRoadmapId,
        title: `${roadmap.title} (${assignedLevel})`,
        description: `Сіздің ${assignedLevel} деңгейіңізге арнайы құрастырылған оқу жоспары.`,
        level: assignedLevel,
        recommended: false
      }
    });

    await prisma.userProgress.deleteMany({
      where: {
        node: {
          roadmapId: personalRoadmapId
        }
      }
    });

    // Ескі тақырыптарды (nodes) өшіріп, жаңаларын үстінен жазу
    await prisma.roadmapNode.deleteMany({ where: { roadmapId: personalRoadmapId } });

    // ИИ берген тақырыптарды RoadmapNode кестесіне сақтау
    const nodesData = aiTopicsData.nodes.map((node: any, index: number) => ({
      roadmapId: personalRoadmapId,
      title: node.title,
      description: node.description,
      orderIndex: index + 1,
      level: assignedLevel
    }));
    await prisma.roadmapNode.createMany({ data: nodesData })

    await prisma.userRoadmap.deleteMany({
      where: { userId, roadmapId: roadmapId } 
    });

    // Орнына жаңа жеке бағытты қосамыз
    const existingUserRoadmap = await prisma.userRoadmap.findFirst({
      where: { userId, roadmapId: personalRoadmapId }
    });

    if (!existingUserRoadmap) {
      await prisma.userRoadmap.create({
        data: { userId, roadmapId: personalRoadmapId, assignedLevel }
      });
    } else {
      await prisma.userRoadmap.update({
        where: { id: existingUserRoadmap.id },
        data: { assignedLevel }
      });
    }

    // 5. Фронтендке жауап қайтару (жаңа personalRoadmapId жібереміз)
    res.json({ 
      originalRoadmapId: roadmapId,
      personalRoadmapId: personalRoadmapId, // МАҢЫЗДЫ: Осы ID-ге redirect жасаймыз
      score: finalScoreInt,
      levelLabel: assignedLevel, 
      feedback: aiFeedback,
      message: "Деңгей сәтті сақталды!" 
    });

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
    
    // Егер қате Google серверінен болса (503)
    if (error.message.includes("503") || error.message.includes("high demand")) {
      return res.status(503).json({ 
        error: "AI серверлері қазір бос емес. Өтінеміз, 5 минуттан соң қайталап көріңіз." 
      });
    }

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