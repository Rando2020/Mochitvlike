import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getScript } from "@/lib/scripts/persistence/getScript";
import { ScriptPersistenceError } from "@/lib/scripts/persistence/types";
import { updateScriptStatus } from "@/lib/scripts/persistence/updateScript";
import { getScene } from "@/lib/scenes/persistence/getScene";
import { ScenePersistenceError } from "@/lib/scenes/persistence/types";
import { getSeries } from "@/lib/series/persistence/getSeries";
import { SeriesPersistenceError } from "@/lib/series/persistence/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const UpdateSchema = z.object({ status: z.enum(["DRAFT", "APPROVED", "ARCHIVED"]) }).strict();

async function loadAuth() {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return { supabase, user };
}

function notFoundResponse() {
  return NextResponse.json({ error: { code: "SCRIPT_NOT_FOUND" } }, { status: 404 });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ seriesId: string; sceneId: string; scriptId: string }> }
) {
  const { seriesId, sceneId, scriptId } = await params;
  const auth = await loadAuth();
  if (!auth) return NextResponse.json({ error: { code: "UNAUTHENTICATED" } }, { status: 401 });

  try {
    const series = await getSeries(auth.supabase, auth.user.id, seriesId);
    const scene = await getScene(auth.supabase, auth.user.id, seriesId, sceneId, series.blueprint);
    const script = await getScript(auth.supabase, auth.user.id, seriesId, sceneId, scriptId, series.blueprint, scene.blueprint);
    return NextResponse.json({ script }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (caught) {
    if (caught instanceof ScriptPersistenceError && caught.code === "CORRUPT_STORED_SCRIPT") {
      return NextResponse.json({ error: { code: caught.code } }, { status: 500 });
    }
    if (
      (caught instanceof ScriptPersistenceError && caught.code === "SCRIPT_NOT_FOUND") ||
      (caught instanceof ScenePersistenceError && caught.code === "SCENE_NOT_FOUND") ||
      (caught instanceof SeriesPersistenceError && caught.code === "SERIES_NOT_FOUND")
    ) return notFoundResponse();

    return NextResponse.json({ error: { code: "SCRIPT_PERSISTENCE_FAILED" } }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ seriesId: string; sceneId: string; scriptId: string }> }
) {
  const { seriesId, sceneId, scriptId } = await params;
  let json: unknown;
  try { json = await request.json(); } catch { return NextResponse.json({ error: { code: "INVALID_SCRIPT_UPDATE" } }, { status: 400 }); }
  const parsed = UpdateSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_SCRIPT_UPDATE" } }, { status: 400 });

  const auth = await loadAuth();
  if (!auth) return NextResponse.json({ error: { code: "UNAUTHENTICATED" } }, { status: 401 });

  try {
    const series = await getSeries(auth.supabase, auth.user.id, seriesId);
    await getScene(auth.supabase, auth.user.id, seriesId, sceneId, series.blueprint);
    const script = await updateScriptStatus(auth.supabase, {
      creatorId: auth.user.id,
      seriesId,
      sceneId,
      scriptId,
      status: parsed.data.status
    });
    return NextResponse.json({ script });
  } catch (caught) {
    if (
      (caught instanceof ScriptPersistenceError && caught.code === "SCRIPT_NOT_FOUND") ||
      (caught instanceof ScenePersistenceError && caught.code === "SCENE_NOT_FOUND") ||
      (caught instanceof SeriesPersistenceError && caught.code === "SERIES_NOT_FOUND")
    ) return notFoundResponse();

    return NextResponse.json({ error: { code: "SCRIPT_PERSISTENCE_FAILED" } }, { status: 500 });
  }
}
