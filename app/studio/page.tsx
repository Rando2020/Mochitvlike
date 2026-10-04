import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listSeries } from "@/lib/series/persistence/listSeries";
import type { SeriesSummary } from "@/lib/series/persistence/types";
export const dynamic = "force-dynamic";
export default async function StudioLibrary() {
  let supabase;
  try { supabase = await createServerSupabaseClient(); }
  catch { return <main className="ops-shell"><h1>Studio setup needs attention</h1><p>The database connection is missing or does not match this environment. Ask the project owner to check hosting settings.</p><Link href="/">Back to launch page</Link></main>; }
  let user;
  try { const result = await supabase.auth.getUser(); if (!result.error) user = result.data.user; } catch { redirect("/login"); }
  if (!user) redirect("/login");
  let series: SeriesSummary[] = [];
  let failed = false;
  try { series = await listSeries(supabase, user.id); } catch { failed = true; }
  return <main className="ops-shell"><p className="ops-eyebrow">YOUR WORKSPACE</p><h1>Your shows</h1>
    <p><Link className="ops-button" href="/create">Create a Show</Link></p>
    <p><Link href="/account">Account</Link> · <Link href="/">Launch page</Link></p>
    {failed ? <p role="alert">Your shows could not be loaded. Refresh to try again. If this continues, ask the owner to check database setup.</p> :
      series.filter(s => s.status !== "ARCHIVED").length === 0 ? <p>No saved shows yet. Start with an idea to create your first show.</p> :
      <ul className="ops-list">{series.filter(s => s.status !== "ARCHIVED").map(s => <li key={s.id}><Link href={`/series/${s.id}`}><h2>{s.title}</h2><p>{s.logline}</p><span>Continue Episode 1 →</span></Link></li>)}</ul>}
  </main>;
}
