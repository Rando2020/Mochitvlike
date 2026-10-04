# Browser-first setup

## What you will use

- Your app's `/studio` link to open saved shows.
- GitHub pull requests to review changes and open previews.
- GitHub Actions to see build status and run controlled database releases.
- Vercel and Supabase settings for the one-time account setup.

No local terminal, npm install, or local database is required for these activities.

## Current verified repository facts

Inspected main: `a2c7fb7de8a49f5c19e4a09f5524468e452cb0cc`.
Authentication and the reserved SQL `cast` fix are in open PR #20, `fix/deployment-login-onboarding`. This change is stacked on that PR so it does not duplicate or merge its work. Main CI passed at inspection. Supabase's GitHub app is installed, but the observed Supabase Preview check was skipped because its branch was not associated with a Supabase branch. On authentication PR #20 the integration explicitly reports: "Creating a new preview branch per PR is disabled." Re-enable it in Supabase Project Integrations Settings if choosing native branches. No usable Vercel production or preview URL was verified.

The root previously redirected to `/series/demo`, which returns 404 in production. This release provides a real launch page, authenticated saved-show library, and Create a Show link. That inspected main checkpoint did not contain `/api/series/generate`. The integrated version of this PR now includes the authenticated endpoint and guided creator flow from PR #24, with `/create` as the dedicated entry page. Saved-project access does not imply GPU/media readiness.

## One-time setup in browser dashboards

