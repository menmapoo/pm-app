import React from 'react';

export interface ImportError {
  rowNumber: number;
  field: string;
  message: string;
}

interface ImportErrorTableProps {
  errors: ImportError[];
}

export const ImportErrorTable: React.FC<ImportErrorTableProps> = ({ errors }) => (
  <div className="space-y-1.5">
    <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">
      Validation errors — {errors.length} issue{errors.length !== 1 ? 's' : ''} found
    </p>
    <div className="border border-red-200 rounded-lg overflow-hidden">
      <table className="w-full text-xs">
        <thead className="bg-red-50">
          <tr>
            <th className="text-left px-3 py-2 text-red-700 font-medium w-16">Row</th>
            <th className="text-left px-3 py-2 text-red-700 font-medium w-32">Field</th>
            <th className="text-left px-3 py-2 text-red-700 font-medium">Issue</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-red-100">
          {errors.map((err, i) => (
            <tr key={i} className="bg-white">
              <td className="px-3 py-2 text-slate-500 font-mono">{err.rowNumber}</td>
              <td className="px-3 py-2">
                <code className="bg-red-50 border border-red-100 px-1 rounded text-red-600">
                  {err.field}
                </code>
              </td>
              <td className="px-3 py-2 text-slate-600">{err.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);
