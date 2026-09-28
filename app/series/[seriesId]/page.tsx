import { notFound } from "next/navigation";
import { SeriesStudio } from "@/components/series-studio/SeriesStudio";
import { theWoundsWeKeep } from "@/lib/series/demoBlueprint";

export default async function SeriesPage({
  params
}: {
  params: Promise<{ seriesId: string }>;
}) {
  const { seriesId } = await params;

  if (seriesId !== "demo") {
    notFound();
  }

  return <SeriesStudio seriesId={seriesId} blueprint={theWoundsWeKeep} />;
}
