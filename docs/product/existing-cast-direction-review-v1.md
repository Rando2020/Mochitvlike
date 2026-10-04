# Existing cast direction: review and save v1

## Scope and branch state

Stacked on draft PR #26 (`feature/character-direction-tags`), not on main. PR #24 is its guided-creation dependency. Episode board #25 and browser-first operations #23 are separate work. This change does not merge them or change deployments.

## Creator flow

Studio → Cast → character details → Edit generation direction → choose tags → Review changes → acknowledge impact → Save direction → return to studio.

The dedicated page works for every persisted cast role, including legacy untagged characters. Demo cast cannot be saved. Archived shows are read-only. Original names, goals, canon, relationships, description, and story remain unchanged. Clearing choices restores guidance to story defaults, not an empty character.

Review shows a current/proposed tag table, existing production inventory, future generation effects, and any visual-reference pause. Editing is disabled during review. Back to edit discards the review receipt, not the selected choices. Conflicts preserve choices and require a new review. An uncertain save keeps the exact reviewed request for a safe retry. Draft choices are component-local, not persisted across reload; saved choices reload from the database.

## Save contract

`POST /api/series/[seriesId]/cast/[characterId]/direction`

- `review`: strict allowlisted direction. Read-only, verified session ownership, full impact inventory or fail closed.
- `save`: direction, expected series revision, impact revision, review ID, and `acknowledgeImpact: true`. Recomputes review from owned persisted data.
- Series revision covers title, state, update time, and full validated blueprint. The final single conditional update matches owner, ID, status and the database-trigger-managed update timestamp. A competing save cannot silently overwrite another editor. The full JSONB blueprint is sent only in the update body, not as an oversized URL query filter.
- Impact revision hashes complete queried records, including job status and saved inputs, not just counts. Changed inventory requires review again. Inventory and save are not a cross-table transaction: workers can progress after the check. Their snapshots remain untouched.
- Only the target cast member's direction and append-only direction history are changed. No production, asset, approval, job, voice-cast, or output table is written. No job is canceled, started, retried, or charged by this editor.
- An identical latest receipt confirms a lost-response retry without another history entry. Superseded requests conflict. Receipts are checksums bound to owner, character, series and proposal, not authentication tokens.
- Up to 50 history entries, retaining prior and next choices. Full history fails closed rather than discarding entries. Stored history is API-managed blueprint metadata, not a database-enforced audit ledger. Direct authorized database edits remain outside this API contract.

## Production preservation and conservative impact

Inventory covers scenes, scripts, visual plans, storyboards, animatics, motion plans, episode assemblies, voice casts, audio plans, sound plans, frames, and linked frame/speech generation jobs. References and performance bibles are scoped to the character. Other counts are series-wide candidates; they do not claim exact dependency matching. More than 200 records in any queried family or any query failure prevents saving until a complete impact review is available. No private storage paths, URLs, full scripts or job instructions are returned to the editor.

Personality guides newly prepared scene/script context. Voice guides newly prepared voice casts and speech instructions, without changing dialogue text, existing voice IDs, or stored audio. Existing plans and queued jobs continue using their saved inputs. They must be explicitly versioned/revised elsewhere to adopt new direction.

Body/clothing edits append a visual-change marker. The production-frame compiler refuses new specs for involved characters with any visual-change history, with `CHARACTER_DIRECTION_REFERENCE_REVIEW_REQUIRED`. Approved references and existing frames remain usable as historical outputs. Uploading or approving an unbound reference does not clear the guard. Reverting tags also does not clear it. Revision-bound reference approval/unblocking is intentionally a follow-up, not a fake review button in this release. Other characters' frames and voice-only edits are unaffected. In-flight jobs are not canceled.

## Verification and release limitations

Persistence and concurrency tests exercise a stateful Supabase query double: reload, competing saves, final-update race, old revision, changed inventory, ownership, lost response, clearing tags, history bounds, and immutable prior production. API tests cover session verification, strict inputs and no-store responses. Component tests cover review-before-save, acknowledgment, conflicts, safe retry and read-only states. Frame compiler tests cover the visual guard and unchanged historical references/specs.

No migration or live database mutation. Atomic query/RLS integration still needs a configured Supabase staging test with two signed-in owners. Browser layout/keyboard smoke and live workers are not validated by mock tests. Deploy all persisted-blueprint readers together: older strict readers reject history metadata. This draft is not production approval.

## Next self-prompt for this chat

Inspect this draft and its dependencies. Add revision-bound reference review that keeps existing approved assets immutable, creates a new approved reference binding for the saved character visual revision, and unblocks only matching future frames. Show the proposed binding and impacted work before saving; require ownership and revision checks; test competing approvals and preserved historical outputs. Open a separate draft PR without merging or deploying.
