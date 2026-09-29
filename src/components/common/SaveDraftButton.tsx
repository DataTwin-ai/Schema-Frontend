import React, { useState } from 'react';
import { Save, Check } from 'lucide-react';
import { useWorkflow } from '../../context/WorkflowContext';

interface SaveDraftButtonProps {
  unsavedSchemaText?: string;
}

export const SaveDraftButton: React.FC<SaveDraftButtonProps> = ({ unsavedSchemaText }) => {
  const { workflow, saveDraft, activeOperation } = useWorkflow();
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const disabled = !workflow.runId || (activeOperation && activeOperation.status === 'RUNNING');

    const handleSave = async () => {
    if (disabled) return;
    
    // Prompt for draft name if it looks like a default RUN_ id
    let newName = '';
    if (workflow.runId && workflow.runId.startsWith('RUN_')) {
      const promptName = window.prompt('Enter a name for this draft:', workflow.runId);
      if (promptName === null) return; // cancelled
      if (promptName.trim() !== '') {
        newName = promptName.trim();
      }
    }

    setIsSaving(true);
    try {
      await saveDraft(unsavedSchemaText);
      
      // If user provided a new name, rename it immediately
      if (newName && newName !== workflow.runId) {
        // We import API_URL at the top if needed, or just fetch
        const { API_URL } = await import('../../services/api/config');
        const apiUrl = API_URL;
        await fetch(`${apiUrl}/history/${workflow.runId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ displayName: newName })
        });
      }
      
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err: any) {
      alert(`Failed to save draft: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isSaved) {
    return (
      <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 rounded-lg text-[11px] font-semibold transition-all shadow-xs shrink-0">
        <Check className="h-3.5 w-3.5 stroke-[2.5]" />
        <span>Draft saved &middot; {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    );
  }

  return (
    <button
      onClick={handleSave}
      disabled={disabled || isSaving}
      className="flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-neutral-50 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed font-semibold rounded-lg text-[11px] transition-all shadow-xs shrink-0 cursor-pointer"
      title="Save current progress as a draft"
    >
      <Save className="h-3.5 w-3.5" />
      <span>{isSaving ? 'Saving...' : 'Save as Draft'}</span>
    </button>
  );
};
