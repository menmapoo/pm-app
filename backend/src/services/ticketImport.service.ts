import * as XLSX from 'xlsx';
import prisma from '../utils/prisma';

type TicketType = 'BUG' | 'TASK' | 'STORY' | 'IMPROVEMENT';
type TicketStatus = 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'HIGHEST';

export interface ValidTicketRow {
  rowNumber: number;
  title: string;
  projectKey: string;
  projectId: string;
  description?: string;
  type: TicketType;
  status: TicketStatus;
  priority: TicketPriority;
  assigneeId?: string;
  assigneeEmail?: string;
  dueDate?: string;
}

export interface TicketImportError {
  rowNumber: number;
  field: string;
  message: string;
}

export interface TicketImportPreviewResult {
  validRows: ValidTicketRow[];
  errors: TicketImportError[];
  summary: { totalRows: number; validRows: number; errorRows: number };
}

const TYPE_MAP: Record<string, TicketType> = {
  bug: 'BUG', task: 'TASK', story: 'STORY', improvement: 'IMPROVEMENT',
};
const STATUS_MAP: Record<string, TicketStatus> = {
  backlog: 'BACKLOG', todo: 'TODO', in_progress: 'IN_PROGRESS', in_review: 'IN_REVIEW', done: 'DONE',
};
const PRIORITY_MAP: Record<string, TicketPriority> = {
  low: 'LOW', medium: 'MEDIUM', high: 'HIGH', highest: 'HIGHEST',
};

// Converts camelCase and spaced headers to snake_case
const normalizeColName = (k: string) =>
  k.trim()
   .replace(/([A-Z])/g, '_$1')
   .toLowerCase()
   .replace(/[\s-]+/g, '_')
   .replace(/_+/g, '_')
   .replace(/^_|_$/g, '');

