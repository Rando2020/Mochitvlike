import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

test("durable admission serializes independent HTTP requests without provider calls", async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (process.env.CLOUD_SMOKE !== "true" || !["127.0.0.1", "localhost"].includes(new URL(url).hostname) ||
      process.env.OPENAI_API_KEY !== "ci-fixture-no-provider-access" || process.env.OPENAI_BASE_URL !== "http://127.0.0.1:4011/v1") throw new Error("DISPOSABLE_FIXTURES_REQUIRED");
  const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const created = await admin.auth.admin.createUser({ email: `quota-${randomUUID()}@example.invalid`, password: randomUUID() + "Aa1!", email_confirm: true });
  expect(created.error).toBeNull();
  const id = created.data.user!.id;
  const reserve = () => admin.rpc("reserve_generation", { p_creator_id: id, p_id: randomUUID() });
  try {
    const results = await Promise.all(Array.from({ length: 5 }, reserve));
    for (const result of results) expect(result.error).toBeNull();
    expect(results.filter(result => result.data === "ACCEPTED")).toHaveLength(1);
    expect(results.filter(result => result.data === "CONCURRENT")).toHaveLength(4);
    for (let i = 0; i < 2; i++) {
      const released = await admin.from("generation_admissions").update({ finished_at: new Date().toISOString() }).eq("creator_id", id);
      expect(released.error).toBeNull();
      expect((await reserve()).data).toBe("ACCEPTED");
    }
    await admin.from("generation_admissions").update({ finished_at: new Date().toISOString() }).eq("creator_id", id);
    expect((await reserve()).data).toBe("USER_LIMIT");
  } finally {
    const deleted = await admin.auth.admin.deleteUser(id);
    expect(deleted.error).toBeNull();
  }
});
