import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { createHash, randomUUID } from "node:crypto";
import sharp from "sharp";
import { theWoundsWeKeep } from "../lib/series/demoBlueprint";

test("crop plans validate locally and preview actual pixels without saving or approving", async ({ page }) => {
  test.setTimeout(120000);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (process.env.CLOUD_SMOKE !== "true" || !["localhost", "127.0.0.1"].includes(new URL(url).hostname) ||
      process.env.OPENAI_API_KEY !== "ci-fixture-no-provider-access") throw new Error("DISPOSABLE_LOCAL_DATABASE_REQUIRED");
  const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const seriesId = randomUUID(), password = randomUUID() + "Aa1!", email = `crop-${randomUUID()}@example.invalid`;
  const characterId = theWoundsWeKeep.cast[0].id;
  let owner: string | undefined;
  try {
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    expect(created.error).toBeNull(); owner = created.data.user!.id;
    expect((await admin.from("series").insert({ id: seriesId, creator_id: owner,
      title: "Disposable crop fixture", slug: `crop-${seriesId}`, status: "DRAFT", blueprint: theWoundsWeKeep,
      blueprint_schema_version: "1.0", generation_source: "fallback" })).error).toBeNull();
    await page.goto("/login");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/account$/);
    const bytes = await sharp({ create: { width: 256, height: 256, channels: 3, background: "#407090" } }).png().toBuffer();
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    // Test-only geometric pixels; no real artwork or rights declarations.
    const upload = await page.request.post(`/api/series/${seriesId}/production-references`, { multipart: {
      file: { name: "fixture.png", mimeType: "image/png", buffer: bytes },
      metadata: JSON.stringify({ type: "CHARACTER", characterId, referenceRole: "OTHER", source: "SYNTHETIC",
        provenance: { source: "SYNTHETIC", creatorNameOrId: null, licenseIdOrDescription: null,
          sourceUrlOrRecord: null, projectSpecific: null, notes: "Disposable geometric test fixture",
          permissions: { productionUse: null, commercialUse: null, modelConditioning: null, redistribution: null } } })
    } });
    expect(upload.status()).toBe(201);
    const sourceId = (await upload.json()).reference.id;
    await page.goto(`/series/${seriesId}/references`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: "Preview crop", exact: true })).toBeDisabled();
    await page.getByLabel("Source sheet", { exact: true }).selectOption(sourceId);
    const plan = { format: "crayvo-sheet-crop-plan-v1", seriesId, characterId,
      source: { sha256, width: 256, height: 256 }, views: [
        { file: "front.png", label: "Fixture front", referenceRole: "FULL_BODY", crop: { left: 0, top: 0, width: 128, height: 128 } },
        { file: "profile.png", label: "Fixture profile", referenceRole: "PROFILE", crop: { left: 128, top: 0, width: 128, height: 128 } }
      ] };
    const mutations: string[] = [];
    page.on("request", request => { if (request.method() === "POST") mutations.push(request.url()); });
    const load = async (value: unknown) => page.getByLabel("Crop plan JSON").setInputFiles({
      name: "plan.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(value))
    });
    await load({ ...plan, source: { ...plan.source, sha256: "0".repeat(64) } });
    await expect(page.getByRole("status")).toHaveText("CROP_PLAN_SOURCE_MISMATCH");
    await load(plan);
    await expect(page.getByRole("status")).toContainText("Loaded 2 crop suggestions");
    await page.getByLabel("Crop plan view").selectOption("1");
    await expect(page.getByLabel("View label")).toHaveValue("Fixture profile");
    expect(mutations).toHaveLength(0);
    await page.getByRole("button", { name: "Preview crop", exact: true }).click();
    const preview = page.getByAltText("Proposed cropped character view");
    await expect(preview).toBeVisible();
    const image = await preview.getAttribute("src");
    expect((await sharp(Buffer.from(image!.split(",")[1], "base64")).metadata()).width).toBe(128);
    await expect(page.getByRole("button", { name: "Save view for review" })).toBeDisabled();
    await page.getByLabel("Crop plan view").selectOption("0");
    await expect(preview).toHaveCount(0);
    expect(mutations).toEqual([`${new URL(page.url()).origin}/api/series/${seriesId}/production-references/${sourceId}/views`]);
    const rows = await admin.from("production_reference_assets").select("approved,creator_approved,status").eq("series_id", seriesId);
    expect(rows.error).toBeNull();
    expect(rows.data).toEqual([{ approved: false, creator_approved: false, status: "UPLOADED" }]);
  } finally {
    if (owner) {
      const rows = await admin.from("production_reference_assets").select("storage_path").eq("series_id", seriesId).eq("creator_id", owner);
      const paths = (rows.data ?? []).map(row => row.storage_path).filter(Boolean);
      if (paths.length) expect((await admin.storage.from("production-references").remove(paths)).error).toBeNull();
      expect((await admin.auth.admin.deleteUser(owner)).error).toBeNull();
    }
  }
});

