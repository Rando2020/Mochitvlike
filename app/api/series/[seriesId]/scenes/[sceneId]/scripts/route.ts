import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { listScripts } from "@/lib/scripts/persistence/listScripts";
import { ScriptPersistenceError } from "@/lib/scripts/persistence/types";
import { getScene } from "@/lib/scenes/persistence/getScene";
import { getSeries } from "@/lib/series/persistence/getSeries";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ seriesId: string; sceneId: string }> }
) {
  const { seriesId, sceneId } = await params;
  if (!z.string().uuid().safeParse(seriesId).success || !z.string().uuid().safeParse(sceneId).success) {
    return NextResponse.json({ error: { code: "SCRIPT_PARENT_NOT_FOUND" } }, { status: 404 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: { code: "UNAUTHENTICATED" } }, { status: 401 });

  try {
    const series = await getSeries(supabase, user.id, seriesId);
    await getScene(supabase, user.id, seriesId, sceneId, series.blueprint);
    const scripts = await listScripts(supabase, user.id, seriesId, sceneId);
    return NextResponse.json({ scripts }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (caught) {
    if (caught instanceof ScriptPersistenceError && caught.code === "CORRUPT_STORED_SCRIPT") {
      return NextResponse.json({ error: { code: caught.code } }, { status: 500 });
    }
    return NextResponse.json({ error: { code: "SCRIPT_PARENT_NOT_FOUND" } }, { status: 404 });
  }
}
