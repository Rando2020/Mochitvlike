import { NextRequest, NextResponse } from "next/server";
import { listVisualPlans } from "@/lib/visual-planning/persistence/listVisualPlans";
import { getScript } from "@/lib/scripts/persistence/getScript";
import { getScene } from "@/lib/scenes/persistence/getScene";
import { getSeries } from "@/lib/series/persistence/getSeries";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ seriesId: string; sceneId: string; scriptId: string }> }
) {
  const { seriesId, sceneId, scriptId } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: { code: "UNAUTHENTICATED" } }, { status: 401 });

  try {
    const series = await getSeries(supabase, user.id, seriesId);
    const scene = await getScene(supabase, user.id, seriesId, sceneId, series.blueprint);
    await getScript(supabase, user.id, seriesId, sceneId, scriptId, series.blueprint, scene.blueprint);
    const visualPlans = await listVisualPlans(supabase, user.id, seriesId, sceneId, scriptId);
    return NextResponse.json({ visualPlans }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: { code: "VISUAL_PLAN_PARENT_NOT_FOUND" } }, { status: 404 });
  }
}
