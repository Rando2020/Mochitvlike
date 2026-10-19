# Story Architect: Persistent Story Seeds v1

Branch: feature/story-architect-persistence-v1, stacked on draft PR #30, not main.

## Scope
The authenticated /series/[seriesId]/creator-preview Story tab is a real, owner-scoped story planning editor. It has guided/advanced modes, character/placement/event selection, setup/consequence/payoff, locking, explicit save, reload and revision-conflict recovery. The public /creator-preview route remains a session-only UX prototype. Other creator sections are concepts.

## Security and state
- Migration: 20261018090000_story_seed_plans_v1.sql. New table, no change to existing SeriesBlueprint, canon, scenes, plans, frames, jobs or reference assets.
- RLS only permits authenticated owner reads. No direct authenticated INSERT/UPDATE/DELETE grants.
- An authenticated SECDEF save_story_seed_plan_v1 RPC validates series ownership, non-archived status, required seed fields, character association, payload count, unique seed IDs, and locks the parent series during atomic save.
- Revision compare-and-swap guards competing writers, with the last request ID supporting identical lost-response retry.
- Previously locked seed modification or deletion needs explicit user acknowledgement. Acknowledge never automatically rewrites historical canon or media.
- User changes remain local draft state until PUT succeeds. Failure preserves the draft.
- The API never takes client-supplied owner IDs and returns sanitized errors and no-store responses.
- Storage migration is intentionally NOT applied to a live/production database in this PR.
- No generated media, AI chat inference, licensing changes, paid jobs, wallet debits or sharing permissions.

## Acceptance before merge / deploy
1. CI: typecheck, JS/Python tests, build.
2. Disposable DB test: anonymous RPC denied, second owner cannot select/execute, archived denial, stale revisions conflict, exact retry idempotence, changed request ID conflict, locked-change acknowledgement, preservation of all old assets.
3. Authenticated browser: save/reload after sign-out/sign-in, guided vs advanced, character association, locked edits, conflict recovery, iPhone responsive and accessible.
4. Integrate PR #28 security repair and #29 schema readers before any hosted deployment; do not independently deploy this stacked PR.
5. Actual Vercel access/preview configuration remains a separate workstream.

## Future increments
- Director's Room bounded AI context, knowledge-scoped Character Rehearsal and public fan chat.
- Chibi forms as separately approved performance variants, never identity replacements.
- Opt-in, rights-scoped Character Exchange.
- Reward and compute credit ledger with cost quotes and fraudulent-traffic controls.

## Next self-prompt
Recheck main and open PRs. Deploy this branch to a separate isolated preview only after PR #28/#29 reconciliation and any cost approvals. Apply only its migration to disposable DB; verify 2-owner security and signed-in browser save/reload/conflict. Preserve previous production. If green, progress from saved seeds to episode impact preview without mutating canon automatically.
