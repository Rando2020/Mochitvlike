type Environment = Record<string, string | undefined>;

// Every hosted client, including workers, must pass this boundary.
export function assertDatabaseIsolation(env: Environment = process.env): void {
  if (!env.VERCEL_ENV || env.VERCEL_ENV === "development") return;
  const production = env.SUPABASE_PRODUCTION_PROJECT_REF;
  const preview = env.SUPABASE_PREVIEW_PROJECT_REF;
  let host = "";
  try {
    const url = new URL(env.NEXT_PUBLIC_SUPABASE_URL ?? "");
    if (url.protocol !== "https:") throw new Error();
    host = url.hostname;
  } catch { throw new Error("DATABASE_ENVIRONMENT_UNSAFE"); }
  if (!production || !/^[a-z]{20}$/.test(production)) throw new Error("DATABASE_ENVIRONMENT_UNSAFE");
  if (env.VERCEL_ENV === "production" && host !== `${production}.supabase.co`) {
    throw new Error("DATABASE_ENVIRONMENT_UNSAFE");
  }
  if (env.VERCEL_ENV === "preview" && (!preview || !/^[a-z]{20}$/.test(preview) ||
    preview === production || host !== `${preview}.supabase.co`)) {
    throw new Error("DATABASE_ENVIRONMENT_UNSAFE");
  }
}

export function isOperationsOwner(userId: string, env: Environment = process.env): boolean {
  return (env.OPERATIONS_OWNER_IDS ?? "").split(",").map(id => id.trim()).filter(Boolean).includes(userId);
}
