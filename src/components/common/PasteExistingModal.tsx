'use client';

import React, { useState, useEffect } from 'react';
import { Clipboard, X, Check, Loader2, AlertCircle } from 'lucide-react';

export interface PasteOption {
  id: string;
  label: string;
  description?: string;
  placeholder: string;
}

interface PasteExistingModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  options?: PasteOption[];
  defaultOptionId?: string;
  placeholder?: string;
  onPaste: (text: string, selectedOptionId?: string) => Promise<void>;
  validateJson?: boolean;
}

export const PasteExistingModal: React.FC<PasteExistingModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  options,
  defaultOptionId,
  placeholder,
  onPaste,
  validateJson = false,
}) => {
  const [selectedOption, setSelectedOption] = useState<string>(
    defaultOptionId || (options && options.length > 0 ? options[0].id : '')
  );
  const [text, setText] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setText('');
      setError(null);
      setIsSubmitting(false);
      if (defaultOptionId) {
        setSelectedOption(defaultOptionId);
      } else if (options && options.length > 0) {
        setSelectedOption(options[0].id);
      }
    }
  }, [isOpen, defaultOptionId, options]);

  if (!isOpen) return null;

  const currentOption = options?.find((o) => o.id === selectedOption);
  const effectivePlaceholder = currentOption?.placeholder || placeholder || 'Paste content here...';

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed) {
      setError('Please paste text content before submitting.');
      return;
    }

    if (validateJson) {
      try {
        JSON.parse(trimmed);
      } catch (err: any) {
        setError(`Invalid JSON: ${err.message || 'Syntax error'}`);
        return;
      }
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await onPaste(trimmed, selectedOption);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to submit pasted content.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col w-full max-w-2xl max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/50 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
              <Clipboard className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white">{title}</h3>
              {subtitle && (
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Options Selector (if multiple options available) */}
        {options && options.length > 1 && (
          <div className="px-6 pt-4 pb-0 flex items-center space-x-2 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
            {options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setSelectedOption(opt.id);
                  setError(null);
                }}
                className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                  selectedOption === opt.id
                    ? 'border-neutral-900 text-neutral-900 dark:border-white dark:text-white'
                    : 'border-transparent text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-3">
          {currentOption?.description && (
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              {currentOption.description}
            </p>
          )}

          {error && (
            <div className="p-3 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="relative rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden focus-within:border-neutral-400 dark:focus-within:border-neutral-600 focus-within:ring-1 focus-within:ring-neutral-400 dark:focus-within:ring-neutral-600 transition-all">
            <textarea
              rows={12}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                if (error) setError(null);
              }}
              placeholder={effectivePlaceholder}
              className="w-full bg-neutral-50/50 dark:bg-neutral-950 p-4 text-xs font-mono text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-600 leading-relaxed resize-none focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono">
            <span>{text.split('\n').length} lines</span>
            <span>{text.length.toLocaleString()} characters</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end px-6 py-4 bg-neutral-50 dark:bg-neutral-950 border-t border-neutral-100 dark:border-neutral-800 text-xs space-x-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-3 py-1.5 text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !text.trim()}
            className="flex items-center space-x-1.5 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-100 dark:text-neutral-900 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg font-semibold transition-all shadow-xs cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>Submit and Seed</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
