import { admitGeneration, GenerationAdmissionError } from "@/lib/operations/generationAdmission";
import { NextRequest, NextResponse } from "next/server";
import { SeriesIdeaRequestSchema } from "@/lib/series/generationRequest";
import { generateSeriesBlueprint, SeriesGenerationError } from "@/lib/series/generateSeriesBlueprint";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const maxDuration = 300;
const error = (status: number, code: string) => NextResponse.json({ error: { code } }, { status, headers: { "Cache-Control": "private, no-store" } });
export async function POST(request: NextRequest) {
  let input: unknown;
  try { input = await request.json(); } catch { return error(400, "INVALID_SERIES_IDEA"); }
  const parsed = SeriesIdeaRequestSchema.safeParse(input);
  if (!parsed.success) return error(400, "INVALID_SERIES_IDEA");
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return error(401, "UNAUTHENTICATED");
    const release = await admitGeneration(user.id);
    let generated;
    try { generated = await generateSeriesBlueprint(parsed.data); } finally { await release(); }
    return NextResponse.json(generated, { headers: { "Cache-Control": "private, no-store" } });
  } catch (caught) {
    if (caught instanceof GenerationAdmissionError) return error(caught.status, caught.code);
    if (caught instanceof SeriesGenerationError) return error(caught.code === "SERIES_PROVIDER_UNAVAILABLE" ? 503 : caught.code === "SERIES_GENERATION_FAILED" ? 502 : 422, caught.code);
    return error(500, "SERIES_GENERATION_FAILED");
  }
}
