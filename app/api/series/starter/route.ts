import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { SeriesIdeaRequestSchema } from "@/lib/series/generationRequest";
import { buildStarterBlueprint } from "@/lib/series/buildStarterBlueprint";
import { createSeriesRecord } from "@/lib/series/persistence/createSeries";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const RequestSchema = SeriesIdeaRequestSchema.extend({
  creationId: z.string().uuid()
}).strict();
const fail = (status: number, code: string) =>
  NextResponse.json({ error: { code } }, { status, headers: { "Cache-Control": "private, no-store" } });

// Creates a real RLS-owned starter series with no OpenAI, GPU or external media calls.
// Never claims to have invented a complete show from the user's brief.
export async function POST(request: NextRequest) {
  const json = await request.json().catch(() => null);
  const parsed = RequestSchema.safeParse(json);
  if (!parsed.success) return fail(400, "INVALID_STARTER_REQUEST");

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return fail(401, "UNAUTHENTICATED");

    const series = await createSeriesRecord(supabase, {
      creationId: parsed.data.creationId,
      creatorId: user.id,
      seriesBlueprint: buildStarterBlueprint(parsed.data),
      metadata: { source: "fallback", schemaVersion: "1.0" }
    });
    return NextResponse.json({ series, kind: "STARTER_DRAFT" }, {
      status: 201, headers: { "Cache-Control": "private, no-store" }
    });
  } catch {
    return fail(503, "STARTER_SAVE_UNCONFIRMED");
  }
}
