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
    creationId?: string;
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
      ...(input.creationId ? { id: input.creationId } : {}),
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

  // A creator-held UUID allows an uncertain save to be retried without another row.
  // Reuse requires the same owner AND the exact validated content/metadata.
  if (error?.code === "23505" && input.creationId) {
    const existing = await supabase.from("series")
      .select("id,title,status,created_at,blueprint,blueprint_schema_version,generation_source")
      .eq("id", input.creationId).eq("creator_id", input.creatorId).maybeSingle();
    if (!existing.error && existing.data &&
        JSON.stringify(validateSeriesBlueprintForWrite(existing.data.blueprint)) === JSON.stringify(blueprint) &&
        existing.data.blueprint_schema_version === input.metadata.schemaVersion &&
        existing.data.generation_source === input.metadata.source) {
      return { id: existing.data.id, title: existing.data.title, status: existing.data.status as SeriesStatus, createdAt: existing.data.created_at };
    }
  }
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
