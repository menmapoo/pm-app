import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { ticketImportApi } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { FileDropzone } from '../../components/import/FileDropzone';
import { UploadProgress } from '../../components/import/UploadProgress';
import { ImportSummary } from '../../components/import/ImportSummary';
import { ImportErrorTable } from '../../components/import/ImportErrorTable';
import { ImportPreviewTable, ColumnDef } from '../../components/import/ImportPreviewTable';

interface ValidTicketRow {
  rowNumber: number;
  title: string;
  projectKey: string;
  projectId: string;
  description?: string;
  type: string;
  status: string;
  priority: string;
  assigneeEmail?: string;
  dueDate?: string;
}

interface ImportError {
  rowNumber: number;
  field: string;
  message: string;
}

interface PreviewResult {
  validRows: ValidTicketRow[];
  errors: ImportError[];
  summary: { totalRows: number; validRows: number; errorRows: number };
}

type Step = 'upload' | 'preview' | 'success';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onImported: () => void;
}

const typeColor: Record<string, string> = {
  BUG: 'bg-red-100 text-red-700',
  TASK: 'bg-blue-100 text-blue-700',
  STORY: 'bg-purple-100 text-purple-700',
  IMPROVEMENT: 'bg-teal-100 text-teal-700',
};
const statusColor: Record<string, string> = {
  BACKLOG: 'bg-slate-100 text-slate-600',
  TODO: 'bg-blue-50 text-blue-600',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  IN_REVIEW: 'bg-orange-100 text-orange-700',
  DONE: 'bg-green-100 text-green-700',
};
const priorityColor: Record<string, string> = {
  LOW: 'bg-slate-100 text-slate-500',
  MEDIUM: 'bg-blue-100 text-blue-600',
  HIGH: 'bg-orange-100 text-orange-700',
  HIGHEST: 'bg-red-100 text-red-700',
};

