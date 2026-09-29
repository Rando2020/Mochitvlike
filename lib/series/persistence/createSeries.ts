import type { SupabaseClient } from "@supabase/supabase-js";
import { validateSeriesBlueprintForWrite } from "./validatePersistedSeries";
import {
  SeriesPersistenceError,
  type SeriesGenerationSource,
  type SeriesStatus
} from "./types";

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);

  return slug || null;
}

export async function createSeriesRecord(
  supabase: SupabaseClient,
  input: {
    creatorId: string;
    seriesBlueprint: unknown;
    metadata: {
      source: SeriesGenerationSource;
      schemaVersion: string;
    };
  }
): Promise<{
  id: string;
  title: string;
  status: SeriesStatus;
  createdAt: string;
}> {
  const blueprint = validateSeriesBlueprintForWrite(input.seriesBlueprint);

  const { data, error } = await supabase
    .from("series")
    .insert({
      creator_id: input.creatorId,
      title: blueprint.identity.title,
      slug: slugify(blueprint.identity.title),
      status: "DRAFT",
      blueprint,
      blueprint_schema_version: input.metadata.schemaVersion,
      generation_source: input.metadata.source
    })
    .select("id,title,status,created_at")
    .single();

  if (error || !data) {
    throw new SeriesPersistenceError(
      "SERIES_PERSISTENCE_FAILED",
      "Unable to create series.",
      error
    );
  }

  return {
    id: data.id,
    title: data.title,
    status: data.status as SeriesStatus,
    createdAt: data.created_at
  };
}
