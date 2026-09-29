# Storyboard Generation v1

## Boundary

Visual Planning decides how the story should be communicated visually.

Storyboard Generation is the first concrete visual realization.

Animatic assembly is a future layer.

```text
VisualPlan
    ↓
deterministic Storyboard compiler
    ↓
StoryboardBlueprint
    ↓
PanelGenerationSpec[]
    ↓
deterministic prompt compiler
    ↓
durable storyboard_panel_generations queue
    ↓
claimed worker execution
    ↓
storyboard panel assets
    ↓
future Animatic
```

Storyboard v1 generates still production-storyboard / animatic-keyframe images only. It does not generate video, animation, voices, audio, lip sync, music, or final episode media.

## Storyboard structure before provider work

The request route compiles the StoryboardBlueprint before any image provider is called.

A panel retains:

- source VisualBeat;
- source Script block IDs;
- sequence index;
- cast;
- location;
- framing intent;
- composition;
- staging;
- emotional focus;
- character appearance requirements;
- environment continuity.

Typical short scenes compile to 3–8 panels. Dense VisualPlans are grouped into at most eight adjacent panel groups while unioning every source Script block ID so writing is not silently dropped.

## PanelGenerationSpec

Image workers receive a bounded derived specification containing:

- Series visual direction;
- panel composition/staging/emotional focus;
- only characters in that panel;
- visualConcept and visualDescription continuity;
- the active location;
- environment requirements;
- protected continuity constraints.

It never contains Character runtime system prompts, private memory, credentials, unrelated cast, or unrelated lore.

## Prompt compilation

`buildStoryboardPanelPrompt()` is deterministic and provider-agnostic.

Its checksum covers:

- prompt compiler version;
- PanelGenerationSpec;
- negative constraints.

The compiler explicitly prevents:

- text/UI/watermarks;
- extra characters;
- costume drift;
- unexplained location drift;
- generic stock anime framing;
- marketing/poster/splash-art composition.

Storyboard panels are directed as high-quality production storyboard / animatic keyframes that prioritize readability, composition, continuity, and storytelling.

No plaintext compiled prompt is persisted.

## Durable queue

`storyboard_panel_generations` is the queue.

A panel row is durable before the public endpoint returns HTTP 202.

The public creation path uses `create_storyboard_with_panel_jobs(...)` so the Storyboard and all panel jobs commit in one PostgreSQL transaction.

Workers claim jobs using:

`claim_next_storyboard_panel_generation()`

with:

- `FOR UPDATE SKIP LOCKED`;
- a claim token;
- attempt ID;
- lease expiration.

Queue redelivery and process crashes reuse the same job. They do not increment the user-visible generation retry count.

A stale `GENERATING` lease may be claimed again with a new claim token. The old worker verifies its token before provider work and cannot commit after takeover.

## Worker

Vercel Cron calls:

`GET /api/internal/storyboard-jobs/process`

once per minute.

The endpoint requires:

`Authorization: Bearer $CRON_SECRET`

and uses the Supabase service role only on the server.

One invocation claims one panel job. Overlapping future workers remain safe because Postgres uses row locks and claim tokens.

During image generation the worker renews its lease every 45 seconds.

If ownership is lost:

- it stops attempting to commit;
- any image uploaded by the stale attempt is deleted.

## Image provider boundary

Storyboard domain code depends on:

`StoryboardImageProvider`

The initial implementation uses OpenAI GPT Image through the existing OpenAI SDK dependency.

Default model:

`gpt-image-2`

Override:

`OPENAI_STORYBOARD_IMAGE_MODEL`

Provider-supported landscape output is 1536×1024. Composition instructions preserve a cinematic widescreen intent inside that landscape canvas.

## Storage

Bucket:

`storyboard-panels`

Attempt-specific path:

```text
users/{creatorId}/storyboards/{storyboardId}/panels/{panelId}/{attemptId}.png
```

Successful panels are immutable objects. Retries create new attempt objects instead of overwriting previous attempts.

If a stale worker uploads before discovering that completion is rejected, that attempt object is removed.

## Storyboard state

Storyboard status derives from durable panel rows:

- GENERATING while work remains;
- READY when every panel completed;
- PARTIAL when completed panels and terminal failed panels coexist;
- FAILED when all panels terminally fail;
- ARCHIVED when explicitly archived later.

The persisted StoryboardBlueprint remains the intended structure. Public reads materialize current panel status/assets from `storyboard_panel_generations` rather than rewriting the blueprint concurrently.

## Retry semantics

FAILED panels may be retried individually up to three explicit retries.

Retry:

- preserves panel ID;
- preserves sequence position;
- preserves StoryboardBlueprint meaning;
- resets only that job to PENDING;
- moves the Storyboard back to GENERATING.

Successful panels are never regenerated by another panel's retry.

Worker crash/stale-lease recovery is queue recovery and does not increment `retry_count`.

## Public API

### Create / reuse

`POST /api/series/[seriesId]/scenes/[sceneId]/scripts/[scriptId]/visual-plans/[planId]/storyboards/generate`

Body:

```json
{ "mode": "INITIAL" }
```

New durable work returns HTTP 202.

An existing READY Storyboard returns HTTP 200.

### Status

`GET /api/series/[seriesId]/scenes/[sceneId]/scripts/[scriptId]/visual-plans/[planId]/storyboards/[storyboardId]`

Returns safe Storyboard and panel state only.

It does not return:

- prompts;
- prompt checksums;
- claim tokens;
- lease state;
- attempt IDs;
- queue credentials;
- provider credentials.

### Retry

`POST .../storyboards/[storyboardId]/panels/[panelId]/retry`

Only FAILED owned panels can be retried.

## Creator experience

The Visual Planning Workspace now exposes:

`Generate Storyboard`

or:

`Continue Storyboard`

The Storyboard Workspace displays:

- overall progress;
- panel order;
- generated image or planning skeleton;
- purpose;
- source moment;
- characters;
- framing;
- composition;
- staging;
- emotional focus;
- safe generation state;
- retry action for failed panels.

The next product seam remains disabled:

`Continue to Animatic`

## Required environment

Existing Supabase variables plus:

- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `OPENAI_STORYBOARD_IMAGE_MODEL` optional
- `CRON_SECRET`

Apply migrations in order:

- `20260928050000_create_storyboards.sql`
- `20260928050100_create_storyboard_atomic_rpc.sql`

## Canon safety

Storyboard generation is derivative production work only.

It never mutates:

- SeriesBlueprint;
- SceneBlueprint;
- SceneScript;
- VisualPlan;
- canon;
- proposedCanonChanges.
