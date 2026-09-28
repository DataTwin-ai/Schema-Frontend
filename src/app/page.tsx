'use client';

import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useWorkflow } from '../context/WorkflowContext';
import { LoginPage } from '../components/auth/LoginPage';
import { HistoryPage } from '../components/history/HistoryPage';
import { AppHeader } from '../components/layout/AppHeader';
import { WorkflowNavigation } from '../components/layout/WorkflowNavigation';
import { GenerationModal } from '../components/layout/GenerationModal';
import { BusinessInputStage } from '../components/stages/BusinessInputStage';
import { RequirementsStage } from '../components/stages/RequirementsStage';
import { ClassesStage } from '../components/stages/ClassesStage';
import { SchemaStudioStage } from '../components/stages/SchemaStudioStage';
import { FinalOutputStage } from '../components/stages/FinalOutputStage';
import { AssistantPanel } from '../components/assistant/AssistantPanel';

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();
  const { workflow, activeView } = useWorkflow();

  // If initial auth check in progress, show minimal clean loader
  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950 text-neutral-400 text-xs font-medium">
        Loading DataTwin Workspace...
      </div>
    );
  }

  // If not authenticated, render Login Page
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const renderActiveStage = () => {
    switch (workflow.stage) {
      case 'business-input':
        return <BusinessInputStage />;
      case 'requirements':
        return <RequirementsStage />;
      case 'classes':
        return <ClassesStage />;
      case 'schema':
        return <SchemaStudioStage />;
      case 'output':
        return <FinalOutputStage />;
      default:
        return <BusinessInputStage />;
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 antialiased overflow-hidden selection:bg-neutral-200 dark:selection:bg-neutral-800">
      {/* Top Fixed Application Header */}
      <AppHeader />

      {/* View Switcher: History Page vs. 3-Column Schema Generator Workspace */}
      {activeView === 'history' ? (
        <div className="flex-1 h-[calc(100vh-3.5rem)] overflow-y-auto bg-neutral-100/60 dark:bg-neutral-950 transition-colors duration-150">
          <HistoryPage />
        </div>
      ) : (
        <div className="flex-1 flex h-[calc(100vh-3.5rem)] overflow-hidden">
          {/* Left Column: Fixed / Minimal Workflow Stepper Rail */}
          <WorkflowNavigation />

          {/* Center Column: Primary Independently Scrolling Canvas */}
          <main className="flex-1 h-full overflow-y-auto bg-neutral-100/60 dark:bg-neutral-950 transition-colors duration-150">
            {renderActiveStage()}
          </main>

          {/* Right Column: Fixed / Independently Scrolling DataTwin Schema Assistant */}
          <AssistantPanel />
        </div>
      )}

      {/* Dynamic Generation Progress Modal */}
      <GenerationModal />
    </div>
  );
}
