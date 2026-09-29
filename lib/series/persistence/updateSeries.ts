import type { SupabaseClient } from "@supabase/supabase-js";
import {
  SeriesPersistenceError,
  type SeriesStatus
} from "./types";

export async function updateSeriesRecord(
  supabase: SupabaseClient,
  input: {
    creatorId: string;
    seriesId: string;
    title?: string;
    status?: SeriesStatus;
  }
) {
  const updates: Record<string, unknown> = {};

  if (input.title !== undefined) {
    updates.title = input.title.trim();
  }

  if (input.status !== undefined) {
    updates.status = input.status;

    if (input.status === "ARCHIVED") {
      updates.archived_at = new Date().toISOString();
    } else {
      updates.archived_at = null;
    }
  }

  if (!Object.keys(updates).length) {
    throw new SeriesPersistenceError(
      "SERIES_PERSISTENCE_FAILED",
      "No supported series updates were supplied."
    );
  }

  const { data, error } = await supabase
    .from("series")
    .update(updates)
    .eq("id", input.seriesId)
    .eq("creator_id", input.creatorId)
    .select("id,title,status,updated_at,archived_at")
    .maybeSingle();

  if (error) {
    throw new SeriesPersistenceError(
      "SERIES_PERSISTENCE_FAILED",
      "Unable to update series.",
      error
    );
  }

  if (!data) {
    throw new SeriesPersistenceError(
      "SERIES_NOT_FOUND",
      "Series was not found."
    );
  }

  return {
    id: data.id,
    title: data.title,
    status: data.status as SeriesStatus,
    updatedAt: data.updated_at,
    archivedAt: data.archived_at as string | null
  };
}

export async function archiveSeriesRecord(
  supabase: SupabaseClient,
  creatorId: string,
  seriesId: string
) {
  return updateSeriesRecord(supabase, {
    creatorId,
    seriesId,
    status: "ARCHIVED"
  });
}
