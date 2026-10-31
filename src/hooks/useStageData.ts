import { useWorkflow } from '../context/WorkflowContext';

export function useStageData<T = unknown>(stage: string) {
  const { workflow } = useWorkflow();
  const live = (workflow.outputs as Record<string, unknown> | undefined)?.[stage];
  const hydrated = workflow.byStage?.[stage];
  return {
    data: (live ?? hydrated?.data ?? null) as T | null,
    status: live ? ('completed' as const) : (hydrated?.status ?? ('pending' as const)),
    files: hydrated?.files ?? [],
  };
}
