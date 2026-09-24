'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import { 
  Bot, 
  Send, 
  Loader2, 
  Trash2, 
  ChevronRight, 
  ChevronLeft
} from 'lucide-react';
import { AssistantSuggestedAction } from '../../types';

interface SuggestionChipProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export const SuggestionChip: React.FC<SuggestionChipProps> = ({ label, onClick, disabled }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="w-full text-left text-[11px] font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-50/90 dark:bg-neutral-900/90 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-950 dark:hover:text-white border border-neutral-200/90 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 px-2.5 py-1.5 rounded-lg transition-all shadow-2xs focus:outline-none focus:ring-1 focus:ring-neutral-400 dark:focus:ring-neutral-600 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer group flex items-center justify-between gap-1.5"
    >
      <span className="truncate block leading-tight">{label}</span>
      <ChevronRight className="h-3 w-3 text-neutral-400 dark:text-neutral-500 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 shrink-0 transition-colors" />
    </button>
  );
};

export const AssistantPanel: React.FC = () => {
  const { 
    workflow, 
    assistantMessages, 
    isAssistantThinking, 
    sendAssistantMessage, 
    handleAssistantAction,
    clearAssistantChat 
  } = useWorkflow();

  const [inputMessage, setInputMessage] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [assistantMessages, isAssistantThinking]);

  const handleSend = () => {
    if (!inputMessage.trim() || isAssistantThinking) return;
    const msg = inputMessage.trim();
    setInputMessage('');
    sendAssistantMessage(msg);
  };

  const getStagePromptChips = (): string[] => {
    switch (workflow.stage) {
      case 'business-input':
        return [
          'What are the mandatory fields in Accounts Payable extract?',
          'How does DataTwin structure business requirements?',
        ];
      case 'requirements':
        return [
          'What should I add to the finance requirement?',
          'Explain zero-variance reconciliation rule',
        ];
      case 'classes':
        return [
          'Explain inter-class dependency chain',
          'What is the purpose of cost allocation classes?',
        ];
      case 'schema':
        return [
          'Validate SCDP JSON syntax rules',
          'How are math expressions structured in SCDP?',
        ];
      case 'output':
        return [
          'Explain reconciliation variance check',
          'How to export for downstream pipeline?',
        ];
      default:
        return [
          'How can I help with DataTwin?',
        ];
    }
  };

  const promptChips = getStagePromptChips();

  if (isCollapsed) {
    return (
      <div className="w-10 bg-neutral-50/50 dark:bg-neutral-900/60 border-l border-neutral-200 dark:border-neutral-800 flex flex-col items-center py-3 select-none shrink-0 transition-all h-full">
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-1.5 text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors"
          title="Open Assistant"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="mt-6 [writing-mode:vertical-lr] text-[11px] font-medium text-neutral-500 dark:text-neutral-400 tracking-wider uppercase flex items-center space-x-1.5">
          <Bot className="h-3.5 w-3.5 text-neutral-500 mb-1.5 rotate-90" />
          <span>Assistant</span>
        </div>
      </div>
    );
  }

  return (
    <aside
      aria-label="DataTwin Schema Assistant"
      className="w-72 lg:w-80 bg-neutral-50/50 dark:bg-neutral-900/60 border-l border-neutral-200 dark:border-neutral-800 flex flex-col justify-between select-none shrink-0 h-full overflow-hidden transition-colors duration-150 z-20"
    >
      {/* Assistant Header */}
      <div className="px-3.5 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-white dark:bg-neutral-900 shrink-0">
        <div className="flex items-center space-x-2">
          <Bot className="h-4 w-4 text-neutral-700 dark:text-neutral-300" />
          <h3 className="text-xs font-semibold text-neutral-900 dark:text-white">DataTwin Schema Assistant</h3>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={clearAssistantChat}
            className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors"
            title="Clear Chat"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors"
            title="Collapse"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-3 overflow-y-auto space-y-3 font-sans text-xs">
        {assistantMessages.length === 0 && !isAssistantThinking && (
          <div className="py-8 px-2 text-center space-y-2 text-neutral-400">
            <Bot className="h-6 w-6 mx-auto text-neutral-400 dark:text-neutral-600" />
            <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
              DataTwin Schema Assistant
            </p>
            <p className="text-[11px] text-neutral-400 dark:text-neutral-500 max-w-[200px] mx-auto leading-relaxed">
              Ask questions about SCDP rules, formulas, classes, or click a suggestion below.
            </p>
          </div>
        )}

        {assistantMessages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col space-y-1 ${
              msg.sender === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div className="flex items-center space-x-1 text-[10px] text-neutral-400 px-1">
              <span>{msg.sender === 'user' ? 'You' : 'DataTwin'}</span>
              <span>•</span>
              <span>{msg.timestamp}</span>
            </div>

            <div
              className={`p-2.5 rounded-xl max-w-[92%] leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-medium'
                  : 'bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200'
              }`}
            >
              <div className="whitespace-pre-line">{msg.content}</div>

              {/* Action suggestions attached to message */}
              {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                <div className="mt-2 pt-1.5 border-t border-neutral-200 dark:border-neutral-800/80 space-y-1">
                  {msg.suggestedActions.map((action, aIdx) => (
                    <button
                      key={aIdx}
                      onClick={() => handleAssistantAction(action)}
                      className="w-full text-left text-[11px] text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-900 dark:hover:bg-neutral-800 px-2 py-1 rounded border border-neutral-200 dark:border-neutral-800 transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <span className="truncate">{action.label}</span>
                      <ChevronRight className="h-3 w-3 text-neutral-400 shrink-0 ml-1" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isAssistantThinking && (
          <div className="flex items-center space-x-2 text-xs text-neutral-500 p-2 rounded-lg bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-neutral-500" />
            <span>Thinking...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompt Chips (Compact Interactive Pills) */}
      {promptChips && promptChips.length > 0 && (
        <div className="p-2.5 bg-white dark:bg-neutral-950/80 border-t border-neutral-200 dark:border-neutral-800 space-y-1.5 shrink-0">
          <p className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider px-0.5">
            Suggestions
          </p>
          <div className="flex flex-col space-y-1.5">
            {promptChips.map((chip, idx) => (
              <SuggestionChip
                key={idx}
                label={chip}
                onClick={() => sendAssistantMessage(chip)}
                disabled={isAssistantThinking}
              />
            ))}
          </div>
        </div>
      )}

      {/* Input Form Footer */}
      <div className="p-2.5 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 shrink-0">
        <div className="relative flex items-center">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask assistant..."
            className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 rounded-lg pl-2.5 pr-8 py-1.5 text-xs text-neutral-900 dark:text-neutral-200 placeholder-neutral-400 focus:outline-none transition-all"
          />
          <button
            onClick={handleSend}
            disabled={!inputMessage.trim() || isAssistantThinking}
            className="absolute right-1 p-1 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 disabled:opacity-30 text-white dark:text-neutral-900 rounded-md transition-colors cursor-pointer"
          >
            <Send className="h-3 w-3" />
          </button>
        </div>
      </div>
    </aside>
  );
};
