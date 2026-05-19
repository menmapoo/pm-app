import React from 'react';

interface UploadProgressProps {
  progress: number;    // 0–100 (upload phase)
  isProcessing: boolean; // true once upload=100% while server validates
}

export const UploadProgress: React.FC<UploadProgressProps> = ({ progress, isProcessing }) => {
  const label = isProcessing
    ? 'Processing and validating file...'
    : `Uploading file... ${progress}%`;

  return (
    <div className="space-y-3 py-2">
      <div className="flex items-center gap-3">
        <svg className="animate-spin w-4 h-4 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="text-sm text-slate-600">{label}</span>
      </div>

      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-300 ease-out"
          style={{ width: isProcessing ? '100%' : `${progress}%` }}
        />
      </div>

      {isProcessing && (
        <p className="text-xs text-slate-400">
          This may take a moment for large files...
        </p>
      )}
    </div>
  );
};
