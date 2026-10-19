# Revision-bound character identity reference review v1

## Scope

Stacked on draft PR #27 (`feature/existing-cast-direction-review`). Adds a separate identity binding to the persisted cast member, not a replacement asset approval. No merge, deployment, migration, media generation, GPU invocation, storage upload or production database mutation.

PR #28's operational/security work is on a separate branch. This branch does not overwrite it, alter bucket access, or change grants. A combined release must preserve that security work and validate the deployed strict-schema readers together.

## Creator flow

Studio → Cast → Review identity reference → select approved primary/full-body/turnaround → Preview binding and impact → inspect loaded private image and current tags → confirm identity/body/clothing match → Approve identity binding → return to studio.

The tag editor also links to this flow after a visual edit. No-reference and archived-show states cannot approve. The source reference must already have a complete, valid rights approval. If the image no longer matches, do not confirm. Use Reference Studio to prepare a new full-body or turnaround asset and approve its rights first; this permits a new identity binding without archiving the old primary. This release does not change the existing single-active-primary index or approve unreviewed assets.

An eligible full-body/turnaround reference can act as identity conditioning only for newly compiled frames under the explicit saved binding. Its original source role and approval remain untouched. This is human visual attestation, not automatic image/tag matching.

## Persisted binding contract

Optional cast member `referenceBindingHistory`, maximum 50 entries, append-only through this API. Each entry records review ID, visual revision, reference ID, image checksum, reference version, original source role, verified creator ID and approval time. Previous entries are never truncated. This is API-managed blueprint metadata, not a database-enforced audit ledger.

Visual revision hashes the cast member ID, canonical visual concept/description, body and clothing tags, and latest visual-direction edit receipt. Personality/voice edits retain the binding. A body/clothing edit, including reversion to older tags, or a changed canonical appearance requires fresh approval. Only the latest saved binding can be current; superseded receipts cannot restore an older choice.

`POST /api/series/[seriesId]/cast/[characterId]/reference-binding`

| Action | Inputs | Result |
| --- | --- | --- |
| review | action, referenceId | Owned eligible reference, current/proposed binding IDs, tags, visual revision, exact version/checksum, signed image preview, production inventory, review receipt |
| approve | action, referenceId, expectedRevision, visualRevision, impactRevision, reviewId, acknowledgeIdentity: true | Append binding only after fresh ownership, direction, asset and impact checks |

No creator ID, approval history, storage path or asset URL is accepted from the client. Authentication uses `getUser`. Both actions load the owned series and exact owned reference association. Archived shows, invalid roles, benchmark assets, incomplete rights, missing image metadata, changed approval/version/checksum, incomplete impact reads and stale review receipts fail closed.

Series revision covers full validated blueprint and database update timestamp. A single conditional update matches series ID, verified owner, status and trigger-managed `updated_at`. Competing tag saves and binding approvals share the same row concurrency boundary. A lost-response retry confirms only the latest matching receipt, and rereads reference validity without adding duplicate history.

## Preservation and generation boundary

Only `series.blueprint.cast[target].referenceBindingHistory` is written. Reference rows, images, original approvals, direction history, other cast, plans, frames, historical specs, queued inputs and outputs stay unchanged. No job is started or charged. An existing frame returned by the INITIAL endpoint stays the historical frame, not an automatic rerender.

Production impact uses #27's bounded complete inventory: conservative series-wide candidate counts, character-scoped references/bibles, and linked frame/speech jobs. Counts do not claim an exact character dependency graph. More than 200 records in any queried family or incomplete results prevent review. Changed records/statuses, not just counts, invalidate the proposal. Existing visual plans can still contain older appearance notes; explicitly revise such plans before preparing frames for the new design.

The frame compiler resolves the exact current binding, verifies current reference ID, version, checksum, character association, original role, approval status, rights and model compatibility, then selects only that identity asset. Missing/stale bindings or revoked/changed assets block new specs. Other characters retain legacy approved-reference selection. Canonical frame constraints record the binding receipt, visual revision, source role and reference version for traceability.

Version metadata is used only during persistence/selection and stripped from provider specs. No inference/Python request schema changes are needed. Historical specs retain their old inputs/checksums. Existing queued workers are not canceled and continue with their saved snapshot, as before this change.

## Privacy and concurrency limitations

Private image preview uses an owner-authorized, 10-minute signed URL, `private, no-store` API responses, an unoptimized image to avoid optimizer caching, and no-referrer policy. No storage path or full production payload is returned. A failed/expired image cannot initiate a fresh approval; exact confirmation retries remain available after an uncertain response.

Reference inventory and series save are not a cross-table transaction. A reference may be archived after review or immediately after save; compilation rechecks validity and then blocks. Approval does not promise perpetual readiness. Existing in-flight snapshots are deliberately preserved. A future transactional enqueue guard would tighten the gap between compilation and job insertion without rewriting historical jobs.

No live Supabase/RLS, signed-in browser, or live worker validation is claimed by unit tests. Stage these checks with two owners before release. Old strict blueprint readers reject new binding metadata; deploy compatible readers together.

## Verification

Stateful persistence tests cover review without writes, save/reload, ownership and associations, invalid approvals/rights/roles, changed asset versions/status, production snapshot changes, simultaneous approvals, final CAS races, superseded retries, lost responses, reference revocation after uncertain saves, tag-edit invalidation and preserved approved assets/output snapshots. API tests cover verified sessions, strict inputs and no-store. UI tests cover loaded-image gating, explicit acknowledgment, conflict recovery, exact retry, expired preview, empty and archived states. Compiler tests cover exact bound selection, stale revisions, altered reference data, rights/model guards, immutable old specs and unchanged provider schema.

## Next self-prompt for this chat

Inspect this draft and #27 without merging. Establish a safe staged validation plan with two owners and existing approved reference fixtures. Verify signed preview expiry, save/reload, competing binding approvals, tag-edit invalidation and blocked cross-owner access. Validate frame-spec preparation only, without paid media/GPU jobs. Preserve operational/security repairs and all historical outputs; open a bounded draft PR for any confirmed blockers. Ask before any new credentials, billable resources or production mutations are needed.
