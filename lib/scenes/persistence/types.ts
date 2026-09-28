import type { SceneBlueprint, SceneGenerationSource, SceneStatus } from "../types";

export type PersistedSceneRow = {
  id: string;
  series_id: string;
  creator_id: string;
  episode_key: "episodeOne";
  source_beat_id: string;
  status: SceneStatus;
  blueprint: unknown;
  blueprint_schema_version: string;
  generation_source: SceneGenerationSource;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

export type PersistedScene = {
  id: string;
  seriesId: string;
  creatorId: string;
  episodeKey: "episodeOne";
  sourceBeatId: string;
  status: SceneStatus;
  blueprint: SceneBlueprint;
  schemaVersion: string;
  generationSource: SceneGenerationSource;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};

export type ScenePersistenceErrorCode =
  | "SCENE_NOT_FOUND"
  | "SCENE_PERSISTENCE_FAILED"
  | "CORRUPT_STORED_SCENE";

export class ScenePersistenceError extends Error {
  constructor(
    public readonly code: ScenePersistenceErrorCode,
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "ScenePersistenceError";
  }
}
