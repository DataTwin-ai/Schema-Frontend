'use client';

import React, { useState, useRef } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import { 
  CheckCircle2, 
  Download, 
  Copy, 
  Check, 
  ArrowLeft, 
  Boxes, 
  Calculator, 
  ShieldCheck, 
  FileCheck2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { StageActionBar } from '../layout/StageActionBar';
import { DomainClassOutputViewer } from '../classes/DomainClassOutputViewer';

export const FinalOutputStage: React.FC = () => {
  const { workflow, setStage, downloadSchemaJson, copySchemaJson } = useWorkflow();
  const [copied, setCopied] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState<string>('TXN-2023-11001');
  const [outputView, setOutputView] = useState<'schema' | 'classes'>('schema');
  const tabScrollRef = useRef<HTMLDivElement>(null);
  
  const classes = workflow.classes || [];
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || '');
  const activeClass = classes.find((c) => c.id === selectedClassId) || classes[0];

  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabScrollRef.current) {
      const scrollAmount = direction === 'left' ? -220 : 220;
      tabScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (!workflow.schema || !workflow.requirements) {
    return (
      <div className="flex flex-col min-h-full">
        <StageActionBar
          title="Final Output"
          description="Schema not yet generated."
          leftActions={
            <button
              onClick={() => setStage('schema')}
              className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white rounded-md transition-colors"
              title="Back to Schema Studio"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          }
        />
        <div className="flex-1 p-12 text-center text-neutral-600 dark:text-neutral-400">
          <p className="text-xs">No final schema generated yet. Please return to Schema Studio.</p>
          <button
            onClick={() => setStage('schema')}
            className="mt-4 px-4 py-2 bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 rounded-lg text-xs font-semibold"
          >
            Go to Schema Studio
          </button>
        </div>
      </div>
    );
  }

  const handleCopy = async () => {
    const ok = await copySchemaJson();
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const sampleRecords = workflow.requirements.expectedOutput?.sampleRecords || [];
  const activeRecord = sampleRecords.find((r) => r.recordId === selectedRecordId) || sampleRecords[0];

  return (
    <div className="flex flex-col min-h-full">
      {/* 1. Sticky Workspace Top Action Bar */}
      <StageActionBar
        title="Final Schema Output & Verification"
        description={`Production SCDP specification compiled with ${workflow.classes?.length || 7} classes.`}
        leftActions={
          <button
            onClick={() => setStage('schema')}
            className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title="Back to Schema Studio"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        }
        rightActions={
          <>
            <button
              onClick={handleCopy}
              className="flex items-center space-x-1 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs font-semibold transition-all shadow-xs cursor-pointer"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-neutral-800 dark:text-neutral-200" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Copied' : 'Copy JSON'}</span>
            </button>

            <button
              onClick={downloadSchemaJson}
              className="flex items-center space-x-1.5 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-100 dark:text-neutral-900 font-semibold rounded-lg text-xs transition-all shadow-sm shrink-0 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download Schema</span>
            </button>
          </>
        }
      />

      {/* 2. Main Workspace Content */}
      <div className="flex-1 p-5 lg:p-6 max-w-5xl w-full mx-auto space-y-4 pb-16">
        {/* View Switch: Schema Output vs Domain Class Output */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs select-none">
            <button
              type="button"
              onClick={() => setOutputView('schema')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                outputView === 'schema'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              Schema Output
            </button>
            <button
              type="button"
              onClick={() => setOutputView('classes')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                outputView === 'classes'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              Domain Class Output
            </button>
          </div>
        </div>

        {/* 2A. Schema Output View */}
        {outputView === 'schema' && (
          <>
            {/* Verification Overview Card */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 lg:p-5 shadow-sm space-y-3 transition-colors">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 px-2.5 py-0.5 rounded-md border border-neutral-200 dark:border-neutral-700 flex items-center space-x-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-neutral-700 dark:text-neutral-300" />
                    <span>Production Schema Verified</span>
                  </span>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">PO Validation Schema v1.0</span>
                </div>
                <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">{workflow.domain}</span>
              </div>

              <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                The business requirement for <span className="font-semibold text-neutral-900 dark:text-white">{workflow.domain}</span> has been compiled into a validated SCDP schema with {workflow.classes?.length || 7} domain classes, math transformations, and variance reconciliation gating.
              </p>

              {/* Scorecard Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                <div className="bg-neutral-50 dark:bg-neutral-950 p-3 rounded-lg border border-neutral-200 dark:border-neutral-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-semibold uppercase">Classes</span>
                    <Boxes className="h-3.5 w-3.5 text-neutral-500" />
                  </div>
                  <p className="text-lg font-bold text-neutral-900 dark:text-white mt-0.5">{workflow.classes?.length || 7}</p>
                  <p className="text-[10px] text-neutral-400 truncate mt-0.5">PO_ItemCalculation, CA, AP...</p>
                </div>

                <div className="bg-neutral-50 dark:bg-neutral-950 p-3 rounded-lg border border-neutral-200 dark:border-neutral-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-semibold uppercase">Components</span>
                    <Calculator className="h-3.5 w-3.5 text-neutral-500" />
                  </div>
                  <p className="text-lg font-bold text-neutral-900 dark:text-white mt-0.5">{workflow.schema.stats.componentCount || 25}</p>
                  <p className="text-[10px] text-neutral-400 truncate mt-0.5">Math & Schema Fetches</p>
                </div>

                <div className="bg-neutral-50 dark:bg-neutral-950 p-3 rounded-lg border border-neutral-200 dark:border-neutral-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-semibold uppercase">Traceable Rules</span>
                    <ShieldCheck className="h-3.5 w-3.5 text-neutral-500" />
                  </div>
                  <p className="text-lg font-bold text-neutral-900 dark:text-white mt-0.5">28 Specs</p>
                  <p className="text-[10px] text-neutral-400 truncate mt-0.5">PS, BO, BR, FR, TR</p>
                </div>

                <div className="bg-neutral-50 dark:bg-neutral-950 p-3 rounded-lg border border-neutral-200 dark:border-neutral-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-semibold uppercase">Gating</span>
                    <CheckCircle2 className="h-3.5 w-3.5 text-neutral-500" />
                  </div>
                  <p className="text-lg font-bold text-neutral-900 dark:text-white mt-0.5">Zero-Variance</p>
                  <p className="text-[10px] text-neutral-400 truncate mt-0.5">Hard-gated posting</p>
                </div>
              </div>
            </div>

            {/* Compiled Production Schema JSON View */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 lg:p-5 shadow-sm space-y-3 transition-colors">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-neutral-900 dark:text-white">
                    Compiled Production Schema JSON
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
                    {((workflow.schema.rawJson?.length || 0) / 1024).toFixed(1)} KB
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center space-x-1 px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 rounded-md text-xs font-semibold transition-colors cursor-pointer"
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  <span>{copied ? 'Copied' : 'Copy JSON'}</span>
                </button>
              </div>

              <div className="max-h-[380px] overflow-auto rounded-lg bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-3 font-mono text-xs text-neutral-800 dark:text-neutral-200 leading-relaxed">
                <pre className="whitespace-pre">{workflow.schema.rawJson}</pre>
              </div>
            </div>

            {/* Expected Output Simulation & Reconciliation Verification */}
            {sampleRecords.length > 0 && (
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 lg:p-5 shadow-sm space-y-3.5 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-neutral-100 dark:border-neutral-800">
                  <div>
                    <h2 className="text-xs font-bold text-neutral-900 dark:text-white flex items-center space-x-1.5">
                      <FileCheck2 className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                      <span>Expected Ledger Output & Reconciliation</span>
                    </h2>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                      Simulated transaction run showing dynamic LOB allocation, tax calculation, and reconciliation checks.
                    </p>
                  </div>

                  {/* Record Selector Tabs */}
                  <div className="flex items-center space-x-1 bg-neutral-100 dark:bg-neutral-950 p-0.5 rounded-lg border border-neutral-200 dark:border-neutral-800 text-xs">
                    {sampleRecords.map((rec) => (
                      <button
                        key={rec.recordId}
                        onClick={() => setSelectedRecordId(rec.recordId)}
                        className={`px-2.5 py-1 rounded-md font-mono text-xs transition-all ${
                          selectedRecordId === rec.recordId
                            ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-semibold shadow-xs'
                            : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                        }`}
                      >
                        {rec.recordId}
                      </button>
                    ))}
                  </div>
                </div>

                {activeRecord && (
                  <div className="space-y-3">
                    {/* Record Summary Header */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-xs">
                      <div className="p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
                        <span className="text-[10px] uppercase font-bold text-neutral-500 dark:text-neutral-400 block">Source Bill ID</span>
                        <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100 text-xs mt-0.5 block">{activeRecord.sourceBillId}</span>
                        <span className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate block mt-0.5">{activeRecord.vendorName}</span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
                        <span className="text-[10px] uppercase font-bold text-neutral-500 dark:text-neutral-400 block">Prepaid GL Account</span>
                        <span className="font-mono text-xs text-neutral-800 dark:text-neutral-200 mt-0.5 block">{activeRecord.prepaidGlAccount}</span>
                        <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block mt-0.5">Mapped via Master AD</span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
                        <span className="text-[10px] uppercase font-bold text-neutral-500 dark:text-neutral-400 block">Original Bill Total</span>
                        <span className="font-mono font-bold text-neutral-900 dark:text-white text-xs mt-0.5 block">
                          ${activeRecord.originalBillTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block mt-0.5">Raw Ingestion Total</span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
                        <span className="text-[10px] uppercase font-bold text-neutral-500 dark:text-neutral-400 block">Reconciliation Status</span>
                        <div className="flex items-center space-x-1.5 mt-0.5">
                          <span
                            className={`font-bold font-mono text-[11px] px-2 py-0.5 rounded ${
                              activeRecord.status === 'PROCESSED'
                                ? 'bg-neutral-200 text-neutral-800 border border-neutral-300 dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-700'
                                : 'bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950 dark:text-rose-400 dark:border-rose-800'
                            }`}
                          >
                            {activeRecord.status}
                          </span>
                          <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-mono">
                            Var: ${activeRecord.reconciliationSummary.reconciliationVariance}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* LOB Allocation Split Table */}
                    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden text-xs">
                      <div className="bg-neutral-100/70 dark:bg-neutral-950 px-3.5 py-1.5 border-b border-neutral-200 dark:border-neutral-800 font-bold text-neutral-800 dark:text-neutral-300 text-[11px]">
                        Lines of Business (LOB) Cost Allocation & Tax Computation
                      </div>
                      <table className="w-full text-left">
                        <thead className="bg-neutral-50 dark:bg-neutral-950/60 text-neutral-600 dark:text-neutral-400 font-mono text-[10px] border-b border-neutral-200 dark:border-neutral-800">
                          <tr>
                            <th className="py-2 px-3.5">Target LOB</th>
                            <th className="py-2 px-3.5">Alloc %</th>
                            <th className="py-2 px-3.5">Base Amount</th>
                            <th className="py-2 px-3.5">Tax Profile</th>
                            <th className="py-2 px-3.5">Tax Rate</th>
                            <th className="py-2 px-3.5">Tax Amount</th>
                            <th className="py-2 px-3.5 text-right">Total With Tax</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 text-neutral-800 dark:text-neutral-200 font-mono text-[11px]">
                          {activeRecord.allocationDetails.map((alloc, idx) => (
                            <tr key={idx} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30">
                              <td className="py-2 px-3.5 font-bold text-neutral-900 dark:text-neutral-100">{alloc.targetLob}</td>
                              <td className="py-2 px-3.5">{alloc.allocationPercentage}%</td>
                              <td className="py-2 px-3.5">${alloc.baseAllocatedAmount.toLocaleString()}</td>
                              <td className="py-2 px-3.5 text-neutral-500 dark:text-neutral-400">{alloc.destinationTaxProfile}</td>
                              <td className="py-2 px-3.5">{alloc.appliedTaxRate}%</td>
                              <td className="py-2 px-3.5">${alloc.calculatedTaxAmount.toLocaleString()}</td>
                              <td className="py-2 px-3.5 text-right font-bold text-neutral-900 dark:text-white">${alloc.allocatedTotalWithTax.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* 2B. Domain Class Output View */}
        {outputView === 'classes' && (
          <div className="space-y-4">
            {/* Domain Class Selector Tabs */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-1.5 shadow-sm flex items-center space-x-1">
              <button
                type="button"
                onClick={() => scrollTabs('left')}
                className="p-1 rounded-lg text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors shrink-0 cursor-pointer"
                title="Scroll classes left"
                aria-label="Scroll classes left"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div 
                ref={tabScrollRef}
                className="flex-1 flex items-center space-x-1 overflow-x-auto text-xs select-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {classes.map((cls) => {
                  const isSelected = activeClass?.id === cls.id;
                  return (
                    <button
                      key={cls.id}
                      type="button"
                      onClick={() => setSelectedClassId(cls.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
                        isSelected
                          ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-semibold shadow-xs'
                          : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                      }`}
                    >
                      {cls.className}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => scrollTabs('right')}
                className="p-1 rounded-lg text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors shrink-0 cursor-pointer"
                title="Scroll classes right"
                aria-label="Scroll classes right"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Selected Class Output View */}
            {activeClass ? (
              <DomainClassOutputViewer cls={activeClass} />
            ) : (
              <div className="p-8 text-center text-xs text-neutral-500">
                No classes available to display.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