export const parseAndValidateTicketImportFile = async (
  fileBuffer: Buffer,
): Promise<TicketImportPreviewResult> => {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  } catch {
    throw new Error('Failed to parse file. Ensure it is a valid CSV or Excel file.');
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('The file is empty or has no sheets.');

  const sheet = workbook.Sheets[sheetName];
  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, {
    defval: '',
    raw: false, // format all values as strings (important for dates in xlsx)
  });

  if (rawRows.length === 0) throw new Error('The file contains no data rows.');

  const normalizedRows = rawRows.map(row => {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) {
      out[normalizeColName(k)] = String(v ?? '').trim();
    }
    return out;
  });

  const firstRow = normalizedRows[0];
  if (!('title' in firstRow) || !('project_key' in firstRow)) {
    throw new Error(
      'Missing required columns: "title" and "projectKey" must be present in the header row.',
    );
  }

  const [allProjects, allUsers] = await Promise.all([
    prisma.project.findMany({ select: { id: true, key: true } }),
    prisma.user.findMany({ select: { id: true, email: true } }),
  ]);

  const projectByKey = new Map(allProjects.map(p => [p.key.toUpperCase(), p]));
  const userByEmail = new Map(allUsers.map(u => [u.email.toLowerCase(), u]));

  const validRows: ValidTicketRow[] = [];
  const errors: TicketImportError[] = [];

  normalizedRows.forEach((row, index) => {
    const rowNumber = index + 2;
    const rowErrors: TicketImportError[] = [];

    const title = row['title'] || '';
    const rawProjectKey = row['project_key'] || '';
    const description = row['description'] || '';
    const rawType = row['type'] || '';
    const rawStatus = row['status'] || '';
    const rawPriority = row['priority'] || '';
    const rawAssigneeEmail = row['assignee_email'] || '';
    const rawDueDate = row['due_date'] || '';

    if (!title) {
      rowErrors.push({ rowNumber, field: 'title', message: 'Title is required' });
    }

    let projectId = '';
    let projectKey = '';
    if (!rawProjectKey) {
      rowErrors.push({ rowNumber, field: 'projectKey', message: 'Project key is required' });
    } else {
      const project = projectByKey.get(rawProjectKey.toUpperCase());
      if (!project) {
        rowErrors.push({ rowNumber, field: 'projectKey', message: `Project "${rawProjectKey}" not found` });
      } else {
        projectId = project.id;
        projectKey = project.key;
      }
    }

    let type: TicketType = 'TASK';
    if (rawType) {
      const mapped = TYPE_MAP[rawType.toLowerCase().replace(/\s+/g, '_')];
      if (!mapped) {
        rowErrors.push({
          rowNumber, field: 'type',
          message: `Invalid type "${rawType}" — must be bug, task, story, or improvement`,
        });
      } else {
        type = mapped;
      }
    }

    let status: TicketStatus = 'BACKLOG';
    if (rawStatus) {
      const mapped = STATUS_MAP[rawStatus.toLowerCase().replace(/[\s-]+/g, '_')];
      if (!mapped) {
        rowErrors.push({
          rowNumber, field: 'status',
          message: `Invalid status "${rawStatus}" — must be backlog, todo, in_progress, in_review, or done`,
        });
      } else {
        status = mapped;
      }
    }

    let priority: TicketPriority = 'MEDIUM';
    if (rawPriority) {
      const mapped = PRIORITY_MAP[rawPriority.toLowerCase()];
      if (!mapped) {
        rowErrors.push({
          rowNumber, field: 'priority',
          message: `Invalid priority "${rawPriority}" — must be low, medium, high, or highest`,
        });
      } else {
        priority = mapped;
      }
    }

    let assigneeId: string | undefined;
    let assigneeEmail: string | undefined;
    if (rawAssigneeEmail) {
      const user = userByEmail.get(rawAssigneeEmail.toLowerCase());
      if (!user) {
        rowErrors.push({ rowNumber, field: 'assigneeEmail', message: `User "${rawAssigneeEmail}" not found` });
      } else {
        assigneeId = user.id;
        assigneeEmail = user.email;
      }
    }

    let dueDate: string | undefined;
    if (rawDueDate) {
      const d = new Date(rawDueDate);
      if (isNaN(d.getTime())) {
        rowErrors.push({ rowNumber, field: 'dueDate', message: `Invalid date "${rawDueDate}"` });
      } else {
        dueDate = d.toISOString().split('T')[0];
      }
    }

    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
    } else {
      validRows.push({
        rowNumber, title, projectKey, projectId,
        description: description || undefined,
        type, status, priority,
        assigneeId, assigneeEmail,
        dueDate,
      });
    }
  });

  return {
    validRows,
    errors,
    summary: {
      totalRows: normalizedRows.length,
      validRows: validRows.length,
      errorRows: normalizedRows.length - validRows.length,
    },
  };
};

export const importTickets = async (rows: ValidTicketRow[], userId: string) => {
  const projectIds = [...new Set(rows.map(r => r.projectId))];

  const countMap = new Map<string, number>();
  await Promise.all(
    projectIds.map(async (projectId) => {
      const count = await prisma.ticket.count({ where: { projectId } });
      countMap.set(projectId, count);
    }),
  );

  const counterMap = new Map(countMap);

  const created = await prisma.$transaction(async (tx) => {
    const results = [];
    for (const row of rows) {
      const next = (counterMap.get(row.projectId) || 0) + 1;
      counterMap.set(row.projectId, next);

      const ticket = await tx.ticket.create({
        data: {
          key: `${row.projectKey}-${next}`,
          title: row.title,
          description: row.description,
          type: row.type,
          status: row.status,
          priority: row.priority,
          projectId: row.projectId,
          assigneeId: row.assigneeId ?? null,
          reporterId: userId,
          dueDate: row.dueDate ? new Date(row.dueDate) : null,
        },
      });
      results.push(ticket);
    }
    return results;
  });

  await Promise.all(
    created.map(ticket =>
      prisma.activityLog.create({
        data: {
          action: 'TICKET_IMPORTED',
          entity: 'TICKET',
          entityId: ticket.id,
          userId,
          projectId: ticket.projectId,
          ticketId: ticket.id,
          details: { key: ticket.key, title: ticket.title, importedViaCSV: true },
        },
      }),
    ),
  );

  return created;
};
