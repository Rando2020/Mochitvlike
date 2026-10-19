import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSeries } from "@/lib/series/persistence/getSeries";
import { SeriesPersistenceError } from "@/lib/series/persistence/types";
import { CharacterDirectionEditor } from "@/components/series-studio/CharacterDirectionEditor";

export default async function DirectionPage({ params }: { params: Promise<{ seriesId: string; characterId: string }> }) {
  const { seriesId, characterId } = await params;
  const db = await createServerSupabaseClient();
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user || seriesId === "demo") notFound();
  try {
    const series = await getSeries(db, user.id, seriesId);
    const member = series.blueprint.cast.find(c => c.id === characterId);
    if (!member) notFound();
    return <CharacterDirectionEditor key={`${user.id}:${seriesId}:${characterId}`} seriesId={seriesId} member={member} archived={series.status === "ARCHIVED" || !!series.archivedAt} />;
  } catch (error) {
    if (error instanceof SeriesPersistenceError && error.code === "SERIES_NOT_FOUND") notFound();
    throw error;
  }
}
