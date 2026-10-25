import { notFound } from "next/navigation";
import { CreatorExperiencePreview } from "@/components/creator-preview/CreatorExperiencePreview";
import { getSeries } from "@/lib/series/persistence/getSeries";
import { SeriesPersistenceError } from "@/lib/series/persistence/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function OwnedCreatorPreviewPage({ params }: { params: Promise<{ seriesId: string }> }) {
  const { seriesId } = await params;
  if (seriesId === "demo") {
    notFound();
  }
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    notFound();
  }
  try {
    const series = await getSeries(supabase, user.id, seriesId);
    return <CreatorExperiencePreview blueprint={series.blueprint} seriesId={series.id} savedBlueprintUpdatedAt={series.updatedAt} />;
  } catch (caught) {
    if (caught instanceof SeriesPersistenceError && (caught.code === "SERIES_NOT_FOUND" || caught.code === "CORRUPT_STORED_SERIES")) {
      notFound();
    }
    throw caught;
  }
}
