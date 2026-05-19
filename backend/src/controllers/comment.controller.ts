import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

const logActivity = async (action: string, entity: string, entityId: string, userId: string, projectId?: string, ticketId?: string, details?: object) => {
  await prisma.activityLog.create({
    data: { action, entity, entityId, userId, projectId, ticketId, details },
  });
};

export const getComments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const comments = await prisma.comment.findMany({
      where: { ticketId: req.params.ticketId },
      include: { author: { select: { id: true, name: true, email: true, avatar: true } } },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ comments });
  } catch {
    res.status(500).json({ message: 'Failed to fetch comments' });
  }
};

export const createComment = async (req: AuthRequest, res: Response): Promise<void> => {
  const { content } = req.body;
  const userId = req.user!.userId;

  if (!content || !content.trim()) {
    res.status(400).json({ message: 'Content is required' });
    return;
  }

  try {
    const ticket = await prisma.ticket.findUnique({ where: { id: req.params.ticketId } });
    if (!ticket) {
      res.status(404).json({ message: 'Ticket not found' });
      return;
    }

    const comment = await prisma.comment.create({
      data: { content, ticketId: req.params.ticketId, authorId: userId },
      include: { author: { select: { id: true, name: true, email: true, avatar: true } } },
    });

    await logActivity('COMMENT_ADDED', 'COMMENT', comment.id, userId, ticket.projectId, ticket.id, { comment: content.substring(0, 100) });
    res.status(201).json({ comment });
  } catch {
    res.status(500).json({ message: 'Failed to create comment' });
  }
};

export const updateComment = async (req: AuthRequest, res: Response): Promise<void> => {
  const { content } = req.body;
  const userId = req.user!.userId;

  try {
    const comment = await prisma.comment.findUnique({ where: { id: req.params.id } });
    if (!comment) {
      res.status(404).json({ message: 'Comment not found' });
      return;
    }
    if (comment.authorId !== userId) {
      res.status(403).json({ message: 'Not authorized to edit this comment' });
      return;
    }

    const updated = await prisma.comment.update({
      where: { id: req.params.id },
      data: { content },
      include: { author: { select: { id: true, name: true, email: true, avatar: true } } },
    });
    res.json({ comment: updated });
  } catch {
    res.status(500).json({ message: 'Failed to update comment' });
  }
};

export const deleteComment = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const userRole = req.user!.role;

  try {
    const comment = await prisma.comment.findUnique({ where: { id: req.params.id } });
    if (!comment) {
      res.status(404).json({ message: 'Comment not found' });
      return;
    }
    if (comment.authorId !== userId && userRole !== 'ADMIN') {
      res.status(403).json({ message: 'Not authorized to delete this comment' });
      return;
    }

    await prisma.comment.delete({ where: { id: req.params.id } });
    res.json({ message: 'Comment deleted' });
  } catch {
    res.status(500).json({ message: 'Failed to delete comment' });
  }
};
