import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const canonical = process.env.NEXT_PUBLIC_APP_URL;
  if (!canonical || origin !== canonical.replace(/\/$/, "")) return NextResponse.redirect(new URL("/login?error=configuration", origin));
  const code = request.nextUrl.searchParams.get("code");
  if (!code || code.length > 4096) return NextResponse.redirect(new URL("/login?error=oauth", origin));
  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL("/studio", origin));
  } catch { /* No token, code, or raw provider error in the response. */ }
  return NextResponse.redirect(new URL("/login?error=oauth", origin));
}
