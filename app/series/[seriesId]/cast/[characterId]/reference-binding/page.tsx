import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSeries } from "@/lib/series/persistence/getSeries";
import { SeriesPersistenceError } from "@/lib/series/persistence/types";
import { referenceBindingCandidates } from "@/lib/character-direction/review-reference-binding";
import { ReferenceBindingEditor } from "@/components/series-studio/ReferenceBindingEditor";
import { characterVisualRevision, currentReferenceBinding } from "@/lib/character-direction/reference-binding";

export default async function ReferenceBindingPage({ params }: { params: Promise<{ seriesId: string; characterId: string }> }) {
  const { seriesId, characterId } = await params;
  const db = await createServerSupabaseClient();
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user || seriesId === "demo") notFound();
  try {
    const series = await getSeries(db, user.id, seriesId);
    const member = series.blueprint.cast.find(c => c.id === characterId);
    if (!member) notFound();
    const candidates = await referenceBindingCandidates(db, user.id, seriesId, characterId, series.blueprint);
    return <ReferenceBindingEditor key={`${user.id}:${seriesId}:${characterId}`} seriesId={seriesId} characterId={characterId}
      name={member.name} description={member.characterSheetSeed.visualDescription} candidates={candidates}
      visualRevision={characterVisualRevision(member)} currentReferenceId={currentReferenceBinding(member)?.referenceId ?? null}
      archived={series.status === "ARCHIVED" || !!series.archivedAt} />;
  } catch (error) {
    if (error instanceof SeriesPersistenceError && error.code === "SERIES_NOT_FOUND") notFound();
    throw error;
  }
}
