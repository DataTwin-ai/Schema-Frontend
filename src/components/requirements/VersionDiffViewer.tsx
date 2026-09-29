'use client';

import React, { useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { computeVersionDiff, DiffToken, DiffLine } from '../../utils/diffUtils';

export interface VersionOption {
  id: string;
  label: string;
}

export interface VersionDiffViewerProps {
  previousTitle: string;
  currentTitle: string;
  previousContent: string;
  currentContent: string;
  previousActor: string;
  previousTimestamp: string;
  previousChangeSummary?: string;
  isPreviousCurrent?: boolean;
  currentActor?: string;
  currentTimestamp?: string;
  currentStatus?: string;
  isCurrentReal?: boolean;
  versionOptions: VersionOption[];
  selectedPreviousVersionId: string;
  selectedCurrentVersionId: string;
  onSelectPreviousVersion: (id: string) => void;
  onSelectCurrentVersion: (id: string) => void;
  onRestoreVersion?: () => void;
}

export const VersionDiffViewer: React.FC<VersionDiffViewerProps> = ({
  previousTitle,
  currentTitle,
  previousContent,
  currentContent,
  previousActor,
  previousTimestamp,
  previousChangeSummary,
  isPreviousCurrent = false,
  currentActor = 'You',
  currentTimestamp = 'Active Current State',
  currentStatus = 'Live editable source of truth in workspace',
  isCurrentReal = true,
  versionOptions,
  selectedPreviousVersionId,
  selectedCurrentVersionId,
  onSelectPreviousVersion,
  onSelectCurrentVersion,
  onRestoreVersion,
}) => {
  const diffResult = useMemo(
    () => computeVersionDiff(previousContent, currentContent, previousTitle, currentTitle),
    [previousContent, currentContent, previousTitle, currentTitle]
  );

  const renderToken = (token: DiffToken, index: number, side: 'previous' | 'current') => {
    if (token.type === 'unchanged') {
      return <span key={index}>{token.value}</span>;
    }

    if (token.type === 'removed' && side === 'previous') {
      return (
        <span
          key={index}
          className="bg-rose-100/90 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200 line-through decoration-rose-500/70 px-1 py-0.5 rounded-sm font-medium transition-colors"
          title="Removed content"
        >
          {token.value}
        </span>
      );
    }

    if (token.type === 'added' && side === 'current') {
      return (
        <span
          key={index}
          className="bg-emerald-100/90 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 px-1 py-0.5 rounded-sm font-semibold transition-colors"
          title="Added content"
        >
          {token.value}
        </span>
      );
    }

    return <span key={index}>{token.value}</span>;
  };

  const renderLine = (line: DiffLine, lineIdx: number, side: 'previous' | 'current') => {
    if (line.type === 'unchanged') {
      return (
        <div key={lineIdx} className="py-0.5 min-h-[1.375rem] text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap">
          {line.text || ' '}
        </div>
      );
    }

    if (line.type === 'removed' && side === 'previous') {
      return (
        <div
          key={lineIdx}
          className="py-0.5 px-1.5 my-0.5 rounded bg-rose-50/90 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 line-through decoration-rose-400/80 border-l-2 border-rose-400 dark:border-rose-500 min-h-[1.375rem] whitespace-pre-wrap"
        >
          {line.text || ' '}
        </div>
      );
    }

    if (line.type === 'added' && side === 'current') {
      return (
        <div
          key={lineIdx}
          className="py-0.5 px-1.5 my-0.5 rounded bg-emerald-50/90 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border-l-2 border-emerald-500 dark:border-emerald-400 min-h-[1.375rem] whitespace-pre-wrap"
        >
          {line.text || ' '}
        </div>
      );
    }

    if (line.type === 'modified') {
      return (
        <div
          key={lineIdx}
          className={`py-0.5 px-1.5 my-0.5 rounded min-h-[1.375rem] whitespace-pre-wrap ${
            side === 'previous'
              ? 'bg-rose-50/40 dark:bg-rose-950/20 border-l-2 border-rose-300 dark:border-rose-700/60 text-neutral-800 dark:text-neutral-200'
              : 'bg-emerald-50/40 dark:bg-emerald-950/20 border-l-2 border-emerald-400 dark:border-emerald-600/60 text-neutral-800 dark:text-neutral-200'
          }`}
        >
          {line.tokens.map((tok, tIdx) => renderToken(tok, tIdx, side))}
        </div>
      );
    }

    return (
      <div key={lineIdx} className="py-0.5 min-h-[1.375rem] text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap">
        {line.text || ' '}
      </div>
    );
  };

  return (
    <div className="space-y-2.5">
      {/* Change Statistics Indicator */}
      {diffResult.summary.hasChanges && (
        <div className="flex items-center justify-end space-x-2.5 text-[11px] font-mono">
          {diffResult.summary.additions > 0 && (
            <span className="inline-flex items-center space-x-1 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200/80 dark:border-emerald-800/60">
              <span className="font-bold">+{diffResult.summary.additions}</span>
              <span>{diffResult.summary.additions === 1 ? 'addition' : 'additions'}</span>
            </span>
          )}
          {diffResult.summary.removals > 0 && (
            <span className="inline-flex items-center space-x-1 text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded border border-rose-200/80 dark:border-rose-800/60">
              <span className="font-bold">-{diffResult.summary.removals}</span>
              <span>{diffResult.summary.removals === 1 ? 'removal' : 'removals'}</span>
            </span>
          )}
        </div>
      )}

      {/* Symmetrical Side-by-Side Comparison Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* LEFT PANEL: PREVIOUS VERSION */}
        <div className="flex flex-col rounded-xl border border-neutral-200 dark:border-neutral-700/80 bg-neutral-50/70 dark:bg-neutral-900/70 p-3.5 space-y-2.5 overflow-hidden">
          {/* Previous Header Info */}
          <div className="pb-2 border-b border-neutral-200 dark:border-neutral-800 space-y-1.5">
            <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700">
                  Previous Version
                </span>
                {!isPreviousCurrent && onRestoreVersion && (
                  <button onClick={onRestoreVersion} className="px-2 py-0.5 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded text-[10px] font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700">
                    Restore this version
                  </button>
                )}
              </div>

              {/* Compact Dropdown Selector */}
              <div className="relative inline-flex items-center">
                <select
                  id="select-previous-version"
                  aria-label="Select Previous Version"
                  value={selectedPreviousVersionId}
                  onChange={(e) => onSelectPreviousVersion(e.target.value)}
                  className="appearance-none bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-mono font-semibold rounded-md pl-2.5 pr-6 py-0.5 focus:outline-none focus:ring-1 focus:ring-neutral-400 dark:focus:ring-neutral-500 cursor-pointer shadow-2xs hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors"
                >
                  {versionOptions.map((opt) => (
                    <option key={opt.id} value={opt.id} disabled={opt.id === selectedCurrentVersionId}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 absolute right-1.5 pointer-events-none" />
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400 pt-0.5">
              <span className="font-medium text-neutral-700 dark:text-neutral-300">{previousActor}</span>
              <span className="font-mono text-[10px]">{previousTimestamp}</span>
            </div>

            {previousChangeSummary && (
              <p className="text-[11px] text-neutral-600 dark:text-neutral-400 bg-neutral-100/90 dark:bg-neutral-800/90 px-2 py-1 rounded border border-neutral-200/80 dark:border-neutral-700/80">
                <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                  {isPreviousCurrent ? 'Status: ' : 'Change: '}
                </span>
                {previousChangeSummary}
              </p>
            )}
          </div>

          {/* Previous Title */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 block mb-1">
              Requirement Title
            </label>
            <div className="p-2 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs font-semibold text-neutral-800 dark:text-neutral-200 leading-normal">
              {diffResult.titleDiff.hasChanges ? (
                diffResult.titleDiff.previousTokens.map((tok, i) => renderToken(tok, i, 'previous'))
              ) : (
                previousTitle
              )}
            </div>
          </div>

          {/* Previous Specification & Details */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                Specification & Details
              </label>
              <span className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500">
                {previousContent.split('\n').length} lines · {previousContent.length.toLocaleString()} chars
              </span>
            </div>
            <div className="min-h-[140px] max-h-[420px] overflow-y-auto bg-white dark:bg-neutral-950 p-3 text-xs font-mono text-neutral-800 dark:text-neutral-200 rounded-lg border border-neutral-200 dark:border-neutral-800 leading-relaxed select-text">
              {diffResult.previousLines.map((l, i) => renderLine(l, i, 'previous'))}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: CURRENT VERSION */}
        <div className="flex flex-col rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 p-3.5 space-y-2.5 overflow-hidden shadow-xs ring-1 ring-neutral-900/5 dark:ring-white/5">
          {/* Current Header Info */}
          <div className="pb-2 border-b border-neutral-200 dark:border-neutral-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-neutral-900 dark:bg-white text-white dark:text-neutral-900">
                Current Version
              </span>

              {/* Compact Dropdown Selector */}
              <div className="relative inline-flex items-center">
                <select
                  id="select-current-version"
                  aria-label="Select Current Version"
                  value={selectedCurrentVersionId}
                  onChange={(e) => onSelectCurrentVersion(e.target.value)}
                  className="appearance-none bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-mono font-semibold rounded-md pl-2.5 pr-6 py-0.5 focus:outline-none focus:ring-1 focus:ring-neutral-400 dark:focus:ring-neutral-500 cursor-pointer shadow-2xs hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors"
                >
                  {versionOptions.map((opt) => (
                    <option key={opt.id} value={opt.id} disabled={opt.id === selectedPreviousVersionId}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 absolute right-1.5 pointer-events-none" />
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400 pt-0.5">
              <span className="font-medium text-neutral-700 dark:text-neutral-300">{currentActor}</span>
              <span className="font-mono text-[10px]">{currentTimestamp}</span>
            </div>

            {currentStatus && (
              <p className="text-[11px] text-neutral-600 dark:text-neutral-400 bg-neutral-100/90 dark:bg-neutral-800/90 px-2 py-1 rounded border border-neutral-200/80 dark:border-neutral-700/80">
                <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                  {isCurrentReal ? 'Status: ' : 'Change: '}
                </span>
                {currentStatus}
              </p>
            )}
          </div>

          {/* Current Title */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 block mb-1">
              Requirement Title
            </label>
            <div className="p-2 bg-neutral-50/80 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs font-semibold text-neutral-900 dark:text-white leading-normal">
              {diffResult.titleDiff.hasChanges ? (
                diffResult.titleDiff.currentTokens.map((tok, i) => renderToken(tok, i, 'current'))
              ) : (
                currentTitle
              )}
            </div>
          </div>

          {/* Current Specification & Details */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                Specification & Details
              </label>
              <span className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500">
                {currentContent.split('\n').length} lines · {currentContent.length.toLocaleString()} chars
              </span>
            </div>
            <div className="min-h-[140px] max-h-[420px] overflow-y-auto bg-neutral-50/80 dark:bg-neutral-950 p-3 text-xs font-mono text-neutral-900 dark:text-neutral-100 rounded-lg border border-neutral-200 dark:border-neutral-800 leading-relaxed select-text">
              {diffResult.currentLines.map((l, i) => renderLine(l, i, 'current'))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
