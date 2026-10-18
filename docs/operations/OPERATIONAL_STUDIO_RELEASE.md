# Operational Studio release gate

Inspection date: 2026-10-04 UTC. Source main: `a2c7fb7de8a49f5c19e4a09f5524468e452cb0cc`.

## What this branch completes

The operations/guided-creation branch from #23 and saved-scene guidance from #21 are combined once. Scene generation now requires an explicit account-accessible `OPENAI_SCENE_MODEL`, uses no SDK retries, limits output to 10,000 tokens, and permits at most one validation repair with 120 seconds per call. Its route declares 300 seconds. Missing scene configuration produces a plain-language message while preserving the saved show. `/system` reports show creation and scene planning configuration separately, without calling either provider.

The cloud browser test is extended to check real disposable-database scene persistence through the SDK and route using a loopback HTTP fixture, failure/retry, saved-scene reopen without regeneration, owner diagnostics, sign-out/sign-in recovery, a second creator's access denial, and account-scoped draft isolation. A successful result does not establish live model access.

## Readiness at this checkpoint

| Capability | Implemented | Tested | Deployed | Live verified | Remaining gate |
| --- | --- | --- | --- | --- | --- |
| Login and save/reopen | Integrated draft | Prior #23 Cloud Smoke; extended checks pending this branch CI | Unverified | No | Hosting access and isolated preview |
| Show proposal | Integrated draft | Schema/provider fixtures and browser interception | Unverified | No | Server credentials and accessible model |
| Continue scene planning | #21 integrated; provider bounded | Unit tests pass; extended Cloud Smoke pending | Unverified | No | Scene model and cloud/live smoke |
| Owner diagnostics | Integrated draft | Unit ownership tests; extended browser checks pending | Unverified | No | Server owner allowlist |
| Production RPC privileges | Repair migration | Live rollback test and post-release SQL | Applied to existing database | Yes, catalog checks | Preserve intended grants in future migrations |
| Preview isolation | Fail-closed guard | Unit tests | No isolated preview found | No | Distinct project/branch and cost review |
| Worker execution | Existing durable workers | Unit processors and empty-queue smoke | Unverified | No | Scheduler and scoped credentials |
| Character direction editing | Separate drafts #26/#27 | Not validated by this branch | Not included | No | Separate schema-consumer integration |
| Media generation | Existing architecture; adapter merged in #19 | CPU/fixture evidence only here | Unverified | No | GPU, references, provider and model review |

## Dependency and compatibility review

- #20 remains the authentication dependency; no PR is merged by this work.
- #23 already incorporates #24's creation path. Do not merge competing launch pages separately.
- This successor incorporates #21 once; do not duplicate its guidance changes afterward.
- #25's episode board is deferred. #26/#27 remain separate, unchanged drafts. Older strict blueprint readers cannot read their new tag/history fields. Do not aim those previews at a shared database or deploy mixed reader versions. Their eventual integration must move schemas and all consumers together and preserve approved assets/history.
- Security migration `20261004035341` is already applied on the inspected production database. The old unmerged filename `20261004003600` is replaced to match the connector-assigned ledger entry. No historical ledger repair was performed. Inspect other environments before adopting the rename there.

## Controlled launch procedure

1. Reconnect the Vercel app to workspace `jojo31790-9839`. The connector currently returns 403. Reuse the existing project; an empty unscoped list does not establish that no project exists.
2. Establish a distinct preview Supabase project/branch after any required cost confirmation. Never point these previews at production or copy creator records into test databases.
3. Review CI for the exact integrated SHA, including fresh migration replay, pgTAP and browser results. Review authentication and integrated code without merging automatically.
4. Choose one migration deployer. Inspect schema, grants and migration history before enabling it. Use a reviewed plan and protected production environment; no remote reset or blind history repair.
5. Set scoped database URL/key, production/preview reference guards, server-only owner UUIDs, provider key and explicit show/scene models. Inspect names/presence without printing secret values. Remove all CI sentinel values and `OPENAI_BASE_URL` loopback fixture configuration from hosted environments.
6. Verify Node 22, `npm ci`, GitHub-connected previews, and 300-second support for show/scene requests. Five existing minute-based cron routes require a compatible hosting plan or separately reviewed scheduler. Do not disable workers to make a deployment look successful.
7. On preview, verify real login, one bounded real show proposal, explicit save, refresh/reopen, one bounded real scene plan, scene refresh/reopen, sign-out/sign-in, owner diagnostics and another creator's denial. Record actual provider source and URLs. Keep media/GPU jobs out of this pass.
8. Promote only a reviewed compatible app when authorized. Verify the same essential production journey. Replace the README hosting placeholder only with the verified `/studio` URL.

## Recovery

**App rollback:** select the last known working deployment using Vercel's supported rollback controls, then verify authentication, owned-show listing and saved-project reopen. This does not undo migrations, persisted data, provider work, or jobs. The restored app must support the persisted blueprint schema.

**Database recovery:** the RPC security repair changes privileges only, not creator data. Do not restore anonymous worker access as a routine rollback. If a grant breaks intended access, use a reviewed forward repair for the exact role/signature. For data corruption/loss, establish a recovery point and use verified available Supabase backups/PITR. App rollback is not database recovery; do not remotely reset the database.

## Next isolated self-prompt

```text
[SELF-PROMPT]
Inspect the latest operational Studio draft and its exact CI/Cloud Smoke
results. Preserve the applied 20261004035341 permission repair; verify it
without reapplying or rewriting history. Reconnect Vercel to the existing
jojo31790-9839 workspace, identify the real project, and establish isolated
preview configuration only after required cost approval. Verify explicit
show and scene model access with bounded real text requests, then login,
review/save/reopen, saved-scene continuation, owner diagnostics and a second
creator's denial. Record real URLs and evidence. Do not merge automatically,
start media/GPU jobs, approve references/models, or mix strict tag/history
readers from the separate character-direction stack.
```
