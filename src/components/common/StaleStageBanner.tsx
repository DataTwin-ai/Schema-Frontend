'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface StaleStageBannerProps {
  stageName?: string;
  reason?: string;
  onRegenerate: () => void;
  isRegenerating?: boolean;
}

export const StaleStageBanner: React.FC<StaleStageBannerProps> = ({
  stageName,
  reason,
  onRegenerate,
  isRegenerating = false,
}) => {
  return (
    <div className="mb-4 p-3.5 rounded-xl border border-amber-300 dark:border-amber-700/60 bg-amber-50/70 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 flex items-center justify-between shadow-xs animate-in fade-in duration-150">
      <div className="flex items-center space-x-2.5">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <div className="text-xs">
          <span className="font-semibold">{stageName ? `Inputs for ${stageName} have changed. ` : 'Inputs have changed. '}</span>
          <span className="text-amber-800 dark:text-amber-300">
            {reason || 'This stage’s data may be stale and should be regenerated.'}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={onRegenerate}
        disabled={isRegenerating}
        className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 shadow-xs ml-3"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
        <span>{isRegenerating ? 'Regenerating...' : 'Regenerate'}</span>
      </button>
    </div>
  );
};
