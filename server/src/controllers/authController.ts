import { Request, Response } from 'express';
import pkg from '@prisma/client';
const { PrismaClient } = pkg;

const prisma = new PrismaClient();
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken'


export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    
    // Парольді шифрлау
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, firstName, lastName }
    });

    res.status(201).json({ message: "Пайдаланушы тіркелді", userId: user.id });
  } catch (error) {
    res.status(400).json({ error: "Тіркелу кезінде қате кетті" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // 1. Пайдаланушыны базадан іздеу
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(401).json({ error: "Мұндай пайдаланушы табылмады" });
    }

    // 2. Құпия сөзді тексеру (hash-талған түрімен салыстыру)
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Құпия сөз қате" });
    }

    // 3. JWT Токен жасау
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET || 'secret_key', // .env файлынан алынады
      { expiresIn: '24h' } // Токен 24 сағатқа жарамды
    );

    // 4. Жауап қайтару
    res.json({
      message: "Жүйеге сәтті кірдіңіз",
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        role: user.role
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Логин кезінде ішкі қате кетті" });
  }
};