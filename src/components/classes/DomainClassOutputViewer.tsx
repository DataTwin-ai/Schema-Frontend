'use client';

import React from 'react';
import { SchemaClass } from '../../types';
import { Database, Layers, FileText, CheckCircle2, Box, Info } from 'lucide-react';
import { RequirementCategoryChip } from '../common/RequirementCategoryChip';

interface DomainClassOutputViewerProps {
  cls: SchemaClass;
  compact?: boolean;
}

export const DomainClassOutputViewer: React.FC<DomainClassOutputViewerProps> = ({ cls, compact = false }) => {
  const fields = cls.classLevelFields || [];
  const components = cls.components || [];
  const formulas = cls.formulaRules || [];
  const lookups = cls.lookupRules || [];
  const criteria = cls.criteria || [];
  const conditions = cls.conditions || [];
  const exposes = cls.exposes || [];
  const dependencies = cls.dependencies || [];

  return (
    <div className="space-y-4">
      {/* Header Metadata Section */}
      <div className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-neutral-200/80 dark:border-neutral-800">
          <div className="flex items-center space-x-2.5 min-w-0">
            <span className="font-mono text-xs font-bold bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white px-2.5 py-1 rounded border border-neutral-200 dark:border-neutral-700 shadow-2xs">
              Class #{cls.classNumber}
            </span>
            <span className="text-sm font-bold text-neutral-900 dark:text-white">
              {cls.className}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="inline-flex items-center space-x-1 font-mono text-[11px] text-neutral-600 dark:text-neutral-400 bg-white dark:bg-neutral-900 px-2 py-0.5 rounded border border-neutral-200 dark:border-neutral-800">
              <Database className="h-3 w-3 text-neutral-500" />
              <span>Datasource: <strong className="text-neutral-900 dark:text-neutral-200">{cls.datasource}</strong></span>
            </span>

            <span className="inline-flex items-center space-x-1 font-mono text-[11px] text-neutral-600 dark:text-neutral-400 bg-white dark:bg-neutral-900 px-2 py-0.5 rounded border border-neutral-200 dark:border-neutral-800">
              <Layers className="h-3 w-3 text-neutral-500" />
              <span>Grain: <strong className="text-neutral-900 dark:text-neutral-200">{cls.grain}</strong></span>
            </span>

            {cls.expectedOutput && (
              <span className="inline-flex items-center space-x-1 font-mono text-[11px] text-neutral-600 dark:text-neutral-400 bg-white dark:bg-neutral-900 px-2 py-0.5 rounded border border-neutral-200 dark:border-neutral-800">
                <Box className="h-3 w-3 text-neutral-500" />
                <span>Output: <strong className="text-neutral-900 dark:text-neutral-200">{cls.expectedOutput}</strong></span>
              </span>
            )}
          </div>
        </div>

        <div>
          <span className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block mb-0.5">
            Purpose & Functional Scope
          </span>
          <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
            {cls.purpose}
          </p>
        </div>

        {cls.reviewPoints && (
          <div className="p-2.5 rounded-lg bg-neutral-100/80 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs flex items-start space-x-2 text-neutral-600 dark:text-neutral-400">
            <Info className="h-3.5 w-3.5 text-neutral-500 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-semibold text-neutral-800 dark:text-neutral-200">Review Points: </span>
              {cls.reviewPoints}
            </div>
          </div>
        )}
      </div>

      {/* FULL CLASS SPECIFICATION Section */}
      <div className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 space-y-2">
        <span className="text-[11px] font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider block">
          FULL CLASS SPECIFICATION
        </span>
        <pre className="p-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs font-mono text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap break-words max-h-96 overflow-y-auto">
          {cls.rawText ? cls.rawText : 'Full class specification is not available.'}
        </pre>
      </div>

      {/* Generated Output Table */}
      <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden bg-white dark:bg-neutral-900 shadow-2xs">
        <div className="px-4 py-2.5 bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
            Field / Component Output Values
          </h4>
          <span className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400">
            {fields.length + components.length + formulas.length} items
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-100/50 dark:bg-neutral-900/50 text-[11px] font-semibold text-neutral-600 dark:text-neutral-400">
                <th className="py-2.5 px-4 w-1/4">Field / Component</th>
                <th className="py-2.5 px-3 w-1/6">Type / Category</th>
                <th className="py-2.5 px-4 w-1/3">Value / Expression</th>
                <th className="py-2.5 px-4">Description / Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/80">
              {/* 1. Class-Level Fields */}
              {fields.map((field, idx) => (
                <tr key={`field-${idx}`} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                  <td className="py-2 px-4 font-mono font-bold text-neutral-900 dark:text-neutral-100 text-xs">
                    {field}
                  </td>
                  <td className="py-2 px-3">
                    <span className="inline-flex items-center text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                      CLASS FIELD
                    </span>
                  </td>
                  <td className="py-2 px-4 font-mono text-xs text-neutral-700 dark:text-neutral-300">
                    {field}
                  </td>
                  <td className="py-2 px-4 text-xs text-neutral-500 dark:text-neutral-400">
                    Source column from datasource {cls.datasource}
                  </td>
                </tr>
              ))}

              {/* 2. Components */}
              {components.map((comp) => (
                <tr key={comp.id || comp.name} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                  <td className="py-2 px-4 font-mono font-bold text-neutral-900 dark:text-neutral-100 text-xs">
                    {comp.name}
                  </td>
                  <td className="py-2 px-3">
                    <RequirementCategoryChip category={comp.type} />
                  </td>
                  <td className="py-2 px-4 font-mono text-xs text-neutral-800 dark:text-neutral-200">
                    {comp.expression || comp.sourceColumn || '—'}
                  </td>
                  <td className="py-2 px-4 text-xs text-neutral-600 dark:text-neutral-400">
                    {comp.description || (comp.sourceClass ? `Fetched from class ${comp.sourceClass}` : 'Calculated component value')}
                  </td>
                </tr>
              ))}

              {/* 3. Formula Rules */}
              {formulas.map((formula, idx) => (
                <tr key={`formula-${idx}`} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                  <td className="py-2 px-4 font-mono font-semibold text-neutral-800 dark:text-neutral-200 text-xs">
                    Formula #{idx + 1}
                  </td>
                  <td className="py-2 px-3">
                    <span className="inline-flex items-center text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                      FORMULA
                    </span>
                  </td>
                  <td className="py-2 px-4 font-mono text-xs text-neutral-800 dark:text-neutral-200">
                    {formula}
                  </td>
                  <td className="py-2 px-4 text-xs text-neutral-500 dark:text-neutral-400">
                    Mathematical transformation specification
                  </td>
                </tr>
              ))}

              {/* 4. Lookup Rules */}
              {lookups.map((lookup, idx) => (
                <tr key={`lookup-${idx}`} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                  <td className="py-2 px-4 font-mono font-semibold text-neutral-800 dark:text-neutral-200 text-xs">
                    Lookup #{idx + 1}
                  </td>
                  <td className="py-2 px-3">
                    <span className="inline-flex items-center text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                      LOOKUP
                    </span>
                  </td>
                  <td className="py-2 px-4 font-mono text-xs text-neutral-800 dark:text-neutral-200">
                    {lookup}
                  </td>
                  <td className="py-2 px-4 text-xs text-neutral-500 dark:text-neutral-400">
                    Master data resolution rule
                  </td>
                </tr>
              ))}

              {/* 5. Criteria & Conditions */}
              {criteria.map((crit, idx) => (
                <tr key={`criteria-${idx}`} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                  <td className="py-2 px-4 font-mono font-semibold text-neutral-800 dark:text-neutral-200 text-xs">
                    Criteria #{idx + 1}
                  </td>
                  <td className="py-2 px-3">
                    <span className="inline-flex items-center text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60">
                      FILTER
                    </span>
                  </td>
                  <td className="py-2 px-4 font-mono text-xs text-neutral-800 dark:text-neutral-200">
                    {crit}
                  </td>
                  <td className="py-2 px-4 text-xs text-neutral-500 dark:text-neutral-400">
                    Matching & filtering constraint
                  </td>
                </tr>
              ))}

              {/* 6. Exposes */}
              {exposes.map((exp, idx) => (
                <tr key={`exposes-${idx}`} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                  <td className="py-2 px-4 font-mono font-semibold text-neutral-800 dark:text-neutral-200 text-xs">
                    Exposed Attribute
                  </td>
                  <td className="py-2 px-3">
                    <span className="inline-flex items-center text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60">
                      EXPOSES
                    </span>
                  </td>
                  <td className="py-2 px-4 font-mono text-xs text-neutral-800 dark:text-neutral-200">
                    {exp}
                  </td>
                  <td className="py-2 px-4 text-xs text-neutral-500 dark:text-neutral-400">
                    Exposed to downstream classes
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
