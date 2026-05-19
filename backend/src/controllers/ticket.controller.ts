import { Response } from 'express';
import { validationResult } from 'express-validator';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

const logActivity = async (action: string, entity: string, entityId: string, userId: string, projectId?: string, ticketId?: string, details?: object) => {
  await prisma.activityLog.create({
    data: { action, entity, entityId, userId, projectId, ticketId, details },
  });
};

const ticketInclude = {
  project: { select: { id: true, name: true, key: true } },
  assignee: { select: { id: true, name: true, email: true, avatar: true } },
  reporter: { select: { id: true, name: true, email: true, avatar: true } },
  _count: { select: { comments: true } },
};

export const getTickets = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { projectId, status, priority, assigneeId, type, search, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = {};
    if (projectId) where.projectId = projectId;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assigneeId) where.assigneeId = assigneeId;
    if (type) where.type = type;
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { key: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: ticketInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit as string),
      }),
      prisma.ticket.count({ where }),
    ]);

    res.json({ tickets, total, page: parseInt(page as string), limit: parseInt(limit as string) });
  } catch {
    res.status(500).json({ message: 'Failed to fetch tickets' });
  }
};

export const getTicketById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: req.params.id },
      include: {
        ...ticketInclude,
        comments: {
          include: { author: { select: { id: true, name: true, email: true, avatar: true } } },
          orderBy: { createdAt: 'asc' },
        },
        activityLogs: {
          include: { user: { select: { id: true, name: true, avatar: true } } },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });
    if (!ticket) {
      res.status(404).json({ message: 'Ticket not found' });
      return;
    }
    res.json({ ticket });
  } catch {
    res.status(500).json({ message: 'Failed to fetch ticket' });
  }
};

export const createTicket = async (req: AuthRequest, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const { title, description, type, priority, assigneeId, projectId, dueDate, startDate } = req.body;
  const userId = req.user!.userId;

  try {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }

    // Generate ticket key
    const count = await prisma.ticket.count({ where: { projectId } });
    const key = `${project.key}-${count + 1}`;

    const ticket = await prisma.ticket.create({
      data: {
        key,
        title,
        description,
        type: type || 'TASK',
        priority: priority || 'MEDIUM',
        status: 'BACKLOG',
        projectId,
        assigneeId: assigneeId || null,
        reporterId: userId,
        startDate: startDate ? new Date(startDate) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
      include: ticketInclude,
    });

    await logActivity('TICKET_CREATED', 'TICKET', ticket.id, userId, projectId, ticket.id, { title, key });
    res.status(201).json({ ticket });
  } catch {
    res.status(500).json({ message: 'Failed to create ticket' });
  }
};

export const updateTicket = async (req: AuthRequest, res: Response): Promise<void> => {
  const { title, description, type, status, priority, assigneeId, dueDate, startDate } = req.body;
  const userId = req.user!.userId;

  try {
    const existing = await prisma.ticket.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      res.status(404).json({ message: 'Ticket not found' });
      return;
    }

    const ticket = await prisma.ticket.update({
      where: { id: req.params.id },
      data: {
        title,
        description,
        type,
        status,
        priority,
        assigneeId: assigneeId !== undefined ? (assigneeId || null) : undefined,
        startDate: startDate !== undefined ? (startDate ? new Date(startDate) : null) : undefined,
        dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : undefined,
      },
      include: ticketInclude,
    });

    const details: any = {};
    if (status && status !== existing.status) {
      details.statusChange = { from: existing.status, to: status };
      await logActivity('STATUS_CHANGED', 'TICKET', ticket.id, userId, ticket.projectId, ticket.id, { from: existing.status, to: status });
    }
    if (assigneeId !== undefined && assigneeId !== existing.assigneeId) {
      await logActivity('ASSIGNEE_CHANGED', 'TICKET', ticket.id, userId, ticket.projectId, ticket.id, { assigneeId });
    }
    if (Object.keys(details).length === 0) {
      await logActivity('TICKET_UPDATED', 'TICKET', ticket.id, userId, ticket.projectId, ticket.id, { title });
    }

    res.json({ ticket });
  } catch {
    res.status(500).json({ message: 'Failed to update ticket' });
  }
};

export const deleteTicket = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  try {
    const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } });
    if (!ticket) {
      res.status(404).json({ message: 'Ticket not found' });
      return;
    }
    await prisma.ticket.delete({ where: { id: req.params.id } });
    await logActivity('TICKET_DELETED', 'TICKET', req.params.id, userId, ticket.projectId, undefined, { key: ticket.key });
    res.json({ message: 'Ticket deleted' });
  } catch {
    res.status(500).json({ message: 'Failed to delete ticket' });
  }
};

export const updateTicketStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  const { status, position } = req.body;
  const userId = req.user!.userId;
  try {
    const existing = await prisma.ticket.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      res.status(404).json({ message: 'Ticket not found' });
      return;
    }
    const ticket = await prisma.ticket.update({
      where: { id: req.params.id },
      data: { status, position: position ?? existing.position },
      include: ticketInclude,
    });
    if (status !== existing.status) {
      await logActivity('STATUS_CHANGED', 'TICKET', ticket.id, userId, ticket.projectId, ticket.id, { from: existing.status, to: status });
    }
    res.json({ ticket });
  } catch {
    res.status(500).json({ message: 'Failed to update ticket status' });
  }
};

export const getKanbanTickets = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { projectId } = req.query;
    if (!projectId) {
      res.status(400).json({ message: 'projectId is required' });
      return;
    }

    const tickets = await prisma.ticket.findMany({
      where: { projectId: projectId as string },
      include: {
        assignee: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: [{ status: 'asc' }, { position: 'asc' }],
    });

    const columns = {
      BACKLOG: tickets.filter(t => t.status === 'BACKLOG'),
      TODO: tickets.filter(t => t.status === 'TODO'),
      IN_PROGRESS: tickets.filter(t => t.status === 'IN_PROGRESS'),
      IN_REVIEW: tickets.filter(t => t.status === 'IN_REVIEW'),
      DONE: tickets.filter(t => t.status === 'DONE'),
    };

    res.json({ columns });
  } catch {
    res.status(500).json({ message: 'Failed to fetch kanban data' });
  }
};
