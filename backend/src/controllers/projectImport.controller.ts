import * as XLSX from 'xlsx';
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { parseAndValidateImportFile, importProjects, ImportRow } from '../services/projectImport.service';
import prisma from '../utils/prisma';

export const previewImport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }
    const result = await parseAndValidateImportFile(req.file.buffer);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ message: err.message || 'Failed to parse file' });
  }
};

export const confirmImport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { rows } = req.body as { rows: ImportRow[] };
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      res.status(400).json({ message: 'No valid rows provided for import' });
      return;
    }
    const userId = req.user!.userId;
    const created = await importProjects(rows, userId);
    res.json({
      message: `Successfully imported ${created.length} project(s)`,
      count: created.length,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to import projects' });
  }
};

export const downloadTemplate = (_req: AuthRequest, res: Response): void => {
  const csv = [
    'name,key,description,status',
    'Customer Portal,FSS,Customer-facing project,active',
    'AI Platform,CAT,AI content generation project,active',
    'Internal HR,HR,Human resources system,archived',
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="projects_template.csv"');
  res.send(csv);
};

export const exportProjects = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const role = req.user!.role;

    const where = role === 'ADMIN' ? {} : { members: { some: { userId } } };

    const projects = await prisma.project.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const rows = projects.map(p => ({
      Name: p.name,
      Key: p.key,
      Description: p.description ?? '',
      Status: p.status,
      'Created At': p.createdAt.toISOString(),
      'Updated At': p.updatedAt.toISOString(),
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Projects');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="projects_export_${Date.now()}.xlsx"`,
    );
    res.send(buf);

    prisma.activityLog
      .create({
        data: {
          action: 'PROJECTS_EXPORTED',
          entity: 'PROJECT',
          entityId: userId,
          userId,
          details: { count: projects.length },
        },
      })
      .catch(() => {});
  } catch {
    res.status(500).json({ message: 'Failed to export projects' });
  }
};