1. Review and merge authentication PR #20 first when ready. Retarget this stacked PR to main afterward. Do not merge the operations PR into the authentication branch by mistake.
2. In [Vercel](https://vercel.com/new), import the existing `Rando2020/Mochitvlike` repository. Use Next.js, root directory `.`, Node 22, install command `npm ci`, build command `npm run build`, and main as the production branch. Reuse an existing project if present. Do not fork the repository through a template button.
3. In [Supabase](https://supabase.com/dashboard), identify the existing production project and create a distinct preview project, or use an isolated Supabase preview branch. Never copy real creator projects into the test environment.
4. Set the environment values below in Vercel, choosing Production and Preview scopes explicitly. For database branches, configure `SUPABASE_PREVIEW_PROJECT_REF` to match each branch deployment's database alongside its URL and key. A stable dedicated preview project is simplest initially. Automatically supplied Supabase variables alone do not supply this application's project-reference safeguards.
5. Confirm the existing database schema and migration history match the repository before enabling any remote database release. A manually applied migration can exist in the schema without being recorded in the CLI migration history. Do not blindly replay migrations, run remote reset, or automatically repair migration history. Have the agent inspect and reconcile the actual schema and version history.
6. In Supabase Auth, create/invite a creator account with a usable password. Configure the production Site URL and narrowly scoped preview redirect URLs in the dashboard. The committed CLI config is for disposable CI infrastructure, not a production Auth-settings recipe. Keep automatic configuration synchronization off until reviewed.
7. Put the creator's Supabase Auth UUID in server-side `OPERATIONS_OWNER_IDS` for the appropriate Vercel scope. Account IDs appear on `/account`; never use a client-controlled profile field as admin authority.
8. Deploy, open `/`, sign in, and open `/studio`. Record the verified live `/studio` URL in README. Check `/system` as the owner. A different signed-in creator gets 404 for `/system`.

### Hosting settings

| Variable | Production scope | Preview scope |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Production project's HTTPS API URL | Preview project's HTTPS API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production anon/public key | Preview anon/public key |
| `SUPABASE_PRODUCTION_PROJECT_REF` | Production project reference | Same production reference, for isolation comparison |
| `SUPABASE_PREVIEW_PROJECT_REF` | Not required | Actual preview project reference |
| `OPERATIONS_OWNER_IDS` | Production owner's Auth UUID | Preview owner's Auth UUID |
| `SUPABASE_SERVICE_ROLE_KEY` | Production worker secret | Preview worker secret |
| `CRON_SECRET` | Random production worker secret | Different random preview worker secret |

Only URL and anon key are public. All other keys stay server-side. Keep provider credentials in scoped hosting secrets, never in source, screenshots, support copies, or chat. The hosted guard accepts standard `<project-ref>.supabase.co` URLs and rejects mismatched, missing, or non-HTTPS environment configuration before creating any Supabase client, including worker clients. Custom Supabase API domains need an explicit future allowlist change.

Optional server credentials: `OPENAI_API_KEY`, `OPENAI_SERIES_MODEL`, `RUNWAYML_API_SECRET`, `ELEVENLABS_API_KEY`, `VISUAL_INFERENCE_URL`, `VISUAL_INFERENCE_TOKEN`. Show creation requires `OPENAI_API_KEY` and an explicit `OPENAI_SERIES_MODEL` (or existing `OPENAI_SCENE_MODEL`) accessible to the account. It may make two bounded 120-second attempts; its route declares a 300-second maximum, which the hosting configuration must support. Other provider/model defaults must be checked against actual account access before generation. Credentials present is reported as **configured**, not **verified**.

## Background jobs and hosting requirements

`vercel.json` schedules five existing worker routes every minute: storyboard, motion, dialogue audio, sound, and production frame. This frequency requires Vercel Pro or an intentionally implemented alternative scheduler. Hobby permits only daily cron and rejects the current schedule. Do not remove scheduling merely to make a build appear successful.

All worker routes require `Authorization: Bearer <CRON_SECRET>`. Vercel production cron supplies that header when the secret is configured. Preview deployments do not automatically receive production cron execution. A preview scheduler or manually authenticated test is required to exercise pending preview jobs. Long provider work must remain within the existing durable claim/lease and route duration limits. Do not turn it into a browser request that waits indefinitely.

Supabase branching and media/GPU providers may have additional plan and billing requirements. A successful app deployment does not verify Modal, GPU generation, production model approval, or reference conditioning.

## Controlled database updates through buttons

Choose **one migration deployer**. Supabase's GitHub integration already exists. Do not let it and GitHub Actions both apply production migrations.

If keeping native Supabase migration deployment, leave the manual Database Release workflow disabled by its configuration gates. Review its integration status and separately verify preview credentials. If choosing the provided GitHub Actions route:

1. Disable native automatic production migration deployment/configuration sync.
2. Create GitHub Environments named `preview` and `production`. Restrict production to main, add required reviewers, and prevent self-review where your GitHub plan supports it. Do not use apply until those controls are established.
3. In each environment, set secrets `SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_PASSWORD`. Set variables `SUPABASE_PROJECT_REF`, `SUPABASE_PRODUCTION_PROJECT_REF`, `MIGRATION_DEPLOYMENT_MODE=actions`, and, only after schema/history reconciliation, `MIGRATION_HISTORY_VERIFIED=true`.
4. Open Actions → Database Release → Run workflow. Select the intended branch, preview target, plan operation, and its exact full commit SHA. Review pending SQL and test the preview.
5. Run apply on that same preview SHA, then verify the app against it. For production, use main and its reviewed SHA, plan first, then apply. The workflow always repeats dry-run immediately before apply and rejects a moved branch or wrong target.
6. Apply compatible production migrations before promoting an app that depends on them. The manual database workflow does not coordinate or delay Vercel's automatic app promotion. Use Vercel's deployment controls for schema-dependent releases.

The workflow cannot determine whether a plan was reviewed; the release reviewer must check the SHA and SQL. It never invokes remote reset, seed, migration repair, or deletes a database. Migration validation runs on a disposable runner database, without live credentials.

## Connection checks

`/system` revalidates your Auth identity, then checks a server-side UUID allowlist. It reads project and queue table accessibility with your normal RLS-bound account. It checks reference-bucket visibility and reports optional credential configuration. A failed bucket visibility check can indicate bucket-level permissions, not necessarily failed object upload access.

No check claims a job, generates media, or changes any records. Copy Support Details includes only labels, states, generic messages, and timestamp. It excludes credentials, project IDs, user IDs, raw provider/database errors, and saved content. Storage upload/download, scheduler liveness, provider access, and GPU readiness require separate smoke verification.

## Recovery: app rollback versus database recovery

### App rollback

In Vercel Deployments, select the last known working production deployment and use the dashboard rollback control if available on your plan. Verify login, `/studio`, and a saved project after rollback. Rollback changes the running app; it does not undo SQL migrations, database contents, provider state, or already-completed jobs. A database schema must remain compatible with the restored app.

### Database recovery

Prefer a reviewed forward repair migration for a schema defect. For data loss/corruption, use your configured Supabase backups/PITR capabilities and restore procedure after establishing the recovery point and affected data. Backup availability depends on project configuration and plan. Never run `supabase db reset` against a remote project. Never advertise app rollback as project-data recovery.

## Validation boundaries

The browser intercepts `/api/series/generate` with a clearly labeled fixture, so it does not validate a real AI response or charge a provider. CI-only sentinel credentials enable the UI and are never used for live generation. Cloud Smoke uses disposable local Supabase on a GitHub runner, a temporary Auth user, Playwright Chromium, real cookie login, fixture-based direction generation/failure recovery, draft reload, real API save, uncertain-save response recovery with a stable creator-held UUID, retrieval, Studio reload, mobile overflow/screenshot checks, unauthenticated access rejection, and a protected empty storyboard queue check. Database tests independently verify ownership and deny creator worker-claim permission. The empty-queue check verifies route/claim access only; it is not evidence of a completed generated-media job. Existing deterministic job tests cover processor behavior separately.

Live login, project save/reload, provider job completion, stable domain, and preview isolation remain unverified until authenticated hosting access and accounts are available. GitHub CI results must be reported from the actual run, not inferred from workflow source.

## Next isolated self-prompt

[SELF-PROMPT]
Verify the integrated browser-first operations and guided creation PR after authentication PR #20 is merged. Inspect current main and CI, retarget the stacked PR without merging prematurely, and resolve any required fixes. Reuse the existing Vercel project and identify production versus preview Supabase projects. Verify environment isolation and migration history before enabling releases. Configure missing scoped settings through connected account tools where available. Validate live login, project save/reload, owner-only diagnostics, and one explicitly authorized bounded job. Record verified app/preview URLs, hosting requirements, and unresolved media capability honestly. Do not claim GPU execution or model approval. Keep generation and RLS boundaries unchanged.
