import React from 'react';

export interface ColumnDef {
  key: string;
  label: string;
  className?: string;
  render?: (value: any, row: Record<string, any>) => React.ReactNode;
}

interface ImportPreviewTableProps {
  rows: Record<string, any>[];
  columns: ColumnDef[];
  label?: string;
}

export const ImportPreviewTable: React.FC<ImportPreviewTableProps> = ({
  rows,
  columns,
  label,
}) => (
  <div className="space-y-1.5">
    {label && (
      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</p>
    )}
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto max-h-56 overflow-y-auto">
        <table className="w-full text-xs min-w-max">
          <thead className="bg-slate-50 sticky top-0 z-10">
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  className={`text-left px-3 py-2 text-slate-500 font-medium whitespace-nowrap ${col.className ?? ''}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, i) => (
              <tr key={i} className="bg-white hover:bg-slate-50">
                {columns.map(col => (
                  <td key={col.key} className={`px-3 py-2 ${col.className ?? ''}`}>
                    {col.render
                      ? col.render(row[col.key], row)
                      : (row[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);
