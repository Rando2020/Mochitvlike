import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../route";
import { POST as storyboard } from "../../storyboard-jobs/process/route";
vi.mock("../../storyboard-jobs/process/route", () => ({ POST: vi.fn(async () => Response.json({ processed: 1 })) }));
vi.mock("../../motion-jobs/process/route", () => ({ POST: vi.fn() }));
vi.mock("../../dialogue-audio-jobs/process/route", () => ({ POST: vi.fn() }));
vi.mock("../../sound-jobs/process/route", () => ({ POST: vi.fn() }));
vi.mock("../../production-frame-jobs/process/route", () => ({ POST: vi.fn() }));
const request = (token = "test-preview-secret", queue = "storyboard") => new NextRequest("https://preview.vercel.app/api/internal/preview-worker", { method: "POST", headers: { authorization: `Bearer ${token}` }, body: JSON.stringify({ queue }) });
beforeEach(() => {
  vi.unstubAllEnvs(); vi.clearAllMocks();
  vi.stubEnv("VERCEL_ENV", "preview"); vi.stubEnv("PREVIEW_WORKERS_ENABLED", "true");
  vi.stubEnv("PREVIEW_WORKER_SECRET", "test-preview-secret"); vi.stubEnv("CRON_SECRET", "test-cron-secret");
  vi.stubEnv("SUPABASE_PRODUCTION_PROJECT_REF", "a".repeat(20));
  vi.stubEnv("SUPABASE_PREVIEW_PROJECT_REF", "b".repeat(20));
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", `https://${"b".repeat(20)}.supabase.co`);
});
it("never runs on production even with correct credentials", async () => {
  vi.stubEnv("VERCEL_ENV", "production"); expect((await POST(request())).status).toBe(404); expect(storyboard).not.toHaveBeenCalled();
});
it("defaults off", async () => {
  vi.stubEnv("PREVIEW_WORKERS_ENABLED", ""); expect((await POST(request())).status).toBe(404); expect(storyboard).not.toHaveBeenCalled();
});
it("rejects invalid credentials and queues", async () => {
  expect((await POST(request("wrong"))).status).toBe(401);
  expect((await POST(request(undefined, "constructor"))).status).toBe(400);
  expect(storyboard).not.toHaveBeenCalled();
});
it("rejects production DB in preview", async () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", `https://${"a".repeat(20)}.supabase.co`);
  expect((await POST(request())).status).toBe(503); expect(storyboard).not.toHaveBeenCalled();
});
it("dispatches one job through existing worker auth", async () => {
  expect((await POST(request())).status).toBe(200); expect(storyboard).toHaveBeenCalledTimes(1);
  expect(vi.mocked(storyboard).mock.calls[0][0].headers.get("authorization")).toBe("Bearer test-cron-secret");
});

afterEach(() => vi.unstubAllEnvs());
