import { Request, Response } from 'express';
import pkg from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const { PrismaClient } = pkg;
const prisma = new PrismaClient();

// Helper: Фронтендке AuthUser форматын беру
const formatAuthUser = (user: any) => ({
  id: user.id,
  email: user.email,
  firstLogin: user.firstLogin,
  createdAt: user.createdAt.toISOString(),
  country: user.country,
  city: user.city,
  university: user.university
});

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, fullName, country, city, university } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await prisma.user.create({
      data: { 
        email, 
        password: hashedPassword, 
        fullName: fullName || email.split('@')[0],
        country: country || "Kazakhstan",
        city: city || "Almaty",
        university: university || "Satbayev University"
      }
    });

    const token = jwt.sign(
      { userId: user.id, role: user.role }, 
      process.env.JWT_SECRET || 'secret_key'
    );

    res.status(201).json({ token, user: formatAuthUser(user) });
  } catch (error: any) {
    console.error("FULL ERROR:", error); 
    res.status(400).json({ 
      message: "Тіркелу кезінде қате кетті", 
      details: error.message 
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Құпия сөз немесе email қате" });
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET || 'secret_key');

    res.json({ token, user: formatAuthUser(user) });
  } catch (error) {
    res.status(500).json({ message: "Ішкі қате" });
  }
};

export const getMe = async (req: Request, res: Response) => {
  try {
    // Токенді тексеретін middleware (authMiddleware) req.user ішіне userId салып жібереді деп күтеміз
    const userId = Number((req as any).user.userId);

    const user = await prisma.user.findUnique({ 
      where: { id: userId } 
    });

    if (!user) {
      return res.status(404).json({ message: "Пайдаланушы табылмады" });
    }

    // Сізде бұрыннан бар formatAuthUser функциясын қолданамыз
    res.json(formatAuthUser(user));
  } catch (error) {
    res.status(500).json({ message: "Сервер қатесі" });
  }
};