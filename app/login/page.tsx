import Link from "next/link";
import { CrayvoBrand } from "@/components/brand/CrayvoBrand";
import { signIn } from "./actions";
import { startSocialSignIn } from "./oauth-actions";

export default async function LoginPage({ searchParams }: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main style={{ maxWidth: 440, margin: "64px auto", padding: 24 }}>
      <CrayvoBrand /><h1>Sign in to your Crayvo Studio</h1>
      <p>Use your existing creator account.</p>
      {error === "credentials" && <p role="alert">Unable to sign in. Check your email and password and try again.</p>}
      <form action={startSocialSignIn} style={{ display: "grid", gap: 12 }}>
        <button type="submit" name="provider" value="google" className="ops-button">Continue with Google</button>
        <button type="submit" name="provider" value="apple" className="ops-button">Continue with Apple</button>
      </form>
      <p style={{ textAlign: "center" }}>or sign in with email</p>
      {error === "oauth" && <p role="alert">Social sign-in could not finish. Check that this provider is enabled.</p>}
      {error === "configuration" && <p role="alert">Social sign-in needs the approved website URL configured.</p>}
      {error === "provider" && <p role="alert">Unsupported sign-in provider.</p>}
      <form action={signIn} style={{ display: "grid", gap: 16 }}>
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="username" required maxLength={254} />
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required maxLength={4096} />
        <button type="submit">Sign in</button>
      </form>
      <p><Link href="/">Back to launch page</Link></p>
    </main>
  );
}
