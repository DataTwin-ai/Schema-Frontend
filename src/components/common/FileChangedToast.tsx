'use client';

import React from 'react';
import { AlertCircle, RefreshCw, X } from 'lucide-react';

export interface DirtyFileNotice {
  key: string;
  serverContent: string;
  serverVersion: number;
}

interface FileChangedToastProps {
  notice: DirtyFileNotice | null;
  onReload: (notice: DirtyFileNotice) => void;
  onKeepEditing: () => void;
}

export const FileChangedToast: React.FC<FileChangedToastProps> = ({
  notice,
  onReload,
  onKeepEditing,
}) => {
  if (!notice) return null;

  const fileName = notice.key.split('/').pop() || notice.key;

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 px-4 py-3.5 rounded-xl shadow-2xl border border-neutral-700 dark:border-neutral-200 animate-in slide-in-from-bottom-3 duration-200">
      <div className="flex items-start space-x-3">
        <AlertCircle className="h-5 w-5 text-amber-400 dark:text-amber-600 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0 space-y-1">
          <h4 className="text-xs font-bold leading-tight">This file changed on the server</h4>
          <p className="text-[11px] text-neutral-300 dark:text-neutral-600 font-mono truncate">
            {fileName} (v{notice.serverVersion})
          </p>
          <div className="flex items-center space-x-2 pt-2">
            <button
              onClick={() => onReload(notice)}
              className="flex items-center space-x-1 px-2.5 py-1 bg-white text-neutral-900 dark:bg-neutral-900 dark:text-white rounded-md text-[11px] font-bold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Reload</span>
            </button>
            <button
              onClick={onKeepEditing}
              className="px-2.5 py-1 text-neutral-300 dark:text-neutral-600 hover:text-white dark:hover:text-neutral-900 rounded-md text-[11px] font-medium transition-colors cursor-pointer"
            >
              Keep editing
            </button>
          </div>
        </div>
        <button
          onClick={onKeepEditing}
          className="text-neutral-400 hover:text-white dark:hover:text-neutral-900 p-0.5 rounded transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
