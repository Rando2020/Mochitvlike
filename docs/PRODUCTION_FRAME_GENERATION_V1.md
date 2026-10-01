# Production Frame Generation v1

## Purpose

Production Frame Generation converts a canonical Storyboard panel into a durable rendered-still job without allowing a free-form image prompt to redefine Series canon, character identity, performance language, or recurring abilities.

```text
Storyboard
  ↓
ProductionFrameGenerationSpec
  ↓
durable generation
  ↓
ProductionFrame
  ↓
future Motion
```

Production Frames are still images. They are not Motion clips, Animatics, dialogue, sound, or final Episode renders.

## Model approval boundary

Normal production may only use `VisualFoundationModel` entries whose `productionStatus` is `APPROVED`.

At this version there is no approved visual model.

Therefore normal production returns:

```text
NO_APPROVED_VISUAL_MODEL
```

A non-production environment may opt into one registered candidate using:

```text
VISUAL_DEV_MODEL_ID
```

The override is server-only. It is rejected when `NODE_ENV=production`, persisted as `development_visual=true`, and surfaced to creators as **Development Visual**.

The override never changes the registry and never writes `APPROVED`.

## Provider boundary

Next.js orchestration is provider-neutral.

`ProductionFrameProvider` accepts a canonical `ProductionFrameGenerationSpec`.

The default runtime adapter is a narrow HTTP inference boundary configured through:

- `VISUAL_INFERENCE_URL`
- optional `VISUAL_INFERENCE_TOKEN`

Provider credentials remain server-side and are never persisted.

The inference service receives the bounded spec and compiled prompt. SDXL/FLUX-specific execution belongs behind this boundary rather than in product routes.

## Canonical vs shot-variable direction

The prompt compiler has two explicit sections.

### CANONICAL PRODUCTION CONSTRAINTS

Examples:

- Series visual identity
- character visual identity
- costume continuity
- CharacterPerformanceBible movement principles
- protected canon
- protected mysteries
- ability variant
- ability palette
- ability energy shape
- effect travel direction
- impact/aftermath behavior

### SHOT DIRECTION

Examples:

- framing
- shot size
- camera/composition
- staging
- emotional focus
- background composition
- lighting adjustment within the Series language

Shot direction may vary only within canonical constraints.

When an ability is present, the compiler explicitly forbids substituting generic lightning, a ranged projectile, or an outward explosion for the canonical ability.

## Character conditioning

Each character constraint contains:

- character ID
- name
- visual concept
- visual description
- costume requirements
- continuity requirements
- CharacterPerformanceBible version when available
- approved CHARACTER references

The system never uses a phrase like "same character as before" as identity data.

For a panel with characters, an approved CHARACTER reference is required.

Missing references return:

`MISSING_PRODUCTION_REFERENCE`

## Reference provenance

`production_reference_assets` is a bounded server-managed registry for future Character Studio approval flows.

Production validation rejects:

- unapproved references
- references not creator-approved
- model-incompatible references
- all `benchmark_only=true` references

Benchmark synthetic assets remain evidence only and cannot silently become production conditioning.

Supported reference types:

- CHARACTER
- STYLE
- LOCATION
- POSE
- DEPTH
- LINEART
- ABILITY
- PROP

## Performance conditioning

The compiler can accept explicit canonical per-panel bindings to:

- ActionPattern
- SignatureAction
- CharacterAbility

Bindings are stored separately from prose in `production_frame_performance_bindings`.

The compiler does not scan dialogue or visual descriptions for ability names.

When a binding exists, the latest creator-owned `CharacterPerformanceBible` is validated against the Series before being used.

## Ability conditioning

A bound ability resolves:

```text
CharacterPerformanceBible
+
Episode/canon context
+
CharacterAbility
+
historically correct AbilityVariant
+
AbilityVfxSpec
+
approved ABILITY references
        ↓
ProductionAbilityConstraint
```

A ProductionAbilityConstraint includes:

- character
- ability
- historically correct variant
- activation pose
- relevant choreography beats
- visual palette
- energy shape
- motion language
- VFX motifs
- impact language
- aftermath language
- VFX contract
- camera rules
- reference assets

Storyboard prose cannot replace this contract.

## Burden Draw regression

Tests use the wholly original Orin / Burden Draw fixture.

The compiler preserves:

