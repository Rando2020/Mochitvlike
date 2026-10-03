"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function signIn(formData: FormData): Promise<void> {
  const email = formData.get("email");
  const password = formData.get("password");
  if (typeof email !== "string" || typeof password !== "string" ||
      !email.trim() || email.length > 254 || !password || password.length > 4096) {
    redirect("/login?error=credentials");
  }
  let failed = false;
  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    failed = Boolean(error);
  } catch {
    failed = true;
  }
  if (failed) redirect("/login?error=credentials");
  redirect("/account");
}

export async function signOut(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) redirect("/account?error=signout");
  redirect("/login");
}
