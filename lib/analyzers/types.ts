import type { EvaluatedCheck } from "@/lib/rules/engine";
import type { PersistedPage } from "@/lib/services/pipeline";
import type { StageId } from "@/lib/services/stages";
import type { JobStats } from "@/lib/types";

export type AnalyzerHooks = {
  appendLog: (jobId: string, message: string, level?: "info" | "warn" | "error") => void;
  setStage: (jobId: string, stage: StageId) => void;
  bumpStats: (jobId: string, delta: Partial<Omit<JobStats, "failedStages">>) => void;
  markStageFailed: (jobId: string, stage: string) => void;
};

export type AnalyzerContext = {
  jobId: string;
  websiteId: string;
  pages: PersistedPage[];
  hooks: AnalyzerHooks;
};

/** A deep analyzer contributes extra evaluated checks; it must degrade gracefully. */
export type Analyzer = {
  id: string;
  stage: StageId;
  run: (ctx: AnalyzerContext) => Promise<EvaluatedCheck[]>;
};
