import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSeries } from "@/lib/series/persistence/getSeries";
import { SeriesPersistenceError } from "@/lib/series/persistence/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { readStoryPlan, writeStoryPlan, StoryPlanError } from "@/lib/story-seeds/persistence";
import { StoryPlanSaveSchema } from "@/lib/story-seeds/schema";

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store" };
const uuid = z.string().uuid();
const routeError = (status: number, code: string, message: string) =>
  NextResponse.json({ error: { code, message } }, { status, headers: noStore });

async function scope(seriesId: string) {
  if (!uuid.safeParse(seriesId).success) {
    throw new SeriesPersistenceError("SERIES_NOT_FOUND", "Not found.");
  }
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (!user || error) {
    throw new SeriesPersistenceError("UNAUTHENTICATED", "Authentication required.");
  }
  const series = await getSeries(supabase, user.id, seriesId);
  if (series.status === "ARCHIVED") {
    throw new SeriesPersistenceError("SERIES_NOT_FOUND", "Not found.");
  }
  return { supabase, user, series };
}
function mapError(error: unknown) {
  if (error instanceof SeriesPersistenceError) {
    if (error.code === "UNAUTHENTICATED") return routeError(401, error.code, "Sign in to edit your story.");
    if (error.code === "SERIES_NOT_FOUND") return routeError(404, error.code, "This series is unavailable.");
    return routeError(500, "STORY_READ_FAILED", "Unable to read this series.");
  }
  if (error instanceof StoryPlanError) {
    if (error.code === "STORY_REVISION_CONFLICT" || error.code === "STORY_REQUEST_REUSED") {
      return routeError(409, error.code, "Another edit was saved. Your draft was not overwritten.");
    }
    if (error.code === "STORY_LOCKED_CHANGE_REQUIRES_REVIEW") {
      return routeError(409, error.code, "Changes to locked story seeds require review.");
    }
    if (error.code === "STORY_CHARACTER_MISMATCH") {
      return routeError(409, error.code, "Your story cast has changed. Review character assignments.");
    }
    if (error.code === "STORY_STORAGE_UNAVAILABLE") {
      return routeError(503, error.code, "Story saving has not been set up for this environment.");
    }
    return routeError(503, "STORY_SAVE_FAILED", "Story saving is temporarily unavailable.");
  }
  return routeError(500, "STORY_REQUEST_FAILED", "The story request could not be completed.");
}

export async function GET(
  _request: NextRequest, { params }: { params: Promise<{ seriesId: string }> }
) {
  try {
    const { seriesId } = await params;
    const { supabase, user, series } = await scope(seriesId);
    const plan = await readStoryPlan(supabase, seriesId, user.id, series.blueprint);
    return NextResponse.json({ plan }, { headers: noStore });
  } catch (error) { return mapError(error); }
}

export async function PUT(
  request: NextRequest, { params }: { params: Promise<{ seriesId: string }> }
) {
  try {
    const { seriesId } = await params;
    if (!uuid.safeParse(seriesId).success) {
      return routeError(404, "SERIES_NOT_FOUND", "This series is unavailable.");
    }
    if (Number(request.headers.get("content-length") ?? 0) > 100_000) {
      return routeError(413, "STORY_PAYLOAD_TOO_LARGE", "Story plan is too large.");
    }
    const raw = await request.text();
    if (raw.length > 100_000) {
      return routeError(413, "STORY_PAYLOAD_TOO_LARGE", "Story plan is too large.");
    }
    let data: unknown;
    try { data = JSON.parse(raw); }
    catch { return routeError(400, "STORY_INVALID_INPUT", "Provide a valid story plan."); }
    const parsed = StoryPlanSaveSchema.safeParse(data);
    if (!parsed.success) return routeError(400, "STORY_INVALID_INPUT", "Check the story seed fields.");
    const { supabase, series } = await scope(seriesId);
    const plan = await writeStoryPlan(supabase, seriesId, series.blueprint, parsed.data);
    return NextResponse.json({ plan }, { headers: noStore });
  } catch (error) {
    if (error instanceof z.ZodError || (error instanceof Error && error.message === "STORY_SEED_INVALID_ASSOCIATION")) {
      return routeError(400, "STORY_INVALID_INPUT", "The story seed associations are invalid.");
    }
    return mapError(error);
  }
}
