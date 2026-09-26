'use client';

import React from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import { WorkflowStage } from '../../types';
import { Check } from 'lucide-react';

interface StageConfig {
  id: WorkflowStage;
  number: number;
  label: string;
}

const stages: StageConfig[] = [
  { id: 'business-input', number: 1, label: 'Business Input' },
  { id: 'requirements', number: 2, label: 'Requirements' },
  { id: 'scdp-input', number: 3, label: 'SCDP Input' },
  { id: 'schema', number: 4, label: 'Schema Output' },
  { id: 'output', number: 5, label: 'Final Output' },
];

export const WorkflowNavigation: React.FC = () => {
  const { workflow, setStage } = useWorkflow();

  const isStageAccessible = (stageId: WorkflowStage) => {
    if (stageId === 'business-input') return true;
    if (stageId === 'requirements') return !!workflow.requirements;
    if (stageId === 'scdp-input') return !!workflow.requirements;
    if (stageId === 'schema') return !!workflow.schema;
    if (stageId === 'output') return !!workflow.schema;
    return false;
  };

  const isStageCompleted = (stageIdx: number) => {
    if (stageIdx === 0) return !!workflow.requirements;
    if (stageIdx === 1) return !!workflow.requirements && (workflow.stage === 'scdp-input' || workflow.stage === 'schema' || workflow.stage === 'output' || !!workflow.schema);
    if (stageIdx === 2) return !!workflow.schema;
    if (stageIdx === 3) return !!workflow.schema && workflow.stage === 'output';
    if (stageIdx === 4) return false;
    return false;
  };

  return (
    <nav
      aria-label="Pipeline"
      className="w-32 lg:w-36 bg-neutral-50/50 dark:bg-neutral-900/60 border-r border-neutral-200 dark:border-neutral-800 flex flex-col px-2 py-3.5 select-none shrink-0 h-full overflow-y-auto transition-colors duration-150"
    >
      {/* Minimal Header */}
      <div className="mb-3 px-1">
        <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
          Pipeline
        </span>
      </div>

      {/* Minimal Vertical Stepper Rail */}
      <div className="flex flex-col space-y-0">
        {stages.map((st, idx) => {
          const isActive = workflow.stage === st.id;
          const isCompleted = isStageCompleted(idx);
          const accessible = isStageAccessible(st.id);
          const isLast = idx === stages.length - 1;

          return (
            <div key={st.id} className="flex flex-col">
              {/* Stepper Node Item */}
              <button
                disabled={!accessible}
                onClick={() => setStage(st.id)}
                title={`${st.number}. ${st.label}`}
                className={`group flex items-center space-x-2 py-1 px-1 rounded text-left transition-all ${
                  accessible ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'
                }`}
              >
                {/* Node Circle */}
                <div
                  className={`h-5 w-5 rounded-full flex items-center justify-center font-mono text-[10px] shrink-0 transition-colors ${
                    isActive
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-bold shadow-xs'
                      : isCompleted
                      ? 'bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 font-medium'
                      : 'border border-neutral-300 dark:border-neutral-700 text-neutral-400 dark:text-neutral-500 bg-white dark:bg-neutral-900'
                  }`}
                >
                  {isCompleted ? <Check className="h-3 w-3" /> : st.number}
                </div>

                {/* Stage Label */}
                {isActive ? (
                  <span className="text-[11px] font-semibold text-neutral-900 dark:text-white truncate">
                    {st.label}
                  </span>
                ) : (
                  <span className="text-[11px] text-neutral-400 dark:text-neutral-500 group-hover:text-neutral-700 dark:group-hover:text-neutral-300 truncate transition-colors">
                    {st.label}
                  </span>
                )}
              </button>

              {/* Connecting Vertical Line */}
              {!isLast && (
                <div className="ml-2.5 my-0.5 w-px h-3.5 bg-neutral-200 dark:bg-neutral-800" />
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
};
