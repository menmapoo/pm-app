import * as XLSX from 'xlsx';
import prisma from '../utils/prisma';

export interface ImportRow {
  rowNumber: number;
  name: string;
  key: string;
  description?: string;
  status: 'ACTIVE' | 'ARCHIVED';
}

export interface ImportError {
  rowNumber: number;
  field: string;
  message: string;
}

export interface ImportPreviewResult {
  validRows: ImportRow[];
  errors: ImportError[];
  summary: {
    totalRows: number;
    validRows: number;
    errorRows: number;
  };
}

const VALID_STATUSES = ['active', 'archived'];

export const parseAndValidateImportFile = async (fileBuffer: Buffer): Promise<ImportPreviewResult> => {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  } catch {
    throw new Error('Failed to parse file. Ensure it is a valid CSV or Excel file.');
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('The file is empty or has no sheets.');
  }

  const sheet = workbook.Sheets[sheetName];
  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  if (rawRows.length === 0) {
    throw new Error('The file contains no data rows.');
  }

  // Normalize column names to lowercase, trimmed
  const normalizeColName = (k: string) => k.toLowerCase().trim().replace(/\s+/g, '_');
  const normalizedRows = rawRows.map(row => {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) {
      out[normalizeColName(k)] = String(v ?? '').trim();
    }
    return out;
  });

  const firstRow = normalizedRows[0];
  if (!('name' in firstRow) || !('key' in firstRow)) {
    throw new Error('Missing required columns: "name" and "key" must be present in the header row.');
  }

  // Fetch existing project keys from DB
  const existingProjects = await prisma.project.findMany({ select: { key: true } });
  const existingKeys = new Set(existingProjects.map(p => p.key.toUpperCase()));

  // First pass: count key occurrences to detect in-file duplicates
  const keyCount = new Map<string, number>();
  normalizedRows.forEach(row => {
    const rawKey = row['key'] || '';
    if (rawKey) {
      const k = rawKey.toUpperCase();
      keyCount.set(k, (keyCount.get(k) || 0) + 1);
    }
  });

  const validRows: ImportRow[] = [];
  const errors: ImportError[] = [];

  normalizedRows.forEach((row, index) => {
    const rowNumber = index + 2; // row 1 is header
    const rowErrors: ImportError[] = [];

    const name = row['name'] || '';
    const rawKey = row['key'] || '';
    const description = row['description'] || '';
    const rawStatus = row['status'] || '';

    if (!name) {
      rowErrors.push({ rowNumber, field: 'name', message: 'Project name is required' });
    }

    if (!rawKey) {
      rowErrors.push({ rowNumber, field: 'key', message: 'Project key is required' });
    } else {
      const normalizedKey = rawKey.toUpperCase();
      if ((keyCount.get(normalizedKey) || 0) > 1) {
        rowErrors.push({ rowNumber, field: 'key', message: `Duplicate key "${normalizedKey}" found in file` });
      } else if (existingKeys.has(normalizedKey)) {
        rowErrors.push({ rowNumber, field: 'key', message: `Key "${normalizedKey}" already exists in the database` });
      }
    }

    let status: 'ACTIVE' | 'ARCHIVED' = 'ACTIVE';
    if (rawStatus && !VALID_STATUSES.includes(rawStatus.toLowerCase())) {
      rowErrors.push({
        rowNumber,
        field: 'status',
        message: `Invalid status "${rawStatus}" — must be "active" or "archived"`,
      });
    } else if (rawStatus) {
      status = rawStatus.toLowerCase() === 'archived' ? 'ARCHIVED' : 'ACTIVE';
    }

    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
    } else {
      validRows.push({
        rowNumber,
        name,
        key: rawKey.toUpperCase(),
        description: description || undefined,
        status,
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

export const importProjects = async (rows: ImportRow[], userId: string) => {
  const created = await prisma.$transaction(async (tx) => {
    return Promise.all(
      rows.map(row =>
        tx.project.create({
          data: {
            name: row.name,
            key: row.key,
            description: row.description,
            status: row.status,
            members: { create: { userId, role: 'MANAGER' } },
          },
        })
      )
    );
  });

  await Promise.all(
    created.map(project =>
      prisma.activityLog.create({
        data: {
          action: 'PROJECT_IMPORTED',
          entity: 'PROJECT',
          entityId: project.id,
          userId,
          projectId: project.id,
          details: { name: project.name, key: project.key, importedViaCSV: true },
        },
      })
    )
  );

  return created;
};
