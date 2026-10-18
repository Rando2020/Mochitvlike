import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";

export default async function AccountPage({ searchParams }: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  const params = await searchParams;
  return (
    <main style={{ maxWidth: 560, margin: "64px auto", padding: 24 }}>
      <h1>Your account</h1>
      <p>Signed in as {user.email}</p>
      <p>Creator ID: <code>{user.id}</code></p>
      {params.error === "signout" && <p role="alert">Unable to sign out. Please try again.</p>}
      <p><Link href="/studio" prefetch={false}>Open your saved shows</Link></p>
      <p><Link href="/">Launch page</Link></p>
      <form action={signOut}><button type="submit">Sign out</button></form>
    </main>
  );
}
