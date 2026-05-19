import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { getGanttData } from '../services/gantt.service';

export const getGantt = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { projectId, status, priority, assigneeId, search } = req.query;
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    const data = await getGanttData({
      userId,
      userRole,
      projectId: projectId as string | undefined,
      status: status as string | undefined,
      priority: priority as string | undefined,
      assigneeId: assigneeId as string | undefined,
      search: search as string | undefined,
    });

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch Gantt data' });
  }
};
