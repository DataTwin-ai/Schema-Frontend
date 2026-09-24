'use client';

import React, { useState } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import { 
  FileText, 
  Sparkles, 
  ArrowRight, 
  RotateCcw,
  ChevronDown, 
  ChevronUp, 
  Sliders, 
  Edit3,
  Eye,
  X,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { StageActionBar } from '../layout/StageActionBar';
import { SupportingDocumentsSection } from './SupportingDocumentsSection';
import { AdditionalRequirementUpload } from '../common/AdditionalRequirementUpload';

export const BusinessInputStage: React.FC = () => {
  const { 
    workflow, 
    updateBusinessInput, 
    generateBusinessRequirement,
    generateRequirements,
    isGeneratingModalOpen
  } = useWorkflow();

  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  
  const [isKnowledgeModalOpen, setIsKnowledgeModalOpen] = useState(false);
  const [knowledgeData, setKnowledgeData] = useState<{ filename: string; content: string } | null>(null);
  const [isKnowledgeLoading, setIsKnowledgeLoading] = useState(false);
  const [knowledgeError, setKnowledgeError] = useState<string | null>(null);

  const fetchKnowledgeData = async () => {
    setIsKnowledgeModalOpen(true);
    if (knowledgeData) return;
    
    setIsKnowledgeLoading(true);
    setKnowledgeError(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
      const response = await fetch(`${apiUrl}/generate/hlr-knowledge`);
      if (!response.ok) {
        throw new Error(`Failed to load knowledge file: ${response.statusText}`);
      }
      const data = await response.json();
      setKnowledgeData({
        filename: data.filename || data.name || 'knowledge_file.txt',
        content: data.content || data.text || ''
      });
    } catch (err: any) {
      setKnowledgeError(err.message || 'An error occurred while fetching knowledge data.');
    } finally {
      setIsKnowledgeLoading(false);
    }
  };

  const highLevelText = workflow.businessInput.highLevelRequirement || '';
  const generatedBRText = workflow.businessInput.generatedBusinessRequirement || '';
  const isGenerated = workflow.businessInput.isBusinessRequirementGenerated || generatedBRText.trim().length > 0;
  const isHighLevelValid = highLevelText.trim().length >= 5;
  const isGeneratedBRValid = generatedBRText.trim().length >= 20;
  const hasAdvancedInstructions = (workflow.businessInput.additionalInstructions || '').trim().length > 0;

  return (
    <div className="flex flex-col min-h-full">
      {/* 1. Sticky Workspace Top Action Bar */}
      <StageActionBar
        title={isGenerated ? 'Review Business Requirement' : 'Generate Business Requirement'}
        description={
          isGenerated
            ? 'Review and edit the expanded specification before generating structured requirements.'
            : 'Enter a high-level business requirement to begin.'
        }
        rightActions={
          <div className="flex items-center space-x-2">
            <AdditionalRequirementUpload sourceScreen="business-input" />
            {isGenerated ? (
            <div className="flex items-center space-x-2">
              {/* Secondary Action: Generate Again */}
              <button
                type="button"
                onClick={generateBusinessRequirement}
                disabled={!isHighLevelValid || isGeneratingModalOpen}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-white hover:bg-neutral-50 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed font-semibold rounded-lg text-xs transition-all shadow-2xs cursor-pointer shrink-0"
                title="Regenerate Business Requirement from current source inputs"
              >
                <RotateCcw className="h-3.5 w-3.5 stroke-[2.25]" />
                <span>Generate Again</span>
              </button>

              {/* Primary Action: Generate Requirements */}
              <button
                type="button"
                onClick={generateRequirements}
                disabled={!isGeneratedBRValid || isGeneratingModalOpen}
                className="flex items-center space-x-1.5 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-100 dark:text-neutral-900 disabled:opacity-40 disabled:cursor-not-allowed font-semibold rounded-lg text-xs transition-all shadow-sm shrink-0 cursor-pointer"
                title="Accept Business Requirement and generate structured requirements"
              >
                <span>Generate Requirements</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={generateBusinessRequirement}
              disabled={!isHighLevelValid || isGeneratingModalOpen}
              className="flex items-center space-x-1.5 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-100 dark:text-neutral-900 disabled:opacity-40 disabled:cursor-not-allowed font-semibold rounded-lg text-xs transition-all shadow-sm shrink-0 cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Generate Business Requirement</span>
            </button>
          )}
          </div>
        }
      />

      {/* 2. Main Workspace Content */}
      <div className="flex-1 p-5 lg:p-6 max-w-5xl w-full mx-auto space-y-4 pb-16">
        {/* Primary Container: High-Level Business Requirement + Integrated Supporting Documents */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 shadow-sm space-y-3.5 transition-colors">
          {/* Section 1 Header */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-center space-x-2">
                <FileText className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                <span>Business Requirement</span>
              </label>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                Describe the business need in a sentence or a few lines.
              </p>
            </div>
            
            <div className="flex items-center space-x-3 text-[11px] text-neutral-400 font-mono">
              <button
                type="button"
                onClick={fetchKnowledgeData}
                className="flex items-center space-x-1 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer font-sans text-xs font-bold text-neutral-900 dark:text-neutral-100"
              >
                <Eye className="h-3.5 w-3.5" />
                <span>View Knowledge Used for HLR</span>
              </button>
              <span>{highLevelText.length} chars</span>
              {highLevelText && (
                <button
                  type="button"
                  onClick={() => updateBusinessInput({ highLevelRequirement: '' })}
                  className="hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Business Requirement Textarea */}
          <div className="relative rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden focus-within:border-neutral-400 dark:focus-within:border-neutral-600 focus-within:ring-1 focus-within:ring-neutral-400 dark:focus-within:ring-neutral-600 transition-all">
            <textarea
              rows={4}
              value={highLevelText}
              onChange={(e) => updateBusinessInput({ highLevelRequirement: e.target.value })}
              placeholder="e.g. Allocate prepaid expenses across Lines of Business based on configured allocation percentages and reconcile zero variance against general ledger..."
              className="w-full bg-neutral-50/50 dark:bg-neutral-950 p-3.5 text-xs text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 leading-relaxed resize-none focus:outline-none"
            />
          </div>

          {/* Integrated Supporting Documents (Inside Same Card) */}
          <SupportingDocumentsSection />
        </div>

        {/* Generated Business Requirement Review / Edit Editor (Appears upon generation) */}
        {isGenerated && (
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 shadow-sm space-y-3 transition-colors animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center space-x-2">
                <Edit3 className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                <label className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                  Generated Business Requirement
                </label>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
                  Review & Edit
                </span>
              </div>
              <div className="flex items-center space-x-3 text-[11px] text-neutral-400 font-mono">
                <span>{generatedBRText.length} chars</span>
                <button
                  type="button"
                  onClick={() => updateBusinessInput({ generatedBusinessRequirement: '' })}
                  className="hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>

            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Review and edit the detailed business requirement before generating structured requirements.
            </p>

            {/* Long-form Document Editor */}
            <div className="relative rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden focus-within:border-neutral-400 dark:focus-within:border-neutral-600 focus-within:ring-1 focus-within:ring-neutral-400 dark:focus-within:ring-neutral-600 transition-all">
              <textarea
                value={generatedBRText}
                onChange={(e) => updateBusinessInput({ generatedBusinessRequirement: e.target.value })}
                placeholder="Generated business requirement will appear here..."
                className="w-full min-h-[380px] lg:min-h-[420px] max-h-[600px] bg-neutral-50/50 dark:bg-neutral-950 p-4 text-xs font-mono text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-600 leading-relaxed resize-y focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Collapsible Additional Instructions */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-sm transition-colors">
          <button
            type="button"
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer"
          >
            <div className="flex items-center space-x-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              <Sliders className="h-3.5 w-3.5 text-neutral-500" />
              <span>Additional Instructions (Optional)</span>
              {hasAdvancedInstructions && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700">
                  Configured
                </span>
              )}
            </div>

            <div className="flex items-center space-x-1.5 text-neutral-400 text-xs">
              <span className="text-[11px] hidden sm:inline">
                {isAdvancedOpen ? 'Hide' : 'Expand'}
              </span>
              {isAdvancedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </button>

          {isAdvancedOpen && (
            <div className="p-4 pt-1 border-t border-neutral-100 dark:border-neutral-800 space-y-2">
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Optional custom prompt overrides, precision thresholds, or hard-gating rules for the SCDP generation engine:
              </p>
              <textarea
                rows={3}
                value={workflow.businessInput.additionalInstructions}
                onChange={(e) => updateBusinessInput({ additionalInstructions: e.target.value })}
                placeholder="e.g. Enforce 6-decimal precision math, mandate active GL check condition, generate Class 1 to 11 with explicit grain..."
                className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 focus:border-neutral-400 rounded-lg p-3 text-xs text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-600 leading-relaxed transition-all font-mono"
              />
            </div>
          )}
        </div>
      </div>

      {/* Knowledge Modal */}
      {isKnowledgeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-800 w-full max-w-3xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
              <h3 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">HLR Knowledge File</h3>
              <button 
                onClick={() => setIsKnowledgeModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto">
              {isKnowledgeLoading ? (
                <div className="flex flex-col items-center justify-center h-48 text-neutral-500">
                  <Loader2 className="h-6 w-6 animate-spin mb-2" />
                  <span className="text-xs">Loading knowledge file...</span>
                </div>
              ) : knowledgeError ? (
                <div className="flex flex-col items-center justify-center h-48 text-red-500">
                  <AlertCircle className="h-6 w-6 mb-2" />
                  <span className="text-xs">{knowledgeError}</span>
                </div>
              ) : knowledgeData ? (
                <div className="space-y-3">
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">
                    File: <span className="font-mono text-neutral-900 dark:text-neutral-100">{knowledgeData.filename}</span>
                  </div>
                  <pre className="text-[11px] font-mono text-neutral-800 dark:text-neutral-200 bg-neutral-50 dark:bg-neutral-950 p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 whitespace-pre-wrap overflow-x-auto">
                    {knowledgeData.content}
                  </pre>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
