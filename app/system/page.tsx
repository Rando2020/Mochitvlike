import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isOperationsOwner } from "@/lib/operations/environment";
import { connectionChecks } from "@/lib/operations/status";
import { SupportDetails } from "@/components/operations/SupportDetails";
export const dynamic = "force-dynamic";
export default async function SystemPage() {
  let supabase;
  try { supabase = await createServerSupabaseClient(); } catch { notFound(); }
  let user;
  try { const result = await supabase.auth.getUser(); if (!result.error) user = result.data.user; } catch { redirect("/login"); }
  if (!user) redirect("/login");
  if (!isOperationsOwner(user.id)) notFound();
  const checks = await connectionChecks(supabase);
  const checkedAt = new Date().toISOString();
  return <main className="ops-shell"><p className="ops-eyebrow">OWNER ACCESS</p><h1>Connection checks</h1>
    <p>Checked {checkedAt}. Refresh this page to check again.</p>
    <p className="ops-note">Verified means a read succeeded. Configured means settings exist, with no provider call. These checks do not generate media, claim jobs, or change projects.</p>
    <ul className="ops-list">{checks.map(check => <li key={check.label}><h2>{check.label}</h2><strong>{check.state.replaceAll("_", " ")}</strong><p>{check.message}</p></li>)}</ul>
    <SupportDetails checks={checks} checkedAt={checkedAt} />
    <nav className="ops-links"><Link className="ops-button" href="/studio">Open Studio</Link><a className="ops-button" href="https://vercel.com/dashboard">Hosting Settings</a><a className="ops-button" href="https://supabase.com/dashboard">Database Settings</a><a className="ops-button" href="https://github.com/Rando2020/Mochitvlike/actions">Build Status</a></nav>
  </main>;
}
