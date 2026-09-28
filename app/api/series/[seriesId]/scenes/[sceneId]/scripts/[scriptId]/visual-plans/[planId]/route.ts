import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getVisualPlan } from "@/lib/visual-planning/persistence/getVisualPlan";
import { VisualPlanPersistenceError } from "@/lib/visual-planning/persistence/types";
import { updateVisualPlanStatus } from "@/lib/visual-planning/persistence/updateVisualPlan";
import { getScript } from "@/lib/scripts/persistence/getScript";
import { getScene } from "@/lib/scenes/persistence/getScene";
import { getSeries } from "@/lib/series/persistence/getSeries";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const UpdateSchema = z.object({ status: z.enum(["DRAFT","APPROVED","ARCHIVED"]) }).strict();

async function auth() {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return error || !user ? null : { supabase, user };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ seriesId: string; sceneId: string; scriptId: string; planId: string }> }
) {
  const { seriesId, sceneId, scriptId, planId } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: { code: "UNAUTHENTICATED" } }, { status: 401 });

  try {
    const series = await getSeries(session.supabase, session.user.id, seriesId);
    const scene = await getScene(session.supabase, session.user.id, seriesId, sceneId, series.blueprint);
    const script = await getScript(session.supabase, session.user.id, seriesId, sceneId, scriptId, series.blueprint, scene.blueprint);
    const visualPlan = await getVisualPlan(session.supabase, session.user.id, seriesId, sceneId, scriptId, planId, series.blueprint, scene.blueprint, script.script);
    return NextResponse.json({ visualPlan }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (caught) {
    if (caught instanceof VisualPlanPersistenceError && caught.code === "CORRUPT_STORED_VISUAL_PLAN") {
      return NextResponse.json({ error: { code: caught.code } }, { status: 500 });
    }
    return NextResponse.json({ error: { code: "VISUAL_PLAN_NOT_FOUND" } }, { status: 404 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ seriesId: string; sceneId: string; scriptId: string; planId: string }> }
) {
  const { seriesId, sceneId, scriptId, planId } = await params;
  let json: unknown;
  try { json = await request.json(); } catch { return NextResponse.json({ error: { code: "INVALID_VISUAL_PLAN_UPDATE" } }, { status: 400 }); }
  const parsed = UpdateSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_VISUAL_PLAN_UPDATE" } }, { status: 400 });

  const session = await auth();
  if (!session) return NextResponse.json({ error: { code: "UNAUTHENTICATED" } }, { status: 401 });

  try {
    const series = await getSeries(session.supabase, session.user.id, seriesId);
    const scene = await getScene(session.supabase, session.user.id, seriesId, sceneId, series.blueprint);
    await getScript(session.supabase, session.user.id, seriesId, sceneId, scriptId, series.blueprint, scene.blueprint);
    const visualPlan = await updateVisualPlanStatus(session.supabase, {
      creatorId: session.user.id, seriesId, sceneId, scriptId, planId, status: parsed.data.status
    });
    return NextResponse.json({ visualPlan });
  } catch {
    return NextResponse.json({ error: { code: "VISUAL_PLAN_NOT_FOUND" } }, { status: 404 });
  }
}
