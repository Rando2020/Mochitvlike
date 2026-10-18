import type { SupabaseClient } from "@supabase/supabase-js";
import type { SeriesBlueprint } from "@/lib/series/types";
import { validateStorySeeds, type StoryPlan, type StoryPlanSaveInput } from "./schema";

export class StoryPlanError extends Error {
  constructor(public readonly code:
    "STORY_STORAGE_UNAVAILABLE" | "STORY_REVISION_CONFLICT" |
    "STORY_LOCKED_CHANGE_REQUIRES_REVIEW" | "STORY_REQUEST_REUSED" |
    "STORY_CHARACTER_MISMATCH" | "STORY_SAVE_FAILED") {
    super(code);
  }
}

function parseRow(row: { revision: number; seeds: unknown; updated_at: string }, blueprint: SeriesBlueprint): StoryPlan {
  if (!Number.isInteger(row.revision) || row.revision < 1) {
    throw new StoryPlanError("STORY_STORAGE_UNAVAILABLE");
  }
  try {
    return { revision: row.revision, seeds: validateStorySeeds(row.seeds, blueprint), updatedAt: row.updated_at };
  } catch {
    throw new StoryPlanError("STORY_STORAGE_UNAVAILABLE");
  }
}

export async function readStoryPlan(
  supabase: SupabaseClient, seriesId: string, creatorId: string, blueprint: SeriesBlueprint
): Promise<StoryPlan> {
  const { data, error } = await supabase.from("story_seed_plans")
    .select("revision,seeds,updated_at")
    .eq("series_id", seriesId).eq("creator_id", creatorId).maybeSingle();
  if (error) throw new StoryPlanError("STORY_STORAGE_UNAVAILABLE");
  return data ? parseRow(data as { revision: number; seeds: unknown; updated_at: string }, blueprint)
    : { revision: 0, seeds: [], updatedAt: null };
}

export async function writeStoryPlan(
  supabase: SupabaseClient, seriesId: string, blueprint: SeriesBlueprint, input: StoryPlanSaveInput
): Promise<StoryPlan> {
  const seeds = validateStorySeeds(input.seeds, blueprint);
  const { data, error } = await supabase.rpc("save_story_seed_plan_v1", {
    p_series_id: seriesId,
    p_expected_revision: input.expectedRevision,
    p_request_id: input.requestId,
    p_seeds: seeds,
    p_acknowledge_locked_change: input.acknowledgeLockedChanges
  });
  if (error) {
    const known = [
      "STORY_REVISION_CONFLICT", "STORY_LOCKED_CHANGE_REQUIRES_REVIEW",
      "STORY_REQUEST_REUSED", "STORY_CHARACTER_MISMATCH"
    ] as const;
    const match = known.find((code) => error.message?.includes(code));
    throw new StoryPlanError(match ?? "STORY_SAVE_FAILED");
  }
  const row = Array.isArray(data) ? data[0] : null;
  if (!row) throw new StoryPlanError("STORY_SAVE_FAILED");
  return parseRow(row, blueprint);
}
