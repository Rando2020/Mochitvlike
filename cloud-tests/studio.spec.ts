import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { theWoundsWeKeep } from "../lib/series/demoBlueprint";
import { buildValidScene } from "../lib/scenes/__tests__/fixtures";

test("create a show with fixture direction, recover uncertain save, reload, and isolate worker access", async ({ page, request }) => {
  test.setTimeout(120000);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (process.env.CLOUD_SMOKE !== "true" || !["127.0.0.1", "localhost"].includes(new URL(url).hostname) ||
      process.env.OPENAI_BASE_URL !== "http://127.0.0.1:4011/v1" || process.env.OPENAI_API_KEY !== "ci-fixture-no-provider-access") {
    throw new Error("Smoke writes are restricted to a disposable local database.");
  }
  const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const email = `smoke-${randomUUID()}@example.invalid`;
  const password = randomUUID() + "Aa1!";
  const created = await admin.auth.admin.createUser({ id: process.env.OPERATIONS_OWNER_IDS, email, password, email_confirm: true });
  expect(created.error).toBeNull();
  const id = created.data.user!.id;
  let otherId: string | undefined;
  let sceneCalls = 0;
  // Local HTTP fixture exercises the actual SDK, authenticated route, validation,
  // and database persistence. It is not a live model or a production endpoint.
  const fixtureProvider = createServer(async (req, res) => {
    try {
      if (req.method !== "POST" || req.url !== "/v1/responses" || req.headers.authorization !== "Bearer ci-fixture-no-provider-access") {
        res.writeHead(403).end(); return;
      }
      let source = "";
      for await (const chunk of req) { source += chunk; if (source.length > 100000) throw new Error("FIXTURE_REQUEST_TOO_LARGE"); }
      const body = JSON.parse(source);
      if (body.model !== "ci-fixture-scene-model") { res.writeHead(400).end(); return; }
      sceneCalls++;
      if (sceneCalls === 1) { res.writeHead(503, { "Content-Type": "application/json" }).end(JSON.stringify({ error: { message: "Simulated provider outage" } })); return; }
      const input = JSON.parse(body.input.find((item: { role: string }) => item.role === "user").content);
      const scene = buildValidScene({ id: input.serverAssignedSceneId, seriesId: input.sceneContext.seriesId });
      res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({
        id: "resp_fixture", object: "response", status: "completed",
        output: [{ type: "message", id: "msg_fixture", role: "assistant", status: "completed", content: [{ type: "output_text", text: JSON.stringify(scene), annotations: [] }] }]
      }));
    } catch { res.writeHead(500).end(); }
  });
  try {
    await new Promise<void>((resolve, reject) => { fixtureProvider.once("error", reject); fixtureProvider.listen(4011, "127.0.0.1", resolve); });
    await page.goto("/");
    await page.getByRole("link", { name: "Open Studio", exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/account$/);
    await page.getByRole("link", { name: "Open your saved shows" }).click();
    await expect(page.getByRole("heading", { name: "Your shows" })).toBeVisible();
    await page.getByRole("link", { name: "Create a Show", exact: true }).click();
    await expect(page.getByRole("heading", { name: "What would you love to watch?" })).toBeVisible();
    await page.screenshot({ path: "test-results/create-show-desktop.png", fullPage: true });
    const idea = "A healer carries other people's wounds, until one begins speaking.";
    await page.getByLabel("Describe your show").fill(idea);
    let attempts = 0;
    await page.route("**/api/series/generate", async route => {
      attempts++;
      // Fixture only: exercise UI failure/recovery without calling a paid model.
      if (attempts === 1) return route.fulfill({ status: 503, json: { error: { code: "SERIES_PROVIDER_UNAVAILABLE" } } });
      const payload = route.request().postDataJSON();
      const blueprint = structuredClone(theWoundsWeKeep);
      blueprint.season.format = { ...payload.preferences };
      return route.fulfill({ status: 200, json: { seriesBlueprint: blueprint, metadata: { source: "llm", schemaVersion: "1.0" } } });
    });
    await page.getByRole("button", { name: "Explore this show" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Your idea is still here" })).toBeVisible();
    await expect(page.getByLabel("Describe your show")).toHaveValue(idea);
    await page.getByRole("button", { name: "Explore this show" }).click();
    await expect(page.getByRole("heading", { name: "The Wounds We Keep", exact: true })).toBeVisible();
    // Reload preserves the reviewed direction and its creator-held save ID.
    await page.reload();
    await expect(page.getByRole("heading", { name: "The Wounds We Keep", exact: true })).toBeVisible();
    let creationId: string | undefined;
    let saves = 0;
    await page.route("**/api/series", async route => {
      if (route.request().method() !== "POST") return route.continue();
      saves++;
      const payload = route.request().postDataJSON();
      if (creationId) expect(payload.creationId).toBe(creationId);
      creationId = payload.creationId;
      const response = await route.fetch(); // Real cookie-authenticated save to disposable Supabase.
      expect(response.status()).toBe(201);
      // First response is lost after the DB commits; retry must reuse the same row.
      if (saves === 1) return route.fulfill({ status: 503, json: { error: { code: "SIMULATED_LOST_RESPONSE" } } });
      return route.fulfill({ response });
    });
    await page.getByRole("button", { name: "Save and open Studio" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "could not confirm the save" })).toBeVisible();
    await page.reload();
    await page.getByRole("button", { name: "Save and open Studio" }).click();
    await expect(page).toHaveURL(new RegExp(`/series/${creationId}$`));
    const seriesId = creationId!;
    const reloaded = await page.request.get(`/api/series/${seriesId}`);
    expect(reloaded.status()).toBe(200);
    const rows = await admin.from("series").select("id", { count: "exact", head: true }).eq("creator_id", id);
    expect(rows.error).toBeNull();
    expect(rows.count).toBe(1);
    expect(saves).toBe(2);
    await expect(page.getByRole("heading", { name: "The Wounds We Keep", exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: "The Wounds We Keep", exact: true })).toBeVisible();
    await page.goto("/studio");
    await page.getByRole("link", { name: /The Wounds We Keep/ }).click();
    await expect(page).toHaveURL(new RegExp(seriesId));
    await page.getByRole("button", { name: "Create scene 1 plan", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Check your connection" })).toBeVisible();
    expect(sceneCalls).toBe(1); // SDK retries must not multiply provider attempts.
    await page.getByRole("button", { name: "Create scene 1 plan", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/series/${seriesId}/scenes/[0-9a-f-]{36}$`));
    await expect(page.getByRole("heading", { name: "The Choice to Heal", exact: true })).toBeVisible();
    const sceneId = new URL(page.url()).pathname.split("/").pop()!;
    expect(sceneCalls).toBe(2);
    await page.reload();
    await expect(page.getByRole("heading", { name: "The Choice to Heal", exact: true })).toBeVisible();
    await page.goto(`/series/${seriesId}`);
    await expect(page.getByRole("button", { name: "Open scene 1", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Open scene 1", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(sceneId));
    expect(sceneCalls).toBe(2); // Resuming the saved scene does not regenerate it.
    const sceneRows = await admin.from("series_scenes").select("id", { count: "exact", head: true }).eq("creator_id", id);
    expect(sceneRows.error).toBeNull(); expect(sceneRows.count).toBe(1);
    await page.goto("/system");
    await expect(page.getByRole("heading", { name: "Connection checks", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Scene planning", exact: true })).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/create");
    await expect(page.getByRole("link", { name: "Open saved Studio" })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
    await page.screenshot({ path: "test-results/create-show-mobile.png", fullPage: true });
    await page.setViewportSize({ width: 320, height: 720 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
    await page.screenshot({ path: "test-results/create-show-small-mobile.png", fullPage: true });
    expect((await request.get(`/api/series/${seriesId}`)).status()).toBe(401);
    expect((await request.post("/api/series/generate", { data: { idea: "A small mystery" } })).status()).toBe(401);
    const unauthWorker = await request.get("/api/internal/storyboard-jobs/process");
    expect(unauthWorker.status()).toBe(401);
    const worker = await request.get("/api/internal/storyboard-jobs/process", { headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` } });
    expect(worker.status()).toBe(200);
    expect((await worker.json()).processed).toBe(0); // No paid provider call or invented output.
    await page.goto("/account");
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login$/);
    // Return to the same saved show after a real sign-out/sign-in cycle.
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/account$/);
    await page.goto(`/series/${seriesId}`);
    await expect(page.getByRole("button", { name: "Open scene 1", exact: true })).toBeVisible();
    await page.goto("/account");
    await page.getByRole("button", { name: "Sign out" }).click();
    const otherEmail = `other-${randomUUID()}@example.invalid`;
    const other = await admin.auth.admin.createUser({ email: otherEmail, password, email_confirm: true });
    expect(other.error).toBeNull(); otherId = other.data.user!.id;
    await page.getByLabel("Email", { exact: true }).fill(otherEmail);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/account$/);
    expect((await page.request.get(`/api/series/${seriesId}`)).status()).toBe(404);
    expect((await page.request.get(`/api/series/${seriesId}/scenes/${sceneId}`)).status()).toBe(404);
    expect((await page.request.post(`/api/series/${seriesId}/scenes/generate`, { data: { episodeKey: "episodeOne", beatId: "beat_1" } })).status()).toBe(404);
    expect(sceneCalls).toBe(2);
    expect((await page.request.get("/system")).status()).toBe(404);
    await page.goto("/studio");
    await expect(page.getByRole("link", { name: /The Wounds We Keep/ })).toHaveCount(0);
    await page.goto("/create");
    await expect(page.getByLabel("Describe your show")).toHaveValue("");
  } finally {
    await new Promise<void>(resolve => fixtureProvider.close(() => resolve()));
    if (otherId) await admin.auth.admin.deleteUser(otherId);
    await admin.auth.admin.deleteUser(id);
  }
});
