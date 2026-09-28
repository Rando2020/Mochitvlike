import { notFound } from "next/navigation";
import { SeriesStudio } from "@/components/series-studio/SeriesStudio";
import { theWoundsWeKeep } from "@/lib/series/demoBlueprint";
import { getSeries } from "@/lib/series/persistence/getSeries";
import { SeriesPersistenceError } from "@/lib/series/persistence/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function SeriesPage({
  params
}: {
  params: Promise<{ seriesId: string }>;
}) {
  const { seriesId } = await params;

  if (seriesId === "demo") {
    if (process.env.NODE_ENV === "production") {
      notFound();
    }

    return <SeriesStudio seriesId="demo" blueprint={theWoundsWeKeep} />;
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    notFound();
  }

  try {
    const series = await getSeries(supabase, user.id, seriesId);

    return (
      <SeriesStudio
        seriesId={series.id}
        blueprint={series.blueprint}
      />
    );
  } catch (caught) {
    if (
      caught instanceof SeriesPersistenceError &&
      (caught.code === "SERIES_NOT_FOUND" || caught.code === "CORRUPT_STORED_SERIES")
    ) {
      notFound();
    }

    throw caught;
  }
}
