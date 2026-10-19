# Crayvo (formerly Mochitvlike)

**Stories become worlds.** Crayvo is a browser-first original anime/show production studio with an installable web experience and a native Expo mobile foundation under `apps/mobile/`.

**Current status:** These changes are proposed on a development branch. Hosted preview, real iPhone execution, and TestFlight distribution have not yet been verified. See [Crayvo Web + iOS MVP](docs/product/CRAYVO_WEB_IOS_MVP.md).

[Open Studio](https://vercel.com/dashboard) · [Preview Changes](https://github.com/Rando2020/Mochitvlike/pulls) · [Build Status](https://github.com/Rando2020/Mochitvlike/actions) · [Database Settings](https://supabase.com/dashboard)

**Open Studio currently opens hosting access.** No verified live app URL is recorded yet. Once deployed, replace that link with the verified production URL ending in `/studio`. Preview URLs appear on pull requests when Vercel is connected; no local installation is needed to review them.

Start with the [browser setup guide](docs/BROWSER_FIRST_SETUP.md). It covers account connection, preview isolation, database updates, owner connection checks, and recovery.

See the [operational release gate](docs/operations/OPERATIONAL_STUDIO_RELEASE.md) for the applied security repair, integrated scene-planning workflow, readiness matrix, and remaining live verification.

The hosted launch page provides Create a Show, Open Studio, Sign in, Preview Changes, and Build Status. `/create` guides idea, direction review, and explicit save. `/studio` lists your saved projects. `/system` is restricted to configured owner accounts. Story creation requires configured server-side AI credentials and a model available to your account; media providers remain separate.

## Developer checks

Node 22, npm 10.9.4, `npm ci`, `npm run typecheck`, `npm test`, and `npm run build`.

Cloud Smoke runs fresh SQL migration replay, database ownership tests, browser login, fixture-based direction review, uncertain-save recovery, project reload, and a protected empty-queue worker check inside disposable GitHub-runner infrastructure. It never uses production accounts or paid generation providers.
