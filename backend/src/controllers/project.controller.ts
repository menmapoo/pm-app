import { Response } from 'express';
import { validationResult } from 'express-validator';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

const logActivity = async (action: string, entity: string, entityId: string, userId: string, projectId?: string, details?: object) => {
  await prisma.activityLog.create({
    data: { action, entity, entityId, userId, projectId, details },
  });
};

export const getProjects = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const role = req.user!.role;

    const whereClause = role === 'ADMIN'
      ? {}
      : { members: { some: { userId } } };

    const projects = await prisma.project.findMany({
      where: whereClause,
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
        },
        _count: { select: { tickets: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ projects });
  } catch {
    res.status(500).json({ message: 'Failed to fetch projects' });
  }
};

export const getProjectById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true, role: true, avatar: true } } },
        },
        _count: { select: { tickets: true } },
      },
    });
    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }
    res.json({ project });
  } catch {
    res.status(500).json({ message: 'Failed to fetch project' });
  }
};

export const createProject = async (req: AuthRequest, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }
  const { name, description, key } = req.body;
  const userId = req.user!.userId;
  try {
    const existing = await prisma.project.findUnique({ where: { key: key.toUpperCase() } });
    if (existing) {
      res.status(409).json({ message: 'Project key already exists' });
      return;
    }
    const project = await prisma.project.create({
      data: {
        name,
        description,
        key: key.toUpperCase(),
        members: { create: { userId, role: 'MANAGER' } },
      },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
    });
    await logActivity('PROJECT_CREATED', 'PROJECT', project.id, userId, project.id, { name });
    res.status(201).json({ project });
  } catch {
    res.status(500).json({ message: 'Failed to create project' });
  }
};

export const updateProject = async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, description, status } = req.body;
  const userId = req.user!.userId;
  try {
    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: { name, description, status },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
    });
    await logActivity('PROJECT_UPDATED', 'PROJECT', project.id, userId, project.id, { name, status });
    res.json({ project });
  } catch {
    res.status(500).json({ message: 'Failed to update project' });
  }
};

export const deleteProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.project.delete({ where: { id: req.params.id } });
    res.json({ message: 'Project deleted' });
  } catch {
    res.status(500).json({ message: 'Failed to delete project' });
  }
};

export const addMember = async (req: AuthRequest, res: Response): Promise<void> => {
  const { userId, role } = req.body;
  try {
    const existing = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: req.params.id, userId } },
    });
    if (existing) {
      res.status(409).json({ message: 'User already a member' });
      return;
    }
    const member = await prisma.projectMember.create({
      data: { projectId: req.params.id, userId, role: role || 'DEVELOPER' },
      include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
    });
    res.status(201).json({ member });
  } catch {
    res.status(500).json({ message: 'Failed to add member' });
  }
};

export const removeMember = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.projectMember.delete({
      where: { projectId_userId: { projectId: req.params.id, userId: req.params.userId } },
    });
    res.json({ message: 'Member removed' });
  } catch {
    res.status(500).json({ message: 'Failed to remove member' });
  }
};

export const updateMemberRole = async (req: AuthRequest, res: Response): Promise<void> => {
  const { role } = req.body;
  try {
    const member = await prisma.projectMember.update({
      where: { projectId_userId: { projectId: req.params.id, userId: req.params.userId } },
      data: { role },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    res.json({ member });
  } catch {
    res.status(500).json({ message: 'Failed to update member role' });
  }
};
