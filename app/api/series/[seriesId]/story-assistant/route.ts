import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSeries } from "@/lib/series/persistence/getSeries";
import { SeriesPersistenceError } from "@/lib/series/persistence/types";
import { readStoryPlan, StoryPlanError } from "@/lib/story-seeds/persistence";
import { buildStoryContext } from "@/lib/story-assistant/context";
import { SelectedBeatIdsSchema, StoryAssistantRequestSchema } from "@/lib/story-assistant/schema";
import { storyAssistantCapability } from "@/lib/story-assistant/provider";
import { generateStorySuggestions, StoryAssistantError } from "@/lib/story-assistant/service";

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store" };
const maxBodyBytes = 16_384;
const routeError = (status: number, code: string, message: string) =>
  NextResponse.json({ error: { code, message } }, { status, headers: noStore });

async function scope(seriesId: string) {
  if (!z.string().uuid().safeParse(seriesId).success) {
    throw new SeriesPersistenceError("SERIES_NOT_FOUND", "Not found.");
  }
  // The authenticated cookie client retains RLS; never use a service-role client.
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (!user || error) throw new SeriesPersistenceError("UNAUTHENTICATED", "Sign in required.");
  const readSeries = async () => {
    const series = await getSeries(supabase, user.id, seriesId);
    if (series.status === "ARCHIVED" || series.archivedAt !== null) {
      throw new SeriesPersistenceError("SERIES_NOT_FOUND", "Not found.");
    }
    return series;
  };
  const initialSeries = await readSeries();
  let firstRead = true;
  return {
    async readContext(selectedBeatIds: string[], fresh = false) {
      // Re-read ownership, archive state, blueprint and seeds after any future
      // provider call. Initial ownership is checked even while admission is off.
      const series = firstRead && !fresh ? initialSeries : await readSeries();
      firstRead = false;
      const plan = await readStoryPlan(supabase, seriesId, user.id, series.blueprint);
      return buildStoryContext(series, plan, selectedBeatIds);
    }
  };
}
function mapError(error: unknown) {
  if (error instanceof SeriesPersistenceError) {
    if (error.code === "UNAUTHENTICATED") return routeError(401, error.code, "Sign in to use your creator assistant.");
    if (error.code === "SERIES_NOT_FOUND") return routeError(404, error.code, "This series is unavailable.");
  }
  if (error instanceof StoryPlanError) {
    return routeError(503, "ASSISTANT_CONTEXT_UNAVAILABLE", "Saved story seeds could not be loaded. No partial context was used.");
  }
  if (error instanceof StoryAssistantError) {
    switch (error.code) {
      case "ASSISTANT_DISABLED": return routeError(503, error.code, storyAssistantCapability.reason);
      case "ASSISTANT_INVALID_INPUT": return routeError(400, error.code, "Check your prompt and selected story beats.");
      case "ASSISTANT_STALE_CONTEXT": return routeError(409, error.code, "Saved story context changed. Refresh before asking again.");
      case "ASSISTANT_CONTEXT_TOO_LARGE": return routeError(422, error.code, "Saved context exceeds this assistant's limit. Nothing was silently omitted.");
      case "ASSISTANT_ABORTED": return routeError(499, error.code, "The request was canceled.");
      case "ASSISTANT_OUTPUT_INVALID":
      case "ASSISTANT_GENERATION_FAILED": return routeError(502, error.code, "No validated suggestion is available. Your story was not changed.");
      default: return routeError(503, "ASSISTANT_CONTEXT_UNAVAILABLE", "Saved story context could not be verified.");
    }
  }
  return routeError(503, "ASSISTANT_CONTEXT_UNAVAILABLE", "Your saved story context is temporarily unavailable.");
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ seriesId: string }> }) {
  try {
    const { seriesId } = await params;
    const scoped = await scope(seriesId);
    const query = request.nextUrl.searchParams;
    if ([...query.keys()].some(key => key !== "beatId")) {
      return routeError(400, "ASSISTANT_INVALID_INPUT", "Only creator story beat selection is supported.");
    }
    const parsed = SelectedBeatIdsSchema.safeParse(query.getAll("beatId"));
    if (!parsed.success) return routeError(400, "ASSISTANT_INVALID_INPUT", "Check your selected story beats.");
    const context = await scoped.readContext(parsed.data);
    return NextResponse.json({ context, capability: storyAssistantCapability }, { headers: noStore });
  } catch (error) { return mapError(error); }
}

async function boundedBody(request: NextRequest): Promise<string | null> {
  const claimedLength = Number(request.headers.get("content-length") ?? 0);
  if (claimedLength > maxBodyBytes) return null;
  if (!request.body) return "";
  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let size = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBodyBytes) { await reader.cancel(); return null; }
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally { reader.releaseLock(); }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ seriesId: string }> }) {
  try {
    const { seriesId } = await params;
    const scoped = await scope(seriesId);
    const origin = request.headers.get("origin");
    if ((origin && origin !== request.nextUrl.origin) || request.headers.get("sec-fetch-site") === "cross-site") {
      return routeError(403, "ASSISTANT_ORIGIN_REJECTED", "Use the assistant from your own Studio.");
    }
    if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
      return routeError(415, "ASSISTANT_INVALID_INPUT", "Provide a JSON story request.");
    }
    let raw: string | null;
    try { raw = await boundedBody(request); }
    catch { return routeError(400, "ASSISTANT_INVALID_INPUT", "Provide a valid story request."); }
    if (raw === null) return routeError(413, "ASSISTANT_PAYLOAD_TOO_LARGE", "The story request is too large.");
    let body: unknown;
    try { body = JSON.parse(raw); }
    catch { return routeError(400, "ASSISTANT_INVALID_INPUT", "Provide a valid story request."); }
    const parsed = StoryAssistantRequestSchema.safeParse(body);
    if (!parsed.success) return routeError(400, "ASSISTANT_INVALID_INPUT", "Check your prompt and selected story beats.");
    const result = await generateStorySuggestions({ request: parsed.data, readContext: (ids) => scoped.readContext(ids, true), signal: request.signal });
    return NextResponse.json(result, { headers: noStore });
  } catch (error) { return mapError(error); }
}
