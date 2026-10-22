import { describe, it, expect } from "vitest";
import { assertDatabaseIsolation, isOperationsOwner } from "../environment";
const production = "a".repeat(20), preview = "b".repeat(20);
const env = { VERCEL_ENV: "preview", SUPABASE_PRODUCTION_PROJECT_REF: production, SUPABASE_PREVIEW_PROJECT_REF: preview, NEXT_PUBLIC_SUPABASE_URL: `https://${preview}.supabase.co` };
describe("Hosted database isolation", () => {
  it("accepts distinct verified preview configuration", () => expect(() => assertDatabaseIsolation(env)).not.toThrow());
  it("blocks previews using production", () => expect(() => assertDatabaseIsolation({ ...env, SUPABASE_PREVIEW_PROJECT_REF: production, NEXT_PUBLIC_SUPABASE_URL: `https://${production}.supabase.co` })).toThrow());
  it("blocks a preview without a production identity", () => expect(() => assertDatabaseIsolation({ ...env, SUPABASE_PRODUCTION_PROJECT_REF: undefined })).toThrow());
  it("blocks a preview without its expected identity", () => expect(() => assertDatabaseIsolation({ ...env, SUPABASE_PREVIEW_PROJECT_REF: undefined })).toThrow());
  it("blocks production pointed at preview", () => expect(() => assertDatabaseIsolation({ ...env, VERCEL_ENV: "production" })).toThrow());
  it("accepts matching production", () => expect(() => assertDatabaseIsolation({ ...env, VERCEL_ENV: "production", NEXT_PUBLIC_SUPABASE_URL: `https://${production}.supabase.co` })).not.toThrow());
  it("rejects non-HTTPS and lookalike hosts", () => {
    for (const url of [`http://${preview}.supabase.co`, `https://${preview}.supabase.co.attacker.invalid`]) expect(() => assertDatabaseIsolation({ ...env, NEXT_PUBLIC_SUPABASE_URL: url })).toThrow();
  });
  it("permits disposable local CI without Vercel scopes", () => expect(() => assertDatabaseIsolation({ NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321" })).not.toThrow());
  it("fails closed when a hosted environment has an unknown scope", () => {
    for (const scope of ["staging", "qa", ""]) {
      expect(() => assertDatabaseIsolation({ ...env, VERCEL: "1", VERCEL_ENV: scope, NEXT_PUBLIC_SUPABASE_URL: `https://${production}.supabase.co` })).toThrow("DATABASE_ENVIRONMENT_UNSAFE");
    }
    expect(() => assertDatabaseIsolation({ ...env, VERCEL: "1", VERCEL_ENV: undefined })).toThrow("DATABASE_ENVIRONMENT_UNSAFE");
  });
  it("rejects database URLs with credentials, paths, ports, query or fragment", () => {
    for (const url of [
      `https://name:password@${preview}.supabase.co`,
      `https://${preview}.supabase.co/rest/v1`,
      `https://${preview}.supabase.co:5432`,
      `https://${preview}.supabase.co/?unexpected=1`,
      `https://${preview}.supabase.co/#fragment`
    ]) expect(() => assertDatabaseIsolation({ ...env, NEXT_PUBLIC_SUPABASE_URL: url })).toThrow("DATABASE_ENVIRONMENT_UNSAFE");
  });

  it("owner access is an exact, fail-closed user ID allowlist", () => {
    expect(isOperationsOwner("owner", {})).toBe(false);
    expect(isOperationsOwner("owner", { OPERATIONS_OWNER_IDS: "other, owner " })).toBe(true);
    expect(isOperationsOwner("own", { OPERATIONS_OWNER_IDS: "owner" })).toBe(false);
  });
});
