import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const getDashboardStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const role = req.user!.role;

    const projectWhere = role === 'ADMIN' ? {} : { members: { some: { userId } } };

    const [
      totalProjects,
      activeProjects,
      totalTickets,
      myTickets,
      ticketsByStatus,
      ticketsByPriority,
      recentActivity,
    ] = await Promise.all([
      prisma.project.count({ where: projectWhere }),
      prisma.project.count({ where: { ...projectWhere, status: 'ACTIVE' } }),
      prisma.ticket.count({
        where: role === 'ADMIN' ? {} : { project: { members: { some: { userId } } } },
      }),
      prisma.ticket.count({ where: { assigneeId: userId } }),
      prisma.ticket.groupBy({
        by: ['status'],
        _count: { status: true },
        where: role === 'ADMIN' ? {} : { project: { members: { some: { userId } } } },
      }),
      prisma.ticket.groupBy({
        by: ['priority'],
        _count: { priority: true },
        where: role === 'ADMIN' ? {} : { project: { members: { some: { userId } } } },
      }),
      prisma.activityLog.findMany({
        where: role === 'ADMIN' ? {} : {
          OR: [
            { userId },
            { project: { members: { some: { userId } } } },
          ],
        },
        include: {
          user: { select: { id: true, name: true, avatar: true } },
          project: { select: { id: true, name: true, key: true } },
          ticket: { select: { id: true, key: true, title: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    const myAssignedTickets = await prisma.ticket.findMany({
      where: { assigneeId: userId, status: { not: 'DONE' } },
      include: {
        project: { select: { id: true, name: true, key: true } },
        assignee: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    });

    res.json({
      stats: {
        totalProjects,
        activeProjects,
        totalTickets,
        myTickets,
      },
      ticketsByStatus: ticketsByStatus.map(t => ({ status: t.status, count: t._count.status })),
      ticketsByPriority: ticketsByPriority.map(t => ({ priority: t.priority, count: t._count.priority })),
      myAssignedTickets,
      recentActivity,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch dashboard stats' });
  }
};
