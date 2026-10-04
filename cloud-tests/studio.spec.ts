import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { theWoundsWeKeep } from "../lib/series/demoBlueprint";

test("create a show with fixture direction, recover uncertain save, reload, and isolate worker access", async ({ page, request }) => {
  test.setTimeout(120000);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (process.env.CLOUD_SMOKE !== "true" || !["127.0.0.1", "localhost"].includes(new URL(url).hostname)) {
    throw new Error("Smoke writes are restricted to a disposable local database.");
  }
  const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const email = `smoke-${randomUUID()}@example.invalid`;
  const password = randomUUID() + "Aa1!";
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  expect(created.error).toBeNull();
  const id = created.data.user!.id;
  try {
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
    expect((await page.request.get("/system")).status()).toBe(404); // Signed in, but not an operations owner.
    const unauthWorker = await request.get("/api/internal/storyboard-jobs/process");
    expect(unauthWorker.status()).toBe(401);
    const worker = await request.get("/api/internal/storyboard-jobs/process", { headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` } });
    expect(worker.status()).toBe(200);
    expect((await worker.json()).processed).toBe(0); // No paid provider call or invented output.
    await page.goto("/account");
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login$/);
  } finally { await admin.auth.admin.deleteUser(id); }
});
