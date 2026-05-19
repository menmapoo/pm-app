import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const getActivity = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { projectId, ticketId, limit = '20' } = req.query;
    const where: any = {};
    if (projectId) where.projectId = projectId;
    if (ticketId) where.ticketId = ticketId;

    const logs = await prisma.activityLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        project: { select: { id: true, name: true, key: true } },
        ticket: { select: { id: true, key: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
    });
    res.json({ logs });
  } catch {
    res.status(500).json({ message: 'Failed to fetch activity logs' });
  }
};
