import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { assertDatabaseIsolation } from "@/lib/operations/environment";
import { POST as storyboard } from "../storyboard-jobs/process/route";
import { POST as motion } from "../motion-jobs/process/route";
import { POST as dialogue } from "../dialogue-audio-jobs/process/route";
import { POST as sound } from "../sound-jobs/process/route";
import { POST as frame } from "../production-frame-jobs/process/route";

export const runtime = "nodejs";
export const maxDuration = 800;
const workers = { storyboard, motion, dialogue, sound, frame };
const reject = (status: number) => NextResponse.json({ error: { code: "PREVIEW_WORKER_UNAVAILABLE" } }, { status });

export async function POST(request: NextRequest) {
  if (process.env.VERCEL_ENV !== "preview" || process.env.PREVIEW_WORKERS_ENABLED !== "true") return reject(404);
  const expected = process.env.PREVIEW_WORKER_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!expected || !supplied || !process.env.CRON_SECRET) return reject(401);
  const a = Buffer.from(expected), b = Buffer.from(supplied);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return reject(401);
  try { assertDatabaseIsolation(); } catch { return reject(503); }
  let body: unknown;
  try { body = await request.json(); } catch { return reject(400); }
  const queue = (body as { queue?: string } | null)?.queue;
  if (!queue || !Object.hasOwn(workers, queue)) return reject(400);
  // One leased job only. Reuse each worker's existing auth, claims and ownership controls.
  return workers[queue as keyof typeof workers](new NextRequest(request.url, {
    method: "POST", headers: { authorization: `Bearer ${process.env.CRON_SECRET}` }
  }));
}
