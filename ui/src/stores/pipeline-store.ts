import { create } from 'zustand';
import type { PipelineRun } from '@/types/api';

interface PipelineState {
  currentRunId: string | null;
  runs: Map<string, PipelineRun>;
  setCurrentRun: (runId: string | null) => void;
  updateRun: (run: PipelineRun) => void;
  getRun: (runId: string) => PipelineRun | undefined;
}

export const usePipelineStore = create<PipelineState>((set, get) => ({
  currentRunId: null,
  runs: new Map(),
  setCurrentRun: (runId) => set({ currentRunId: runId }),
  updateRun: (run) =>
    set((state) => {
      const runs = new Map(state.runs);
      runs.set(run.runId, run);
      return { runs };
    }),
  getRun: (runId) => get().runs.get(runId),
}));
