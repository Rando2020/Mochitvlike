# Vercel deployment hardening

## Scope and defaults

Text generation defaults off unless `TEXT_GENERATION_ENABLED=true` in that deployment's scope. Existing saves and reads remain available. A new service-role-only database reservation gates show and scene generation across Vercel instances: one active request per creator, three reserved requests in a rolling hour, twenty reserved requests per UTC day across the database. Each reservation includes the possible repair call. Failed attempts count. A crashed request expires after six minutes; quota history is retained for two days. No process-local counters are used.

These are request-volume limits, not a currency budget, and they do not cover media workers or other generation routes. Configure a provider-side budget and review model pricing before enabling. Preview and production must use separate databases, credentials, and provider budgets. Missing schema, credentials, or unexpected RPC responses fail closed before provider execution.

## Rollout order

1. Review this PR together with open PRs #39, #40 and #41. This branch reuses only the read-only demo test assertion from #39 to unblock independent CI; it does not merge the other fixes. Its scene route additions need to survive integration with #40.
2. Run CI and Cloud Smoke at the final candidate SHA. Cloud Smoke replays the migration and runs the new pgTAP quota/security tests in a disposable database.
3. Use Database Release to plan and apply the new migration on the isolated Preview database, then verify two-owner access and concurrent admissions. Repeat the reviewed migration process for Production before enabling text generation there. Never use an app rollback as a database rollback.
4. Merge only after required repository checks and migration readiness are verified. Enable text generation separately in each intended scope and redeploy to consume changed environment settings.
5. Confirm function duration/cron support in the paid hosting plan. Existing motion workers request 780 seconds; the preview dispatcher allows 800 seconds. A Hobby deployment is not suitable for the current minute-frequency cron design. No plan purchase or paid jobs are performed by this change.

## Explicit preview workers

Vercel schedules the five existing cron entries on Production only. Preview has an opt-in POST dispatcher at `/api/internal/preview-worker`, disabled by default and always unavailable in Production. It validates preview database isolation and a dedicated preview-only secret before invoking one existing leased worker. Allowed queues: storyboard, motion, dialogue, sound, frame. It processes at most one existing job and may incur provider costs.

To use it after cost review, set Preview-only `PREVIEW_WORKERS_ENABLED=true`, `PREVIEW_WORKER_SECRET`, and the existing `CRON_SECRET`. Configure a GitHub `preview-workers` environment with required reviewers and default-branch restrictions. Store `PREVIEW_WORKER_SECRET` and `VERCEL_AUTOMATION_BYPASS_SECRET` as environment secrets. The manual Preview Worker workflow accepts only immutable preview URL shapes for this project, sends no credentials to redirects, does not check out repository code, and does not retry. Do not run it just to test connectivity. Use the fixture tests first.

Keep Vercel Deployment Protection enabled. Give human testers appropriate Vercel access or an approved share link. Never put the automation bypass secret in frontend code, public links, artifacts, or logs.

## Build and external release gates

`vercel.json` runs `build:deployment`: typecheck, the full unit suite, then Next.js build. A failed unit check therefore prevents a successful Vercel build without depending on external Deployment Checks. The existing five cron entries are preserved. Disposable database verification and release approval remain separate gates.

In GitHub, require CI, Cloud Smoke and the applicable database checks on main, require PR review, and disallow bypass/direct pushes. In Vercel, require the corresponding Deployment Checks before production domain assignment, or use a separately reviewed staged-production release process. Environment reviewers and branch restrictions must also be configured in GitHub Settings; a YAML `environment:` declaration alone does not create these protections.

The connected GitHub integration returned HTTP 403 for main branch-protection inspection during this work. No claim is made that these external gates are configured. They must be verified before release. The Vercel Node project setting was aligned to 22.x to match package.json, .nvmrc and CI. That setting affects subsequent builds, not an already-deployed runtime.

## Rollback

Pause text generation by removing its enable flag and redeploying. Pause preview workers by removing their enable flag and redeploying. Roll back the app to a known production deployment if necessary; keep the additive reservation table and function intact. Do not drop tables to roll back application code. Verify worker/cron configuration and Vercel protection after rollback.
