'use client';

import React, { useState } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import { WorkflowStage } from '../../types';
import { Check, ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';

interface StageConfig {
  id: WorkflowStage;
  number: number;
  label: string;
}

const stages: StageConfig[] = [
  { id: 'business-input', number: 1, label: 'Business Input' },
  { id: 'requirements', number: 2, label: 'Requirements' },
  { id: 'classes', number: 3, label: 'Domain Classes' },
  { id: 'schema', number: 4, label: 'Schema Output' },
  { id: 'output', number: 5, label: 'Final Output' },
];

export const WorkflowNavigation: React.FC = () => {
  const { workflow, setStage } = useWorkflow();

  const [panelWidth, setPanelWidth] = useState(144);
  const [isDragging, setIsDragging] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  const startDrag = (e: React.MouseEvent) => {
    if (isCollapsed || isMaximized) return;
    e.preventDefault();
    setIsDragging(true);

    const startX = e.clientX;
    const startWidth = panelWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.min(Math.max(startWidth + deltaX, 60), 400);
      setPanelWidth(newWidth);
    };

    const onMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const isStageAccessible = (stageId: WorkflowStage) => {
    if (stageId === 'business-input') return true;
    if (stageId === 'requirements') return !!workflow.requirements;
    if (stageId === 'classes') return !!workflow.requirements;
    if (stageId === 'schema') return !!workflow.schema;
    if (stageId === 'output') return !!workflow.schema;
    return false;
  };

  const isStageCompleted = (stageIdx: number) => {
    if (stageIdx === 0) return !!workflow.requirements;
    if (stageIdx === 1) return !!workflow.requirements && (workflow.stage === 'classes' || workflow.stage === 'schema' || workflow.stage === 'output' || !!workflow.schema);
    if (stageIdx === 2) return !!workflow.schema;
    if (stageIdx === 3) return !!workflow.schema && workflow.stage === 'output';
    if (stageIdx === 4) return false;
    return false;
  };

  if (isCollapsed) {
    return (
      <nav className="w-12 bg-neutral-50/50 dark:bg-neutral-900/60 border-r border-neutral-200 dark:border-neutral-800 flex flex-col items-center py-3.5 shrink-0 h-full transition-all duration-300">
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-1 mb-6 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors"
          title="Expand Pipeline"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <div className="flex flex-col items-center space-y-2">
          {stages.map((st, idx) => {
            const isActive = workflow.stage === st.id;
            const isCompleted = isStageCompleted(idx);
            const accessible = isStageAccessible(st.id);
            const isLast = idx === stages.length - 1;

            return (
              <React.Fragment key={st.id}>
                <button
                  disabled={!accessible}
                  onClick={() => setStage(st.id)}
                  title={`${st.number}. ${st.label}`}
                  className={`h-6 w-6 rounded-full flex items-center justify-center font-mono text-[10px] shrink-0 transition-colors ${
                    isActive
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-bold shadow-xs'
                      : isCompleted
                      ? 'bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 font-medium'
                      : 'border border-neutral-300 dark:border-neutral-700 text-neutral-400 dark:text-neutral-500 bg-white dark:bg-neutral-900'
                  } ${!accessible ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  {isCompleted ? <Check className="h-3 w-3" /> : st.number}
                </button>
                {!isLast && <div className="w-px h-4 bg-neutral-200 dark:bg-neutral-800" />}
              </React.Fragment>
            );
          })}
        </div>
      </nav>
    );
  }

  return (
    <nav
      aria-label="Pipeline"
      style={{ width: isMaximized ? undefined : `${panelWidth}px` }}
      className={`relative bg-neutral-50/50 dark:bg-neutral-900/60 border-r border-neutral-200 dark:border-neutral-800 flex flex-col px-2 py-3.5 select-none shrink-0 h-full overflow-y-auto ${
        isMaximized ? 'w-full sm:w-[300px] lg:w-[400px] shadow-[1px_0_0_0_rgba(0,0,0,0.05)]' : ''
      } ${isDragging ? 'transition-none' : 'transition-all duration-300'}`}
    >
      {/* Resizer Handle */}
      {!isMaximized && (
        <div
          className="absolute top-0 bottom-0 right-0 w-1.5 cursor-col-resize hover:bg-neutral-300 dark:hover:bg-neutral-700 active:bg-neutral-400 dark:active:bg-neutral-600 transition-colors z-30"
          onMouseDown={startDrag}
        />
      )}
      
      {/* Header Actions */}
      <div className="mb-4 flex items-center justify-between px-1">
        <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
          Pipeline
        </span>
        <div className="flex items-center space-x-0.5">
          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors"
            title={isMaximized ? "Restore" : "Maximize"}
          >
            {isMaximized ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={() => {
              setIsCollapsed(true);
              setIsMaximized(false);
            }}
            className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors"
            title="Collapse"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
        </div>
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
