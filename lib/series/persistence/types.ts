import type { SeriesBlueprint } from "@/lib/series/types";

export type SeriesStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";
export type SeriesGenerationSource = "llm" | "repaired" | "fallback";

export type PersistedSeriesRow = {
  id: string;
  creator_id: string;
  title: string;
  slug: string | null;
  status: SeriesStatus;
  blueprint: unknown;
  blueprint_schema_version: string;
  generation_source: SeriesGenerationSource;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

export type PersistedSeries = {
  id: string;
  creatorId: string;
  title: string;
  slug: string | null;
  status: SeriesStatus;
  blueprint: SeriesBlueprint;
  schemaVersion: string;
  generationSource: SeriesGenerationSource;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};

export type SeriesSummary = {
  id: string;
  title: string;
  status: SeriesStatus;
  logline: string;
  genres: string[];
  updatedAt: string;
};

export type SeriesPersistenceErrorCode =
  | "SERIES_NOT_FOUND"
  | "INVALID_SERIES_BLUEPRINT"
  | "SERIES_PERSISTENCE_FAILED"
  | "CORRUPT_STORED_SERIES"
  | "UNAUTHENTICATED";

export class SeriesPersistenceError extends Error {
  constructor(
    public readonly code: SeriesPersistenceErrorCode,
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "SeriesPersistenceError";
  }
}
