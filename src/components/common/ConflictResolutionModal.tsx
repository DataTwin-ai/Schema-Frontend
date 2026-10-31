'use client';

import React, { useState } from 'react';
import { AlertTriangle, X, Check, ArrowRight, Eye, RefreshCw } from 'lucide-react';
import { VersionDiffViewer, VersionOption } from '../requirements/VersionDiffViewer';

export interface ConflictInfo {
  key: string;
  localContent: string;
  serverContent: string;
  serverVersion: number;
}

interface ConflictResolutionModalProps {
  conflict: ConflictInfo | null;
  onKeepMine: (conflict: ConflictInfo) => void;
  onTakeServer: (conflict: ConflictInfo) => void;
  onClose: () => void;
}

export const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
  conflict,
  onKeepMine,
  onTakeServer,
  onClose,
}) => {
  const [showDiff, setShowDiff] = useState(false);

  if (!conflict) return null;

  const fileName = conflict.key.split('/').pop() || conflict.key;
  const versionOptions: VersionOption[] = [
    { id: 'server', label: `Server (v${conflict.serverVersion})` },
    { id: 'local', label: 'Local (Unsaved)' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className={`bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col w-full transition-all ${
        showDiff ? 'max-w-5xl h-[85vh]' : 'max-w-lg'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 bg-amber-500/5">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                Version Conflict Detected
              </h3>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-mono">
                {fileName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
            This file was modified on the server while you were editing (server is at version{' '}
            <span className="font-mono font-bold text-neutral-900 dark:text-white">v{conflict.serverVersion}</span>).
            Choose how you would like to resolve this conflict:
          </p>

          {showDiff && (
            <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden mt-3 h-[52vh]">
              <VersionDiffViewer
                previousTitle={`Server Version (v${conflict.serverVersion})`}
                currentTitle="Your Changes (Local)"
                previousContent={conflict.serverContent}
                currentContent={conflict.localContent}
                previousActor="Server"
                previousTimestamp={`v${conflict.serverVersion}`}
                currentActor="You"
                currentTimestamp="Unsaved Local Edits"
                versionOptions={versionOptions}
                selectedPreviousVersionId="server"
                selectedCurrentVersionId="local"
                onSelectPreviousVersion={() => {}}
                onSelectCurrentVersion={() => {}}
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 bg-neutral-50 dark:bg-neutral-950 border-t border-neutral-100 dark:border-neutral-800 text-xs">
          <button
            onClick={() => setShowDiff(!showDiff)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg font-semibold transition-colors cursor-pointer border border-neutral-200 dark:border-neutral-700"
          >
            <Eye className="h-3.5 w-3.5" />
            <span>{showDiff ? 'Hide Comparison' : 'Compare'}</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onTakeServer(conflict)}
              className="flex items-center space-x-1 px-3 py-1.5 bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded-lg font-semibold transition-colors cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Take Server</span>
            </button>
            <button
              onClick={() => onKeepMine(conflict)}
              className="flex items-center space-x-1 px-4 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-100 dark:text-neutral-900 rounded-lg font-semibold transition-colors cursor-pointer shadow-xs"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Keep Mine</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