- physical contact
- wrapped contact hand
- free hand near Orin's sternum
- patient → contact hand → Orin transfer
- compressed organic rings
- wound-crimson / violet / pale-white palette
- inward particle behavior
- contained recoil
- subdermal aftermath

Prompt regression rules explicitly reject:

- ranged projectile drift
- generic lightning substitution
- outward explosion substitution

The same canonical ability contract is tested under:

- front angle
- side angle
- wide shot
- changed lighting
- Mara present

## Data model

### production_frames

One durable frame version per Storyboard panel.

Key fields:

- parent IDs
- panel ID
- version
- status
- selected generation
- development visual marker
- exact model ID/revision

Statuses:

- DRAFT
- GENERATING
- READY
- FAILED
- ARCHIVED

`UNIQUE(storyboard_panel_id, version)` prevents silent version overwrite.

### production_frame_generations

Immutable generation history underneath a Production Frame.

Key fields:

- provider
- model ID/revision
- architecture
- canonical spec snapshot
- spec checksum
- prompt checksum
- seed
- status
- claim token
- attempt ID
- lease
- heartbeat
- retry count
- sanitized error
- output metadata/checksum

Statuses:

- PENDING
- GENERATING
- COMPLETED
- FAILED
- SUPERSEDED

Completed outputs are never overwritten.

## Supporting canonical registries

v1 adds minimal read-only-to-browser storage for:

- `production_reference_assets`
- `character_performance_bibles`
- `production_frame_performance_bindings`

These are infrastructure contracts, not full creator-management UIs.

Service-role workflows will populate them until a future Character/Reference Studio is built.

## Durable job flow

```text
create frame + first generation atomically
        ↓
PENDING
        ↓
claim with FOR UPDATE SKIP LOCKED
        ↓
GENERATING + claim token + attempt ID + lease
        ↓
revalidate spec/model/reference provenance
        ↓
verify spec checksum
        ↓
verify prompt checksum
        ↓
provider generation
        ↓
technical quality gate
        ↓
attempt-specific Storage upload
        ↓
complete under claim token
        ↓
READY
```

The worker heartbeats its lease while generation runs.

A stale claim cannot commit.

If a stale worker uploaded bytes, its attempt-specific object is removed.

Retry is bounded to three attempts.

## Storage

Bucket:

`production-frames`

Path:

```text
users/{creatorId}/series/{seriesId}/storyboards/{storyboardId}/frames/{productionFrameId}/{generationId}/{attemptId}.png
```

No creator-provided filename is used.

## Quality validation

v1 technical validation proves only:

- non-empty bytes
- PNG MIME
- PNG signature / basic decodability contract
- expected width and height
- output SHA-256
- approved reference provenance

The worker separately validates:

- source parent IDs
- model ID/revision
- model approval/dev status
- spec checksum
- prompt checksum
- ability variant encoded by the canonical spec

v1 does **not** claim technical validation proves:

- anatomy quality
- character likeness quality
- artistic quality
- ability recognizability
- frame-to-frame consistency

Those require human review and/or future pinned perceptual metrics from the Visual Model Bake-Off system.

## APIs

### Generate

```text
POST
/api/series/{seriesId}/scenes/{sceneId}/scripts/{scriptId}/visual-plans/{planId}/storyboards/{storyboardId}/panels/{panelId}/production-frame/generate
```

Body:

```json
{"mode":"INITIAL"}
```

Existing v1 is reused.

New jobs return HTTP 202.

### Status

```text
GET
.../production-frame/{frameId}
```

Returns safe creator-facing state only.

Never returns:

- claim token
- lease
- provider credential
- private filesystem path
- raw prompt

### Retry

```text
POST
.../production-frame/{frameId}/retry
```

Only a failed generation may be retried.

## Storyboard Workspace

A completed Storyboard panel can now show:

- Generate Production Frame
- Generating…
- Production Frame Ready
- Retry Production Frame

When a Production Frame is ready, it becomes the displayed still while the original Storyboard source remains accessible in panel details.

If the development model override was used, the card shows:

**Development Visual**

The UI does not expose:

- JSON
- prompt
- LoRA
- IP-Adapter
- ControlNet
- claim/lease internals

## Current operational limitation

Production Frame Generation v1 does not require a real GPU provider to merge.

The existing Visual Model Bake-Off GPU path is still blocked until GPU billing/inference infrastructure is enabled.

This architecture intentionally keeps provider/model execution replaceable so a future approved model can be attached without redesigning the creator workflow.
