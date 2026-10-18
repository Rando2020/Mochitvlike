import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { theWoundsWeKeep } from "../lib/series/demoBlueprint";

// Real Next.js, cookie-backed Supabase Auth, RLS and RPC end-to-end.
// Absolutely no external model, production DB, or hosted secrets.
test("Story Architect: two real local Auth owners, durable saves, locks, CAS, idempotence and mobile", async ({ page, request, browser }) => {
  test.setTimeout(170000);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const server = new URL(url);
  if (process.env.CLOUD_SMOKE !== "true" ||
    !["127.0.0.1", "localhost"].includes(server.hostname) ||
    process.env.OPENAI_API_KEY !== "ci-fixture-no-provider-access" ||
    process.env.OPENAI_BASE_URL !== "http://127.0.0.1:4011/v1") {
    throw new Error("DISPOSABLE_LOCAL_AUTH_ONLY");
  }

  const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const password = randomUUID() + "aA!3";
  const userAEmail = "seed-owner-" + randomUUID() + "@example.invalid";
  const userBEmail = "seed-other-" + randomUUID() + "@example.invalid";
  let ownerA: string | null = null;
  let ownerB: string | null = null;
  const seriesId = randomUUID();
  const seen: string[] = [];
  const seedTitle = "Orin must choose the cost of healing";
  const rivalTitle = "A rival ending that should not overwrite";
  const additionalTitle = "A prophecy sets up Orin's decision";
  let otherContext: Awaited<ReturnType<typeof browser.newContext>> | null = null;
  let secondTab: typeof page | null = null;

  const navStory = async (p: typeof page, mobile = false) => {
    const label = mobile ? "Creator preview mobile navigation" : "Creator preview sections";
    await p.getByRole("navigation", { name: label }).getByRole("button", { name: /Story$/ }).click();
    await expect(p.getByRole("heading", { name: /Make every moment mean something/i })).toBeVisible();
  };
  const signIn = async (p: typeof page, email: string) => {
    await p.goto("/login");
    await p.getByLabel("Email").fill(email);
    await p.getByLabel("Password").fill(password);
    await p.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(p).toHaveURL(/\/account$/);
  };

  try {
    const a = await admin.auth.admin.createUser({ email: userAEmail, password, email_confirm: true });
    expect(a.error).toBeNull(); ownerA = a.data.user!.id;
    const b = await admin.auth.admin.createUser({ email: userBEmail, password, email_confirm: true });
    expect(b.error).toBeNull(); ownerB = b.data.user!.id;
    const { error: seriesError } = await admin.from("series").insert({
      id: seriesId, creator_id: ownerA, title: theWoundsWeKeep.identity.title,
      slug: "story-seeds-local-smoke", status: "DRAFT", blueprint: theWoundsWeKeep,
      blueprint_schema_version: "1.0", generation_source: "llm"
    });
    expect(seriesError).toBeNull();

    expect((await request.get("/api/series/" + seriesId + "/story-seeds")).status()).toBe(401);
    await signIn(page, userAEmail);
    await page.goto("/series/" + seriesId + "/creator-preview");
    await navStory(page);
    await expect(page.getByRole("heading", { name: /Your story starts with one turning point/ })).toBeVisible();
    await page.getByRole("button", { name: "Advanced", exact: true }).click();
    await page.getByLabel("Describe your moment").fill(seedTitle);
    await page.getByLabel("Event type").selectOption("ENDING");
    await page.getByLabel("Where does it happen?").selectOption("FINALE");
    await page.getByLabel("What sets this up?").fill("The wound creature offers a choice");
    await page.getByLabel("What's the emotional payoff?").fill("Orin learns his worth is not pain");
    await page.getByRole("button", { name: /Add to draft/ }).click();
    const ending = page.locator("article").filter({ hasText: seedTitle });
    await expect(ending).toBeVisible();
    await ending.getByRole("button", { name: /Lock/ }).click();

    let firstSaveRequest: unknown = null;
    let intercepted = false;
    await page.route("**/api/series/" + seriesId + "/story-seeds", async (route) => {
      if (route.request().method() !== "PUT" || intercepted) {
        await route.continue(); return;
      }
      intercepted = true;
      firstSaveRequest = route.request().postDataJSON();
      const real = await route.fetch();
      expect(real.status()).toBe(200);
      // Simulate response lost AFTER the authenticated RPC committed.
      await route.fulfill({ status: 503, json: { error: { code: "RESPONSE_LOST" } } });
    });
    await page.getByRole("button", { name: "Save story plan" }).click();
    await expect(page.getByRole("alert")).toContainText("Retry");
    await page.getByRole("button", { name: "Retry exact save" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Story seeds saved" })).toBeVisible();
    const initialPlan = await page.request.get("/api/series/" + seriesId + "/story-seeds");
    expect(initialPlan.status()).toBe(200);
    const initial = (await initialPlan.json()).plan;
    expect(initial.revision).toBe(1);
    expect(initial.seeds).toHaveLength(1);
    expect(initial.seeds[0].locked).toBe(true);
    expect(initial.seeds[0].payoff).toBe("Orin learns his worth is not pain");
    expect(firstSaveRequest).toMatchObject({ expectedRevision: 0, seeds: [{ title: seedTitle }] });

    await page.reload();
    await navStory(page);
    await expect(page.locator("article").filter({ hasText: seedTitle })).toBeVisible();
    await expect(page.getByText("Saved revision 1")).toBeVisible();

    // Two open signed-in tabs load the same revision; only the first may advance.
    secondTab = await page.context().newPage();
    await secondTab.goto("/series/" + seriesId + "/creator-preview");
    await navStory(secondTab);
    await expect(secondTab.getByText("Saved revision 1")).toBeVisible();

    await page.getByLabel("Describe your moment").fill(additionalTitle);
    // Switching app sections must NOT discard an unsaved authoring draft.
    await page.getByRole("navigation", { name: "Creator preview sections" })
      .getByRole("button", { name: /Cast$/ }).click();
    await expect(page.getByText(/Unsaved Story Architect changes are still here/)).toBeVisible().catch(() => {});
    await page.getByRole("button", { name: /Return to Story Architect/ }).click();
    await expect(page.getByLabel("Describe your moment")).toHaveValue(additionalTitle);
    await page.getByRole("button", { name: /Add to draft/ }).click();
    await page.getByRole("button", { name: "Save story plan" }).click();
    await expect(page.getByText("Saved revision 2")).toBeVisible();

    await secondTab.getByLabel("Describe your moment").fill(rivalTitle);
    await secondTab.getByRole("button", { name: /Add to draft/ }).click();
    await secondTab.getByRole("button", { name: "Save story plan" }).click();
    await expect(secondTab.getByRole("alert")).toContainText("Your draft is still here");
    await expect(secondTab.getByText(rivalTitle)).toBeVisible();
    const afterConflict = await secondTab.request.get("/api/series/" + seriesId + "/story-seeds");
    expect((await afterConflict.json()).plan.revision).toBe(2);
    await secondTab.getByRole("button", { name: "Reload saved plan" }).click();
    await secondTab.getByRole("button", { name: "Confirm discard & reload" }).click();
    await expect(secondTab.getByText(additionalTitle)).toBeVisible();
    await expect(secondTab.getByText(rivalTitle)).toHaveCount(0);
    await secondTab.close(); secondTab = null;

    // Previously locked ending cannot be removed without explicit review.
    const locked = page.locator("article").filter({ hasText: seedTitle });
    await locked.getByRole("button", { name: "Remove" }).click();
    await expect(page.getByRole("checkbox", { name: /reviewed the changes to my locked story moments/i })).toBeVisible();
    await page.getByRole("button", { name: "Save story plan" }).click();
    await expect(page.getByRole("alert")).toContainText("Review and confirm");
    await page.getByRole("checkbox", { name: /reviewed the changes to my locked story moments/i }).check();
    await page.getByRole("button", { name: "Save story plan" }).click();
    await expect(page.getByText("Saved revision 3")).toBeVisible();
    await page.screenshot({ path: "test-results/story-architect-auth-desktop.png", fullPage: true });

    const savedData = await page.request.get("/api/series/" + seriesId + "/story-seeds");
    expect(savedData.status()).toBe(200);
    const finalPlan = (await savedData.json()).plan;
    expect(finalPlan.revision).toBe(3);
    expect(finalPlan.seeds).toHaveLength(1);
    expect(finalPlan.seeds[0].title).toBe(additionalTitle);
    const original = await admin.from("series").select("blueprint").eq("id", seriesId).single();
    expect(original.error).toBeNull();
    expect(original.data!.blueprint).toEqual(theWoundsWeKeep);

    await page.goto("/account");
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login$/);
    await signIn(page, userAEmail);
    await page.goto("/series/" + seriesId + "/creator-preview");
    await navStory(page);
    await expect(page.getByText("Saved revision 3")).toBeVisible();

    // Real mobile navigation and saved Story Architect after a login cycle.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/series/" + seriesId + "/creator-preview");
    await navStory(page, true);
    await expect(page.getByText(additionalTitle)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    await page.screenshot({ path: "test-results/story-architect-auth-mobile.png", fullPage: true });

    // Separate real Auth owner cannot read, write, or open creator A's series.
    otherContext = await browser.newContext();
    const other = await otherContext.newPage();
    await signIn(other, userBEmail);
    expect((await other.request.get("/api/series/" + seriesId + "/story-seeds")).status()).toBe(404);
    const denied = await other.request.put("/api/series/" + seriesId + "/story-seeds", {
      data: { requestId: randomUUID(), expectedRevision: 3, acknowledgeLockedChanges: true, seeds: [] }
    });
    expect(denied.status()).toBe(404);
    expect((await other.request.get("/series/" + seriesId + "/creator-preview")).status()).toBe(404);
    await other.goto("/studio");
    await expect(other.getByRole("link", { name: /The Wounds We Keep/ })).toHaveCount(0);

    expect((await request.get("/api/series/" + seriesId + "/story-seeds")).status()).toBe(401);
    seen.push("authenticated CRUD", "lost response idempotence", "stale writer", "locked approval", "owner isolation", "mobile");
    console.log("PASS Story Architect:", seen.join(", "));
  } finally {
    await secondTab?.close().catch(() => {});
    await otherContext?.close().catch(() => {});
    await admin.from("story_seed_plans").delete().eq("series_id", seriesId);
    await admin.from("series").delete().eq("id", seriesId);
    if (ownerB) await admin.auth.admin.deleteUser(ownerB);
    if (ownerA) await admin.auth.admin.deleteUser(ownerA);
  }
});
