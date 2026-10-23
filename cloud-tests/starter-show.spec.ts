import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

// This end-to-end test uses real browser cookies, Supabase Auth, RLS and
// persistence, but ONLY against the disposable local Cloud Smoke database.
test("a creator can save an idea with AI off, reopen it, and deny another owner", async ({ page, request }) => {
  test.setTimeout(120000);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (process.env.CLOUD_SMOKE !== "true" ||
      !["127.0.0.1", "localhost"].includes(new URL(url).hostname) ||
      process.env.OPENAI_API_KEY !== "ci-fixture-no-provider-access") {
    throw new Error("DISPOSABLE_LOCAL_DATABASE_REQUIRED");
  }
  const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const password = randomUUID() + "Aa1!";
  const ownerEmail = `starter-${randomUUID()}@example.invalid`;
  const otherEmail = `other-starter-${randomUUID()}@example.invalid`;
  let ownerId: string | null = null, otherId: string | null = null;
  const brief = "A composer discovers the last sound played in an abandoned theater predicts the next morning.";
  const login = async (email: string) => {
    await page.goto("/login");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/account$/);
  };
  try {
    const first = await admin.auth.admin.createUser({ email: ownerEmail, password, email_confirm: true });
    expect(first.error).toBeNull(); ownerId = first.data.user!.id;
    const second = await admin.auth.admin.createUser({ email: otherEmail, password, email_confirm: true });
    expect(second.error).toBeNull(); otherId = second.data.user!.id;

    await login(ownerEmail);
    await page.goto("/create");
    await page.getByLabel("Describe your show").fill(brief);
    await page.getByRole("button", { name: "Save my idea as a draft (no AI)" }).click();
    await expect(page).toHaveURL(/\/series\/[0-9a-f-]{36}$/);
    const seriesId = page.url().split("/").pop()!;
    const ownerResponse = await page.request.get(`/api/series/${seriesId}`);
    expect(ownerResponse.status()).toBe(200);
    expect(JSON.stringify(await ownerResponse.json())).toContain(brief);
    await page.reload();
    await page.goto("/studio");
    await expect(page.getByRole("link", { name: /composer discovers/i })).toBeVisible();
    const rows = await admin.from("series").select("id,generation_source,blueprint").eq("creator_id", ownerId!);
    expect(rows.error).toBeNull();
    expect(rows.data).toHaveLength(1);
    expect(rows.data![0].generation_source).toBe("fallback");
    expect(JSON.stringify(rows.data![0].blueprint)).not.toContain("Orin");
    expect((await request.get(`/api/series/${seriesId}`)).status()).toBe(401);

    await page.goto("/account");
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login$/);
    await login(ownerEmail);
    await page.goto(`/series/${seriesId}`);
    await expect(page.getByText(brief).first()).toBeVisible();

    await page.goto("/account");
    await page.getByRole("button", { name: "Sign out" }).click();
    await login(otherEmail);
    expect((await page.request.get(`/api/series/${seriesId}`)).status()).toBe(404);
    await page.goto("/studio");
    await expect(page.getByRole("link", { name: /composer discovers/i })).toHaveCount(0);
  } finally {
    if (ownerId) await admin.auth.admin.deleteUser(ownerId);
    if (otherId) await admin.auth.admin.deleteUser(otherId);
  }
});
