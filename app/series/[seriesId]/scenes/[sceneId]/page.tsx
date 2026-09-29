import { notFound } from "next/navigation";
import { SceneWorkspace } from "@/components/scenes/SceneWorkspace";
import { getLatestScript } from "@/lib/scripts/persistence/getScript";
import { getScene } from "@/lib/scenes/persistence/getScene";
import { ScenePersistenceError } from "@/lib/scenes/persistence/types";
import { getSeries } from "@/lib/series/persistence/getSeries";
import { SeriesPersistenceError } from "@/lib/series/persistence/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function ScenePage({
  params
}: {
  params: Promise<{ seriesId: string; sceneId: string }>;
}) {
  const { seriesId, sceneId } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) notFound();

  try {
    const series = await getSeries(supabase, user.id, seriesId);
    const scene = await getScene(supabase, user.id, seriesId, sceneId, series.blueprint);
    const latest = await getLatestScript(
      supabase,
      user.id,
      seriesId,
      sceneId,
      series.blueprint,
      scene.blueprint
    );

    return (
      <SceneWorkspace
        scene={scene.blueprint}
        series={series.blueprint}
        latestScript={latest ? {
          id: latest.id,
          version: latest.version,
          status: latest.status,
          estimatedDurationSeconds: latest.script.estimatedDurationSeconds,
          updatedAt: latest.updatedAt
        } : null}
      />
    );
  } catch (caught) {
    if (
      (caught instanceof ScenePersistenceError && caught.code === "SCENE_NOT_FOUND") ||
      (caught instanceof SeriesPersistenceError && caught.code === "SERIES_NOT_FOUND")
    ) notFound();

    throw caught;
  }
}
