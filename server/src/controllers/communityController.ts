import { Request, Response } from 'express';
import pkg from '@prisma/client';
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

// 1. Барлық посттарды алу
export const getPosts = async (req: Request, res: Response) => {
  try {
    const posts = await prisma.communityPost.findMany({
      include: {
        comments: true,
        likes: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    // Фронтенд күтетін форматқа келтіру (likedByUserIds массиві және likes саны)
    const formattedPosts = posts.map(post => ({
    ...post,
    likes: post.likes ? post.likes.length : 0, // Сақтық үшін
    likedByUserIds: post.likes ? post.likes.map(like => like.userId) : [],
    comments: post.comments || [] // Егер комментарийлер undefined болса
    }));

    res.json(formattedPosts);
  } catch (error) {
    res.status(500).json({ error: "Посттарды жүктеу мүмкін болмады" });
  }
};

// 2. Жаңа пост құру
export const createPost = async (req: any, res: Response) => {
  try {
    const { title, content, focusArea, tags, authorName, authorType } = req.body;
    const authorUserId = req.user ? req.user.userId : null;

    const newPost = await prisma.communityPost.create({
      data: {
        title, content, focusArea, tags, authorName, authorType,
        authorUserId,
        publishedAt: new Date(),
        moderationStatus: "approved", // MVP үшін бірден approved жасаймыз
      },
      include: { comments: true, likes: true }
    });

    res.status(201).json({ ...newPost, likes: 0, likedByUserIds: [] });
  } catch (error) {
    res.status(500).json({ error: "Пост құру кезінде қате кетті" });
  }
};

// 3. Лайк басу / алып тастау
export const toggleLike = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const existingLike = await prisma.postLike.findUnique({
      where: { postId_userId: { postId: id, userId } }
    });

    if (existingLike) {
      await prisma.postLike.delete({ where: { id: existingLike.id } });
      res.json({ message: "Лайк алынды" });
    } else {
      await prisma.postLike.create({ data: { postId: id, userId } });
      res.json({ message: "Лайк қойылды" });
    }
  } catch (error) {
    res.status(500).json({ error: "Лайк басу мүмкін болмады" });
  }
};

// 4. Комментарий жазу
export const addComment = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { text, authorName, authorType } = req.body;
    const authorUserId = req.user ? req.user.userId : null;

    const newComment = await prisma.communityComment.create({
      data: { postId: id, text, authorName, authorType, authorUserId }
    });

    res.status(201).json(newComment);
  } catch (error) {
    res.status(500).json({ error: "Комментарий қосу мүмкін болмады" });
  }
};