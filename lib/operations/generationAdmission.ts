import { randomUUID } from "node:crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export class GenerationAdmissionError extends Error {
  constructor(public readonly code: "GENERATION_DISABLED" | "GENERATION_LIMIT_REACHED" | "GENERATION_LIMIT_UNAVAILABLE", public readonly status: number) { super(code); }
}

// Shared durable limits for show and scene generation. Missing schema/config fails closed.
export async function admitGeneration(creatorId: string): Promise<() => Promise<void>> {
  if (process.env.TEXT_GENERATION_ENABLED !== "true") throw new GenerationAdmissionError("GENERATION_DISABLED", 503);
  try {
    const admin = createAdminSupabaseClient();
    const id = randomUUID();
    const { data, error } = await admin.rpc("reserve_generation", { p_creator_id: creatorId, p_id: id });
    if (error) throw error;
    if (["CONCURRENT", "USER_LIMIT", "GLOBAL_LIMIT"].includes(data)) throw new GenerationAdmissionError("GENERATION_LIMIT_REACHED", 429);
    if (data !== "ACCEPTED") throw new Error("INVALID_ADMISSION_RESPONSE");
    return async () => {
      // Failure leaves the six-minute lease intact, never bypasses quota or refunds attempts.
      try { await admin.from("generation_admissions").update({ finished_at: new Date().toISOString() }).eq("id", id); } catch { /* expires naturally */ }
    };
  } catch (error) {
    if (error instanceof GenerationAdmissionError) throw error;
    throw new GenerationAdmissionError("GENERATION_LIMIT_UNAVAILABLE", 503);
  }
}
