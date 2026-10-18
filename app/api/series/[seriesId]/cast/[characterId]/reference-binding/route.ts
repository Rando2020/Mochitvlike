import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DirectionEditError } from "@/lib/character-direction/edit";
import { ReferenceBindingRequestSchema, reviewReferenceBinding } from "@/lib/character-direction/review-reference-binding";
import { SeriesPersistenceError } from "@/lib/series/persistence/types";

export async function POST(request: NextRequest, context: { params: Promise<{ seriesId: string; characterId: string }> }) {
  const reply = (status: number, code: string, message: string) => NextResponse.json({ error: { code, message } }, { status, headers: { "Cache-Control": "private, no-store" } });
  try {
    const db = await createServerSupabaseClient();
    const { data: { user }, error } = await db.auth.getUser();
    if (error || !user) return reply(401, "UNAUTHENTICATED", "Sign in to review character references.");
    const parsed = ReferenceBindingRequestSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return reply(400, "INVALID_BINDING", "Reference binding or review data failed validation.");
    const { seriesId, characterId } = await context.params;
    return NextResponse.json(await reviewReferenceBinding(db, user.id, seriesId, characterId, parsed.data), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof DirectionEditError) return reply(error.status, error.code, error.message);
    if (error instanceof SeriesPersistenceError && error.code === "SERIES_NOT_FOUND") return reply(404, "NOT_FOUND", "Character was not found.");
    return reply(503, "BINDING_UNAVAILABLE", "Reference review or approval could not be confirmed. Existing assets and outputs were not changed.");
  }
}
