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
    const generated = await generateSeriesBlueprint(parsed.data);
    return NextResponse.json(generated, { headers: { "Cache-Control": "private, no-store" } });
  } catch (caught) {
    if (caught instanceof SeriesGenerationError) return error(caught.code === "SERIES_PROVIDER_UNAVAILABLE" ? 503 : 422, caught.code);
    return error(500, "SERIES_GENERATION_FAILED");
  }
}
