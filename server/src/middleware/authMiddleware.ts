import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const authenticateToken = (req: any, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN_HERE"

  if (!token) return res.status(401).json({ error: "Токен табылмады, рұқсат жоқ" });

  jwt.verify(token, process.env.JWT_SECRET || 'secret_key', (err: any, user: any) => {
    if (err) return res.status(403).json({ error: "Токен жарамсыз" });
    req.user = user;
    next();
  });
};