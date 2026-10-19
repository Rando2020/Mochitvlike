import { GuidedShowCreation } from "@/components/show-creation/GuidedShowCreation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listSeries } from "@/lib/series/persistence/listSeries";
import type { SeriesSummary } from "@/lib/series/persistence/types";

export const dynamic = "force-dynamic";
export default async function CreateShowPage() {
  let creatorId: string | null = null;
  let series: SeriesSummary[] = [];
  let connectionIssue = false;
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) connectionIssue = true;
    if (user && !error) {
      creatorId = user.id;
      try { series = await listSeries(supabase, user.id); } catch { connectionIssue = true; }
    }
  } catch { connectionIssue = true; }
  const providerReady = Boolean(process.env.OPENAI_API_KEY && (process.env.OPENAI_SERIES_MODEL || process.env.OPENAI_SCENE_MODEL));
  return <GuidedShowCreation creatorId={creatorId} providerReady={providerReady} series={series} connectionIssue={connectionIssue} />;
}