const Chip: React.FC<{ val: string; map: Record<string, string> }> = ({ val, map }) => (
  <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${map[val] ?? 'bg-slate-100 text-slate-600'}`}>
    {val?.replace(/_/g, ' ').toLowerCase() || '—'}
  </span>
);

const TICKET_COLUMNS: ColumnDef[] = [
  { key: 'rowNumber', label: 'Row', className: 'text-slate-400 font-mono w-12' },
  { key: 'title', label: 'Title', render: v => <span className="font-medium text-slate-800 max-w-[140px] truncate block">{v}</span> },
  { key: 'projectKey', label: 'Project', render: v => <code className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-mono">{v}</code> },
  { key: 'type', label: 'Type', render: v => <Chip val={v} map={typeColor} /> },
  { key: 'status', label: 'Status', render: v => <Chip val={v} map={statusColor} /> },
  { key: 'priority', label: 'Priority', render: v => <Chip val={v} map={priorityColor} /> },
  { key: 'assigneeEmail', label: 'Assignee', render: v => v ? <span className="text-slate-500 truncate block max-w-[120px]">{v}</span> : <span className="text-slate-300">—</span> },
  { key: 'dueDate', label: 'Due Date', render: v => v || <span className="text-slate-300">—</span> },
];

const triggerBlobDownload = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
};

export const TicketImportModal: React.FC<Props> = ({ isOpen, onClose, onImported }) => {
  const [step, setStep] = useState<Step>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [importedCount, setImportedCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);

  const reset = () => {
    setStep('upload');
    setSelectedFile(null);
    setUploadProgress(0);
    setIsProcessing(false);
    setPreviewing(false);
    setImporting(false);
    setPreview(null);
    setImportedCount(0);
    setSkippedCount(0);
  };

  const handleClose = () => { reset(); onClose(); };

  const handlePreview = async () => {
    if (!selectedFile) return;
    setPreviewing(true);
    setUploadProgress(0);
    setIsProcessing(false);
    try {
      const res = await ticketImportApi.preview(selectedFile, (p) => {
        setUploadProgress(p);
        if (p === 100) setIsProcessing(true);
      });
      setPreview(res.data);
      setSkippedCount(res.data.summary.errorRows);
      setStep('preview');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to parse file');
    } finally {
      setPreviewing(false);
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    if (!preview || preview.validRows.length === 0) return;
    setImporting(true);
    try {
      const res = await ticketImportApi.confirm(preview.validRows);
      setImportedCount(res.data.count);
      setStep('success');
      onImported();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await ticketImportApi.downloadTemplate();
      triggerBlobDownload(new Blob([res.data], { type: 'text/csv' }), 'tickets_template.csv');
    } catch {
      toast.error('Failed to download template');
    }
  };

  const hasValidRows = (preview?.validRows.length ?? 0) > 0;
  const hasErrors = (preview?.errors.length ?? 0) > 0;

  const renderUpload = () => (
    <div className="space-y-4">
      <FileDropzone
        selectedFile={selectedFile}
        onFileSelect={setSelectedFile}
        onRemove={() => setSelectedFile(null)}
        onError={msg => toast.error(msg)}
      />

      {previewing && (
        <UploadProgress progress={uploadProgress} isProcessing={isProcessing} />
      )}

      <div className="bg-slate-50 rounded-lg p-4 space-y-3">
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Required format</p>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="font-medium text-slate-600 mb-1">Required</p>
            <ul className="space-y-1 text-slate-500">
              <li><code className="bg-white px-1 rounded border border-slate-200">title</code></li>
              <li><code className="bg-white px-1 rounded border border-slate-200">projectKey</code> — must exist</li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-slate-600 mb-1">Optional</p>
            <ul className="space-y-1 text-slate-500">
              <li><code className="bg-white px-1 rounded border border-slate-200">description</code></li>
              <li><code className="bg-white px-1 rounded border border-slate-200">type</code> — bug/task/story/improvement</li>
              <li><code className="bg-white px-1 rounded border border-slate-200">status</code> — backlog/todo/in_progress…</li>
              <li><code className="bg-white px-1 rounded border border-slate-200">priority</code> — low/medium/high/highest</li>
              <li><code className="bg-white px-1 rounded border border-slate-200">assigneeEmail</code></li>
              <li><code className="bg-white px-1 rounded border border-slate-200">dueDate</code> — YYYY-MM-DD</li>
            </ul>
          </div>
        </div>
        <div className="pt-2 border-t border-slate-200">
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download sample template
          </button>
        </div>
      </div>
    </div>
  );

  const renderPreview = () => {
    if (!preview) return null;
    const { validRows, errors, summary } = preview;

    return (
      <div className="space-y-4">
        <ImportSummary
          totalRows={summary.totalRows}
          validRows={summary.validRows}
          errorRows={summary.errorRows}
        />

        {errors.length > 0 && <ImportErrorTable errors={errors} />}

        {validRows.length > 0 && (
          <ImportPreviewTable
            rows={validRows as unknown as Record<string, any>[]}
            columns={TICKET_COLUMNS}
            label={hasErrors
              ? `${validRows.length} valid row${validRows.length !== 1 ? 's' : ''} to be imported`
              : 'Tickets to import'}
          />
        )}

        {validRows.length === 0 ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 text-center">
            No valid rows found. Please fix your file and upload again.
          </div>
        ) : hasErrors && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
            <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Rows with errors will be skipped. Valid rows can still be imported.
          </div>
        )}
      </div>
    );
  };

  const renderSuccess = () => (
    <div className="py-4 text-center space-y-3">
      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
        <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div>
        <p className="text-base font-semibold text-slate-900">Import complete!</p>
        <p className="text-sm text-slate-500 mt-1">
          {skippedCount > 0
            ? `Import completed: ${importedCount} record${importedCount !== 1 ? 's' : ''} imported successfully, ${skippedCount} row${skippedCount !== 1 ? 's' : ''} skipped.`
            : `${importedCount} ticket${importedCount !== 1 ? 's' : ''} imported successfully.`}
        </p>
      </div>
    </div>
  );

  const getFooter = () => {
    if (step === 'success') return <Button onClick={handleClose}>Done</Button>;
    if (step === 'preview') {
      return (
        <>
          <Button variant="secondary" onClick={() => { setStep('upload'); setPreview(null); }}>
            Back
          </Button>
          <Button
            onClick={handleImport}
            loading={importing}
            disabled={!hasValidRows}
            title={!hasValidRows ? 'No valid rows to import' : undefined}
          >
            Import {preview?.validRows.length ?? 0} Ticket{(preview?.validRows.length ?? 0) !== 1 ? 's' : ''}
            {hasErrors ? ` (skip ${preview?.summary.errorRows})` : ''}
          </Button>
        </>
      );
    }
    return (
      <>
        <Button variant="secondary" onClick={handleClose}>Cancel</Button>
        <Button onClick={handlePreview} loading={previewing} disabled={!selectedFile || previewing}>
          Preview
        </Button>
      </>
    );
  };

  const titles: Record<Step, string> = {
    upload: 'Import Tickets',
    preview: 'Preview Import',
    success: 'Import Complete',
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={titles[step]} size="xl" footer={getFooter()}>
      {step === 'upload' && renderUpload()}
      {step === 'preview' && renderPreview()}
      {step === 'success' && renderSuccess()}
    </Modal>
  );
};
