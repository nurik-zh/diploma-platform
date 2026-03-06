import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../prisma/client.js";

const formatAuthUser = (user: any) => ({
  id: user.id,
  email: user.email,
  role: user.role ?? "student",
  firstLogin: Boolean(user.firstLogin),
  createdAt: user.createdAt.toISOString(),
  country: user.country ?? "Kazakhstan",
  city: user.city ?? "Almaty",
  university: user.university ?? "Satbayev University",
  companyProfile: null,
});

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, role, country, city, university, fullName } = req.body ?? {};

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        role: typeof role === "string" ? role : "student",
        ...(typeof country === "string" ? { country } : {}),
        ...(typeof city === "string" ? { city } : {}),
        ...(typeof university === "string" ? { university } : {}),
        ...(typeof fullName === "string" ? { fullName } : {}),
      },
    });

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || "HalaMadrid",
    );

    res.status(201).json({ token, user: formatAuthUser(user) });
  } catch (error: any) {
    console.error("Register error:", error);
    res.status(400).json({
      message: "Registration failed",
      details: error.message,
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const user = await prisma.user.findUnique({
      where: { email: String(email).trim().toLowerCase() },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || "HalaMadrid",
    );

    res.json({ token, user: formatAuthUser(user) });
  } catch (error: any) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
