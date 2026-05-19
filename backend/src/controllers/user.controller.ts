import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { validationResult } from 'express-validator';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const getUsers = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true, avatar: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ users });
  } catch {
    res.status(500).json({ message: 'Failed to fetch users' });
  }
};

export const getUserById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true, avatar: true },
    });
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    res.json({ user });
  } catch {
    res.status(500).json({ message: 'Failed to fetch user' });
  }
};

export const createUser = async (req: AuthRequest, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }
  const { email, password, name, role } = req.body;
  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ message: 'Email already in use' });
      return;
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, name, role: role || 'DEVELOPER' },
      select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
    });
    res.status(201).json({ user });
  } catch {
    res.status(500).json({ message: 'Failed to create user' });
  }
};

export const updateUser = async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, role, isActive } = req.body;
  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { name, role, isActive },
      select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
    });
    res.json({ user });
  } catch {
    res.status(500).json({ message: 'Failed to update user' });
  }
};

export const toggleUserStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: !user.isActive },
      select: { id: true, email: true, name: true, role: true, isActive: true },
    });
    res.json({ user: updated });
  } catch {
    res.status(500).json({ message: 'Failed to toggle user status' });
  }
};
