import type { VisualPlan, VisualPlanGenerationSource, VisualPlanStatus } from "../types";

export type PersistedVisualPlanRow = {
  id: string;
  script_id: string;
  scene_id: string;
  series_id: string;
  creator_id: string;
  version: number;
  status: VisualPlanStatus;
  plan: unknown;
  plan_schema_version: string;
  generation_source: VisualPlanGenerationSource;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

export class VisualPlanPersistenceError extends Error {
  constructor(
    public readonly code: "VISUAL_PLAN_NOT_FOUND" | "VISUAL_PLAN_PERSISTENCE_FAILED" | "CORRUPT_STORED_VISUAL_PLAN",
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "VisualPlanPersistenceError";
  }
}

export type PersistedVisualPlan = {
  id: string;
  scriptId: string;
  sceneId: string;
  seriesId: string;
  creatorId: string;
  version: number;
  status: VisualPlanStatus;
  plan: VisualPlan;
  schemaVersion: string;
  generationSource: VisualPlanGenerationSource;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};
