import { notFound } from "next/navigation";
import { ScriptWorkspace } from "@/components/scripts/ScriptWorkspace";
import { getScript } from "@/lib/scripts/persistence/getScript";
import { listScripts } from "@/lib/scripts/persistence/listScripts";
import { ScriptPersistenceError } from "@/lib/scripts/persistence/types";
import { getScene } from "@/lib/scenes/persistence/getScene";
import { ScenePersistenceError } from "@/lib/scenes/persistence/types";
import { getSeries } from "@/lib/series/persistence/getSeries";
import { SeriesPersistenceError } from "@/lib/series/persistence/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function ScriptPage({
  params
}: {
  params: Promise<{ seriesId: string; sceneId: string; scriptId: string }>;
}) {
  const { seriesId, sceneId, scriptId } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) notFound();

  try {
    const series = await getSeries(supabase, user.id, seriesId);
    const scene = await getScene(supabase, user.id, seriesId, sceneId, series.blueprint);
    const [script, versions] = await Promise.all([
      getScript(supabase, user.id, seriesId, sceneId, scriptId, series.blueprint, scene.blueprint),
      listScripts(supabase, user.id, seriesId, sceneId)
    ]);

    return <ScriptWorkspace script={script.script} versions={versions} series={series.blueprint} />;
  } catch (caught) {
    if (
      (caught instanceof ScriptPersistenceError && caught.code === "SCRIPT_NOT_FOUND") ||
      (caught instanceof ScenePersistenceError && caught.code === "SCENE_NOT_FOUND") ||
      (caught instanceof SeriesPersistenceError && caught.code === "SERIES_NOT_FOUND")
    ) notFound();

    throw caught;
  }
}
