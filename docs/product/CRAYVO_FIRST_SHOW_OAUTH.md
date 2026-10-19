# Crayvo first-show rollout — OAuth and branding

## Creator-facing defaults

A season plan of **12 episodes × 60 seconds** is a blueprint only, not 12 rendered videos. Generate a single show proposal and Episode 1 beat sheet first. Do not enqueue frames, motion, sound, or GPU work. After one saved/reopened show, produce one approved storyboard or limited proof scene with a cost estimate before a full season.

## Google and Apple sign-in

The web login page offers Google and Apple through Supabase Auth PKCE and a server callback. The OAuth UI is wired in code, but neither provider works until the provider credentials and redirect URLs are configured in the **correct Supabase project**.

1. In Vercel set `NEXT_PUBLIC_APP_URL` to the exact production HTTPS origin (no trailing path), e.g. `https://mochitvlike.vercel.app`. Scope to production only. Use a separate explicit origin for each preview deployment, if enabled.
2. In Supabase Authentication → URL Configuration, set Site URL to that origin and add the exact `https://mochitvlike.vercel.app/auth/callback` to the redirect allowlist. Do not use an unrestricted wildcard.
3. In Supabase Authentication → Providers → Google, enable Google and configure Google OAuth client ID and secret from Google Cloud. Set the Google OAuth redirect to the **Supabase Auth callback URL** shown in the provider settings (not the Next.js route). Register the web origin with Google.
4. For Apple, configure Apple Developer Services ID, domain association and required credentials in Supabase Authentication → Providers → Apple. Register the callback exactly as shown by Supabase. Apple setup may require a paid Apple Developer account; do not buy one without approval.
5. Redeploy the reviewed web branch and verify OAuth, session persistence, sign-out, failed/denied consent, stale callback and a second account unable to read the first account's shows.
6. Provider credentials belong in Supabase provider settings, **not** in NEXT_PUBLIC_* variables or source code. Existing email/password login stays available.

### Constraints

The login OAuth flow requires the browser hostname to match `NEXT_PUBLIC_APP_URL` so cookies are set on the intended domain. The callback rejects missing or invalid codes and uses a fixed post-login destination `/studio` to avoid open redirects. It never sends user-provided destination URLs to OAuth providers.

Production site currently serves main commit `c85b5df5` (merged PR #33); Crayvo brand is draft PR #34. This branch stacks on #34 and is not deployed or merged. Use a distinct preview database for preview hosting; production Supabase must not be reused as Preview. Vercel deployment protection may block external automated browser checks.

## Validation gates

- Automated Next.js build, unit tests, browser tests on this branch.
- Confirm provider setup separately; code compilation cannot prove Google or Apple OAuth credentials.
- Verify a real signed-in user can generate, save, refresh, sign out/in, and reopen a show.
- Verify another user cannot read the show.
- No GPU, background worker schedule, production DB migration, or public app launch until reviewed.
