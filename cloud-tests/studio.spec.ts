import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { theWoundsWeKeep } from "../lib/series/demoBlueprint";

test("sign in, save, reload, isolate owners, and check an empty worker queue", async ({ page, request }) => {
  test.setTimeout(90000);
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
    const saved = await page.request.post("/api/series", { data: { seriesBlueprint: theWoundsWeKeep, metadata: { source: "fallback", schemaVersion: "1.0" } } });
    expect(saved.status()).toBe(201);
    const seriesId = (await saved.json()).series.id;
    const reloaded = await page.request.get(`/api/series/${seriesId}`);
    expect(reloaded.status()).toBe(200);
    await page.reload();
    await page.getByRole("link", { name: /The Wounds We Keep/ }).click();
    await expect(page).toHaveURL(new RegExp(seriesId));
    await expect(page.getByRole("heading", { name: "The Wounds We Keep", exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: "The Wounds We Keep", exact: true })).toBeVisible();
    expect((await request.get(`/api/series/${seriesId}`)).status()).toBe(401);
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
