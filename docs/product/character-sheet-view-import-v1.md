# Character sheet view import v1

## Scope and current base

Based on main 536a3e2. #29 is now closed without merging, but its revision-binding
readers are already present on main through subsequent integration. Reuse those
readers and review actions. Do not reopen or merge the old PR stack. Preserve
the operational security repair and historical reference/output contracts.

## Creator journey

1. In Production References choose the character and upload the unchanged full
   sheet with role OTHER. Declare the real source and rights. The character
   upload form now includes the previously missing rights declaration fields.
2. Select the saved source in Import individual views. Set an integer crop
   rectangle and view label/role. The outline helps position the rectangle.
3. Preview crop reads the owned private source, verifies its checksum and
   decodes/crops it on the server. This action does not write an asset.
4. Inspect the loaded crop and explicitly Save view for review. A new PNG record
   inherits source rights/model compatibility and remains UPLOADED or
   REVIEW_REQUIRED according to the existing approval checks. It does not replace
   the source, archive old references, change canon, approve, bind, or queue work.
5. Separately review and approve eligible references using the existing action.
   Use Review identity reference to preview impact and bind an approved FULL_BODY
   or TURNAROUND asset to the current visual revision. PROFILE/EXPRESSION/COSTUME
   views are supporting references and cannot become identity automatically.

## Source history and validation

The existing notes field stores a versioned JSON lineage record for each crop:
source reference ID, version, checksum, dimensions, exact crop rectangle, label,
and visual revision at import. This avoids a database migration and preserves
strict provider/inference schemas. The source bytes and reference row remain
unchanged; no replacement IDs are assigned. Older notes remain readable.

The new authenticated route accepts strict bounded input and verified ownership
before accessing admin storage. The source lookup filters owner, series and ID;
source type/role, character association, state, benchmark flag, canonical owner
storage prefix, metadata and actual checksum are rechecked. No URL or creator ID
is accepted from the browser. Preview and save responses are private, no-store.
Only static images in normalized orientation are accepted. Decode limit is
16,777,216 pixels, input/output file limit is 10 MiB, crop sides are 16–4096 px.

The character revision is checked again when save starts. Import metadata is a
snapshot, not an identity approval or atomic cross-table transaction. A change
after that read can still create an older-revision proposal. Existing binding
review must independently use current canon and recheck all approval/revision
conditions. Do not treat crop lineage as a production-readiness claim.

The UI invalidates previews when source, geometry, label or role changes. It
requires loaded-image inspection and prevents duplicate clicks. An uncertain
save disables further saves until reload and inspection of the reference list.
The endpoint is append-only per explicit request, not globally idempotent across
multiple browser sessions. No automatic save retry or batch crop operation.

## Local Remnant fixture

Run `node scripts/prepare-remnant-fixture.mjs /absolute/path/remnant_casual_2.webp`.
It accepts only the supplied 853×1280 version and writes an unchanged source,
four proposed PNG crops, and a checksum/geometry manifest to ignored
`.local-fixtures/remnant`. Existing files are never overwritten. It has no
network, provider, approval or upload operation. No private artwork is committed.

Prepared views: front FULL_BODY, back FULL_BODY, side PROFILE, neutral-violet
EXPRESSION. They are local unapproved proposals, with rights explicitly
unverified. The back crop includes a thin portion of neighboring clothing;
manual cleanup or a better source layout is needed before production approval.
Alternative cyan/red eyes are deferred, not silently canonicalized.

## Verification and remaining acceptance

Real PNG crop tests verify dimensions and decoded pixels, source immutability,
bounded/malformed inputs, private scoped reads, mismatched hashes, stale visual
revisions, preserved inherited rights and lineage. API tests verify session,
strict input, owned-show denial, archives and sanitized no-store responses. UI
tests verify no mount-time work, separate preview/save, inspection gating,
changed-input invalidation, stale revision and uncertain-response behavior.
Existing binding tests remain the evidence for explicit current-revision binding.

No live Supabase/storage/RLS or hosted signed-in browser validation is claimed.
No payment/image-generation provider, worker, migration or deployment is invoked.
The existing platform schedules/provider configuration are not modified.

Next bounded task: validate source upload, crop preview, save/reload, independent
approval and current-revision binding in an isolated preview with two owners.
Verify cross-owner source denial and historical asset checksums. Do not queue
generation or copy production creator data.

Local checks: 1,231 JavaScript tests across 111 files and TypeScript passed on
Node 24.19.0. The first complete run exposed a stale pre-existing demo selector;
its test now asserts the newer read-only preview board without altering behavior.
Final build and Node 22 CI results are recorded in the draft PR. Fixture source
and four crop checksums were verified locally. No hosted acceptance is claimed.

Preview response safety: PNG crops above 3 MiB return SHEET_PREVIEW_TOO_LARGE before base64 serialization; the UI asks for a smaller rectangle. Saving still preserves the existing reference-file size bounds.
