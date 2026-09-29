import type { SupabaseClient } from "@supabase/supabase-js";
import { validatePersistedSeriesBlueprint } from "./validatePersistedSeries";
import {
  SeriesPersistenceError,
  type PersistedSeries,
  type PersistedSeriesRow
} from "./types";

export async function getSeries(
  supabase: SupabaseClient,
  userId: string,
  seriesId: string
): Promise<PersistedSeries> {
  const { data, error } = await supabase
    .from("series")
    .select(
      "id,creator_id,title,slug,status,blueprint,blueprint_schema_version,generation_source,created_at,updated_at,archived_at"
    )
    .eq("id", seriesId)
    .eq("creator_id", userId)
    .maybeSingle();

  if (error) {
    throw new SeriesPersistenceError(
      "SERIES_PERSISTENCE_FAILED",
      "Unable to read series.",
      error
    );
  }

  if (!data) {
    throw new SeriesPersistenceError(
      "SERIES_NOT_FOUND",
      "Series was not found."
    );
  }

  const row = data as PersistedSeriesRow;
  const blueprint = validatePersistedSeriesBlueprint(row.blueprint);

  return {
    id: row.id,
    creatorId: row.creator_id,
    title: row.title,
    slug: row.slug,
    status: row.status,
    blueprint,
    schemaVersion: row.blueprint_schema_version,
    generationSource: row.generation_source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at
  };
}
