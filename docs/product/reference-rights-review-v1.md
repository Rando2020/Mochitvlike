# Complete reference rights after upload

Creators can upload a character or ability reference with unknown rights, then
choose **Review rights** on that pending reference. The editor keeps unknown,
allowed and denied permissions distinct and requires explicit confirmation before
saving. It never fills in permissions automatically. Source classification is
fixed; the original image, character association, crop lineage, compatibility,
version and prior production outputs are unchanged.

Saving complete valid rights moves an asset to REVIEW_REQUIRED, not APPROVED.
Unknown or denied required rights leave it UPLOADED. The existing separate
**Approve** action remains necessary, as does an independent current-revision
identity binding for eligible character views. No generation starts.

The dedicated owner-authenticated PATCH `/api/series/[seriesId]/production-references/[referenceId]/rights`
accepts only `expectedUpdatedAt` and `provenance`. It rejects archived shows,
non-pending assets, changed source classifications and stale revisions. The update
matches verified owner, show, asset, status and trigger-managed `updated_at`.
Approval and the older general metadata endpoint share status/revision
compare-and-set protection so concurrent review cannot silently approve new rights
or overwrite an approval. No schema, grants, RLS or storage policy changes.

Cancel discards local edits. Changes clear the confirmation checkbox. Uncertain
saves and revision conflicts require reloading references before another edit;
no automatic retry. Editors remount when refreshed asset revisions change.

The existing creator ownership and updated timestamp remain the persistence
record; this is not a new append-only rights attestation ledger. Rights saved on a
source do not silently rewrite existing derived crops: review each saved asset.

Fixture tests cover unknown-rights completion, separate eligibility/approval,
unknown and denied rights, private responses, owner and reference denial, strict
inputs, immutable lineage, stale and competing writes, cancelled edits, repeated
clicks, uncertain saves, reload failures and character switching. Live signed-in
browser, Supabase/RLS and two-owner hosted acceptance remain unverified. No paid
provider, media/GPU job, deployment, production mutation or migration was run.
