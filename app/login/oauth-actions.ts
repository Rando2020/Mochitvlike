"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function startSocialSignIn(formData: FormData): Promise<void> {
  const selected = formData.get("provider");
  if (selected !== "google" && selected !== "apple") redirect("/login?error=provider");
  const headerStore = await headers();
  const origin = headerStore.get("origin");
  const host = headerStore.get("host");
  const forwardedProto = headerStore.get("x-forwarded-proto");
  const canonical = process.env.NEXT_PUBLIC_APP_URL;
  // The canonical deployment origin must be configured; never trust unvalidated Host headers for OAuth redirect destinations.
  let base: URL;
  try {
    base = new URL(canonical ?? "");
    if (base.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && base.origin === "http://localhost:3000")) throw Error();
    if (base.pathname !== "/" || base.search || base.hash || base.username || base.password) throw Error();
  } catch { redirect("/login?error=configuration"); }
  // Prevent a deployment on a different host from starting a flow whose cookies will land elsewhere.
  if (!host || host.toLowerCase() !== base.host.toLowerCase() || (origin && origin !== base.origin) ||
    (forwardedProto && forwardedProto !== base.protocol.slice(0, -1))) redirect("/login?error=configuration");
  let url: string | null = null;
  try {
    const supabase = await createServerSupabaseClient();
    const result = await supabase.auth.signInWithOAuth({
      provider: selected,
      options: { redirectTo: new URL("/auth/callback?next=%2Fstudio", base).toString() }
    });
    if (!result.error) url = result.data.url;
  } catch { /* Keep provider details out of user-visible redirects. */ }
  if (!url) redirect("/login?error=oauth");
  redirect(url);
}
