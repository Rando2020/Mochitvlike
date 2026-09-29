import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getScene } from "@/lib/scenes/persistence/getScene";
import { ScenePersistenceError } from "@/lib/scenes/persistence/types";
import { updateSceneStatus } from "@/lib/scenes/persistence/updateScene";
import { getSeries } from "@/lib/series/persistence/getSeries";
import { SeriesPersistenceError } from "@/lib/series/persistence/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const UpdateSchema = z.object({
  status: z.enum(["DRAFT", "READY", "ARCHIVED"])
}).strict();

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

async function auth() {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return { supabase, user };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ seriesId: string; sceneId: string }> }
) {
  const { seriesId, sceneId } = await params;

  if (!z.string().uuid().safeParse(seriesId).success || !z.string().uuid().safeParse(sceneId).success) {
    return errorResponse(404, "SCENE_NOT_FOUND", "Scene was not found.");
  }

  const session = await auth();
  if (!session) return errorResponse(401, "UNAUTHENTICATED", "Authentication is required.");

  try {
    const series = await getSeries(session.supabase, session.user.id, seriesId);
    const scene = await getScene(
      session.supabase,
      session.user.id,
      seriesId,
      sceneId,
      series.blueprint
    );

    return NextResponse.json({ scene }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (
      (error instanceof ScenePersistenceError && error.code === "SCENE_NOT_FOUND") ||
      (error instanceof SeriesPersistenceError && error.code === "SERIES_NOT_FOUND")
    ) {
      return errorResponse(404, "SCENE_NOT_FOUND", "Scene was not found.");
    }

    if (error instanceof ScenePersistenceError && error.code === "CORRUPT_STORED_SCENE") {
      return errorResponse(500, error.code, "Stored scene data is invalid.");
    }

    return errorResponse(500, "SCENE_PERSISTENCE_FAILED", "Scene could not be loaded.");
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ seriesId: string; sceneId: string }> }
) {
  const { seriesId, sceneId } = await params;

  if (!z.string().uuid().safeParse(seriesId).success || !z.string().uuid().safeParse(sceneId).success) {
    return errorResponse(404, "SCENE_NOT_FOUND", "Scene was not found.");
  }

  let json: unknown;

  try {
    json = await request.json();
  } catch {
    return errorResponse(400, "INVALID_SCENE_UPDATE", "Request body must contain valid JSON.");
  }

  const parsed = UpdateSchema.safeParse(json);

  if (!parsed.success) {
    return errorResponse(400, "INVALID_SCENE_UPDATE", "Scene update is invalid.");
  }

  const session = await auth();
  if (!session) return errorResponse(401, "UNAUTHENTICATED", "Authentication is required.");

  try {
    await getSeries(session.supabase, session.user.id, seriesId);

    const scene = await updateSceneStatus(session.supabase, {
      creatorId: session.user.id,
      seriesId,
      sceneId,
      status: parsed.data.status
    });

    return NextResponse.json({ scene });
  } catch (error) {
    if (
      (error instanceof ScenePersistenceError && error.code === "SCENE_NOT_FOUND") ||
      (error instanceof SeriesPersistenceError && error.code === "SERIES_NOT_FOUND")
    ) {
      return errorResponse(404, "SCENE_NOT_FOUND", "Scene was not found.");
    }

    return errorResponse(500, "SCENE_PERSISTENCE_FAILED", "Scene could not be updated.");
  }
}
