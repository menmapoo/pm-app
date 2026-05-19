import * as XLSX from 'xlsx';
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  parseAndValidateTicketImportFile,
  importTickets,
  ValidTicketRow,
} from '../services/ticketImport.service';
import prisma from '../utils/prisma';

export const previewTicketImport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }
    const result = await parseAndValidateTicketImportFile(req.file.buffer);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ message: err.message || 'Failed to parse file' });
  }
};

export const confirmTicketImport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { rows } = req.body as { rows: ValidTicketRow[] };
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      res.status(400).json({ message: 'No valid rows provided for import' });
      return;
    }
    const userId = req.user!.userId;
    const created = await importTickets(rows, userId);
    res.json({
      message: `Successfully imported ${created.length} ticket(s)`,
      count: created.length,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to import tickets' });
  }
};

export const downloadTicketTemplate = (_req: AuthRequest, res: Response): void => {
  const csv = [
    'title,projectKey,description,type,status,priority,assigneeEmail,dueDate',
    'Fix login bug,FSS,Login fails for expired users,bug,todo,high,admin@pmapp.com,2026-06-01',
    'Create dashboard,CAT,Build analytics dashboard,story,backlog,medium,pm@pmapp.com,2026-06-10',
    'Improve search performance,CAT,Optimize DB queries,improvement,backlog,medium,,',
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="tickets_template.csv"');
  res.send(csv);
};

export const exportTickets = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const role = req.user!.role;

    const where =
      role === 'ADMIN'
        ? {}
        : { project: { members: { some: { userId } } } };

    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        project: { select: { key: true } },
        assignee: { select: { email: true } },
        reporter: { select: { email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const rows = tickets.map(t => ({
      'Ticket Key': t.key,
      Title: t.title,
      'Project Key': t.project.key,
      Type: t.type,
      Status: t.status,
      Priority: t.priority,
      'Assignee Email': t.assignee?.email ?? '',
      'Reporter Email': t.reporter.email,
      'Due Date': t.dueDate ? t.dueDate.toISOString().split('T')[0] : '',
      'Created At': t.createdAt.toISOString(),
      'Updated At': t.updatedAt.toISOString(),
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Tickets');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="tickets_export_${Date.now()}.xlsx"`,
    );
    res.send(buf);

    prisma.activityLog
      .create({
        data: {
          action: 'TICKETS_EXPORTED',
          entity: 'TICKET',
          entityId: userId,
          userId,
          details: { count: tickets.length },
        },
      })
      .catch(() => {});
  } catch {
    res.status(500).json({ message: 'Failed to export tickets' });
  }
};
