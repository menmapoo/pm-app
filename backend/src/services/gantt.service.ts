import prisma from '../utils/prisma';

const statusProgress: Record<string, number> = {
  BACKLOG: 0,
  TODO: 10,
  IN_PROGRESS: 50,
  IN_REVIEW: 80,
  DONE: 100,
};

interface GanttFilters {
  userId: string;
  userRole: string;
  projectId?: string;
  status?: string;
  priority?: string;
  assigneeId?: string;
  search?: string;
}

export async function getGanttData(filters: GanttFilters) {
  const { userId, userRole, projectId, status, priority, assigneeId, search } = filters;

  const projectWhere: any = {};
  if (projectId) projectWhere.id = projectId;
  if (userRole !== 'ADMIN') projectWhere.members = { some: { userId } };

  const ticketWhere: any = {};
  if (status) ticketWhere.status = status;
  if (priority) ticketWhere.priority = priority;
  if (assigneeId) ticketWhere.assigneeId = assigneeId;
  if (search) {
    ticketWhere.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { key: { contains: search, mode: 'insensitive' } },
    ];
  }

  const projects = await prisma.project.findMany({
    where: projectWhere,
    include: {
      tickets: {
        where: ticketWhere,
        include: { assignee: { select: { id: true, name: true } } },
        orderBy: { startDate: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  });

  const result = [];
  const noDateTickets: any[] = [];

  for (const project of projects) {
    const withDates = project.tickets.filter(t => t.startDate && t.dueDate);
    const withoutDates = project.tickets.filter(t => !t.startDate || !t.dueDate);

    for (const t of withoutDates) {
      noDateTickets.push({
        id: t.id,
        key: t.key,
        title: t.title,
        status: t.status,
        priority: t.priority,
        type: t.type,
        projectKey: project.key,
        projectName: project.name,
        assignee: t.assignee,
      });
    }

    if (withDates.length === 0) continue;

    const starts = withDates.map(t => t.startDate!.getTime());
    const ends = withDates.map(t => t.dueDate!.getTime());
    const projectStart = new Date(Math.min(...starts));
    const projectEnd = new Date(Math.max(...ends));

    const allProgresses = project.tickets.map(t => statusProgress[t.status] ?? 0);
    const projectProgress = allProgresses.length > 0
      ? Math.round(allProgresses.reduce((sum, p) => sum + p, 0) / allProgresses.length)
      : 0;

    result.push({
      id: project.id,
      name: project.name,
      key: project.key,
      startDate: projectStart,
      endDate: projectEnd,
      progress: projectProgress,
      tickets: withDates.map(t => ({
        id: t.id,
        key: t.key,
        title: t.title,
        status: t.status,
        priority: t.priority,
        type: t.type,
        startDate: t.startDate,
        dueDate: t.dueDate,
        progress: statusProgress[t.status] ?? 0,
        assignee: t.assignee,
      })),
    });
  }

  return { projects: result, noDateTickets };
}
