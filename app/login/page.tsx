import Link from "next/link";
import { signIn } from "./actions";

export default async function LoginPage({ searchParams }: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main style={{ maxWidth: 440, margin: "64px auto", padding: 24 }}>
      <h1>Sign in to your studio</h1>
      <p>Use your existing creator account.</p>
      {error === "credentials" && <p role="alert">Unable to sign in. Check your email and password and try again.</p>}
      <form action={signIn} style={{ display: "grid", gap: 16 }}>
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="username" required maxLength={254} />
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required maxLength={4096} />
        <button type="submit">Sign in</button>
      </form>
      <p><Link href="/">Open Series Studio</Link></p>
    </main>
  );
}
