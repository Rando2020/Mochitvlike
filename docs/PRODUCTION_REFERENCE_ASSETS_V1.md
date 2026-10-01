# Production Reference Assets v1

## Purpose

Production Reference Asset Approval v1 turns creator-controlled visual assets into canonical production references that Production Frame Generation may consume safely.

The workflow is:

```text
Upload
  ↓
technical image validation
  ↓
provenance + rights declaration
  ↓
canonical association
  ↓
REVIEW_REQUIRED
  ↓
creator approval
  ↓
APPROVED production reference
```

An image being present in storage is never enough to make it production-ready.

## Lifecycle

References use explicit lifecycle states:

- `UPLOADED`
- `REVIEW_REQUIRED`
- `APPROVED`
- `REJECTED`
- `ARCHIVED`

Compatibility booleans remain for Production Frame v1, but an approved reference must satisfy all of:

```text
status = APPROVED
approved = true
creator_approved = true
benchmark_only = false
```

Only APPROVED references are loaded into Production Frame Generation.

## Provenance and permissions

Supported source types:

- OWNED
- COMMISSIONED
- LICENSED
- OPT_IN
- PUBLIC_DOMAIN
- SYNTHETIC

Each reference records:

- creator or rights-holder record
- license or rights record
- optional source URL/record
- production-use permission
- commercial-use permission
- model-conditioning permission
- redistribution permission
- notes
- whether a synthetic asset was created specifically for the Series

Approval requires positive production-use, commercial-use, and model-conditioning permission.

Unknown rights do not pass.

Redistribution permission may be false because Production Frame conditioning does not require redistributing the source asset.

Synthetic assets require `projectSpecific=true`.

Benchmark-only assets can never be approved.

## Private immutable storage

Bucket:

`production-references`

The bucket is private and limited to PNG, JPEG, and WEBP files up to 10 MiB.

Canonical storage path:

```text
users/{creatorId}/series/{seriesId}/references/{referenceId}/{sha256}.{extension}
```

Creator filenames are not used in canonical paths.

Upload validation checks:

- supported MIME
- bounded byte size
- image signature
- decodable header/dimensions
- positive width and height
- SHA-256

Approved asset bytes, checksum, canonical association, and provenance cannot be mutated.

A changed image creates a new reference ID/version.

## Character references

Character reference roles:

- PRIMARY_IDENTITY
- PROFILE
- FULL_BODY
- COSTUME
- EXPRESSION
- TURNAROUND
- OTHER

A character is Production Frame ready when it has one approved PRIMARY_IDENTITY reference.

Only one approved PRIMARY_IDENTITY may be active for a Series character at a time.

The Reference Studio shows:

- thumbnail
- role
- source
- lifecycle state
- dimensions
- character association
- production readiness

## Ability references

ABILITY references bind to:

- character ID
- ability ID
- AbilityReferenceSheetContract slot

Supported slots:

- ACTIVATION_POSE
- WINDUP
- RELEASE
- IMPACT
- AFTERMATH
- VFX_ISOLATION
- PALETTE
- SHAPE_LANGUAGE
- MOTION_ARROWS

The uploaded image never edits the CharacterAbility semantic contract.

Ability production readiness is derived from approved references satisfying every required slot in the existing AbilityReferenceSheetContract.

Only one approved reference may occupy a specific ability slot at a time.

## Burden Draw bootstrap

The reference workflow supports the first canonical bootstrap for Orin / Burden Draw:

- Orin PRIMARY_IDENTITY
- Mara PRIMARY_IDENTITY
- Burden Draw ACTIVATION_POSE
- Burden Draw VFX_ISOLATION
- Burden Draw PALETTE
- Burden Draw SHAPE_LANGUAGE

Those four ability references materially improve conditioning, but Burden Draw remains `MISSING_ABILITY_REFERENCE` until all nine required AbilityReferenceSheetContract slots are approved.

This prevents the creator UI from claiming READY earlier than the canonical ability contract permits.

## Model compatibility

`modelCompatibility=[]` means the reference is model-neutral.

A reference may optionally restrict itself to model IDs where its representation genuinely requires that.

Reference approval does not depend on an APPROVED visual model existing.

## Production Frame integration

Production Frame Generation now loads only records that pass the explicit approval/provenance boundary.

Character conditioning requires an approved PRIMARY_IDENTITY reference.

For a bound ability, Production Frame Generation requires every required ability reference-sheet slot.

The persisted ProductionFrameGenerationSpec retains:

- reference ID
- checksum
- private storage path
- lifecycle/provenance metadata

The private storage URL itself is refreshed at worker execution time.

Immediately before provider inference, the worker creates short-lived signed URLs for approved private references.

This means:

- canonical history does not depend on an expiring URL
- private references do not require a public bucket
- retry jobs can obtain fresh URLs
- ID + checksum remain the reproducibility boundary

## Security

All reference APIs authenticate the current user and resolve:

```text
user → Series → reference
```

Client-provided owner IDs are never trusted.

Associations are validated against:

- Series cast
- latest validated CharacterPerformanceBible
- ability ownership
- ability reference-sheet slots
- Series locations
- explicit prop scope

Authenticated browser clients retain owner-scoped SELECT only for the database table.

Writes are performed through authenticated server routes after validation.

Service-role credentials are never returned.

Private storage SELECT is owner-scoped by canonical user path.

## APIs

### List

```text
GET /api/series/{seriesId}/production-references
```

Returns safe metadata and short-lived signed thumbnail URLs.

### Upload

```text
POST /api/series/{seriesId}/production-references
Content-Type: multipart/form-data
```

Fields:

- `file`
- `metadata` JSON

The server validates Series ownership, image bytes, provenance schema, and canonical associations before persistence.

### Detail

```text
GET /api/series/{seriesId}/production-references/{referenceId}
```

Returns safe metadata and a signed asset URL. It does not expose the private storage path.

### Approve

```text
POST .../{referenceId}/approve
```

Approval revalidates rights, technical metadata, associations, and benchmark status.

### Reject

```text
POST .../{referenceId}/reject
```

### Archive

```text
POST .../{referenceId}/archive
```

Archiving preserves history and releases active uniqueness constraints.

## Reference Studio

Creator route:

```text
/series/{seriesId}/references
```

The studio groups references around Series characters.

For each character it shows production readiness and supports uploading identity references.

When a persisted CharacterPerformanceBible exists, the studio shows each ability plus all nine canonical reference slots as Missing, Pending, or Approved.

The UI intentionally hides:

- raw database fields
- storage paths
- service credentials
- conditioning implementation details

## Storyboard integration

When Production Frame Generation returns `MISSING_PRODUCTION_REFERENCE`, Storyboard Workspace now explains that the relevant character/shot needs approved references and links directly to the Reference Studio.

Storyboard images are never silently promoted into production identity references.

## Current limitations

v1 does not generate reference art.

v1 does not train LoRAs.

v1 does not automatically approve images.

v1 does not ingest copyrighted anime examples.

v1 does not resolve GPU infrastructure.

The first real Production Frame still requires an operational Visual Inference Service and a deliberately selected visual model.

## Final invariant

Production Frame Generation may condition on a visual reference only when Mochitvlike can prove:

- which Series owns it
- what canonical entity it represents
- where it came from
- which production rights were declared
- that the creator approved it
- that the exact bytes are identified by checksum

Benchmark-only assets remain evaluation evidence and cannot silently become canonical production references.
