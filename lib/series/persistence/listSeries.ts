import type { SupabaseClient } from "@supabase/supabase-js";
import { SeriesPersistenceError, type SeriesSummary } from "./types";
import { validatePersistedSeriesBlueprint } from "./validatePersistedSeries";

export async function listSeries(
  supabase: SupabaseClient,
  userId: string
): Promise<SeriesSummary[]> {
  const { data, error } = await supabase
    .from("series")
    .select("id,title,status,blueprint,updated_at")
    .eq("creator_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new SeriesPersistenceError(
      "SERIES_PERSISTENCE_FAILED",
      "Unable to list series.",
      error
    );
  }

  return (data ?? []).map((row) => {
    const blueprint = validatePersistedSeriesBlueprint(row.blueprint);

    return {
      id: row.id,
      title: row.title,
      status: row.status,
      logline: blueprint.identity.logline,
      genres: blueprint.identity.genres,
      updatedAt: row.updated_at
    };
  });
}
