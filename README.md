# Mochitvlike

Your browser-first anime/show production workspace.

[Open Studio](https://vercel.com/dashboard) · [Preview Changes](https://github.com/Rando2020/Mochitvlike/pulls) · [Build Status](https://github.com/Rando2020/Mochitvlike/actions) · [Database Settings](https://supabase.com/dashboard)

**Open Studio currently opens hosting access.** No verified live app URL is recorded yet. Once deployed, replace that link with the verified production URL ending in `/studio`. Preview URLs appear on pull requests when Vercel is connected; no local installation is needed to review them.

Start with the [browser setup guide](docs/BROWSER_FIRST_SETUP.md). It covers account connection, preview isolation, database updates, owner connection checks, and recovery.

The hosted launch page provides Open Studio, Sign in, Preview Changes, and Build Status. `/studio` lists your saved projects. `/system` is restricted to configured owner accounts. This release does not connect idea-to-series creation or activate media providers.

## Developer checks

Node 22, npm 10.9.4, `npm ci`, `npm run typecheck`, `npm test`, and `npm run build`.

Cloud Smoke runs fresh SQL migration replay, database ownership tests, browser login, project save/reload, and a protected empty-queue worker check inside disposable GitHub-runner infrastructure. It never uses production accounts or paid generation providers.
