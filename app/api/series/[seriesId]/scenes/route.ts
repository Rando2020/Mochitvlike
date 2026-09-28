import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { listScenes } from "@/lib/scenes/persistence/listScenes";
import { ScenePersistenceError } from "@/lib/scenes/persistence/types";
import { getSeries } from "@/lib/series/persistence/getSeries";
import { SeriesPersistenceError } from "@/lib/series/persistence/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ seriesId: string }> }
) {
  const { seriesId } = await params;
  if (!z.string().uuid().safeParse(seriesId).success) {
    return errorResponse(404, "SERIES_NOT_FOUND", "Series was not found.");
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return errorResponse(401, "UNAUTHENTICATED", "Authentication is required.");
  }

  try {
    await getSeries(supabase, user.id, seriesId);
    const scenes = await listScenes(supabase, user.id, seriesId);

    return NextResponse.json(
      { scenes },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (caught) {
    if (caught instanceof SeriesPersistenceError && caught.code === "SERIES_NOT_FOUND") {
      return errorResponse(404, "SERIES_NOT_FOUND", "Series was not found.");
    }
    if (caught instanceof ScenePersistenceError && caught.code === "CORRUPT_STORED_SCENE") {
      return errorResponse(500, caught.code, "Stored scene data is invalid.");
    }
    return errorResponse(500, "SCENE_PERSISTENCE_FAILED", "Scenes could not be loaded.");
  }
}
