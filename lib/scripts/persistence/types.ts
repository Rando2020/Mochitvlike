import type {
  SceneScript,
  ScriptGenerationSource,
  ScriptStatus
} from "../types";

export type PersistedScriptRow = {
  id: string;
  scene_id: string;
  series_id: string;
  creator_id: string;
  version: number;
  status: ScriptStatus;
  script: unknown;
  script_schema_version: string;
  generation_source: ScriptGenerationSource;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

export type PersistedScript = {
  id: string;
  sceneId: string;
  seriesId: string;
  creatorId: string;
  version: number;
  status: ScriptStatus;
  script: SceneScript;
  schemaVersion: string;
  generationSource: ScriptGenerationSource;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};

export class ScriptPersistenceError extends Error {
  constructor(
    public readonly code:
      | "SCRIPT_NOT_FOUND"
      | "SCRIPT_PERSISTENCE_FAILED"
      | "CORRUPT_STORED_SCRIPT",
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "ScriptPersistenceError";
  }
}
