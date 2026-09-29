# Episode Assembly v1

## Boundary

Episode Assembly v1 is a silent editorial/compositing layer.

It does not generate new media.

```text
MotionPlan
    ↓
EpisodeTimeline
    ↓
silent browser playback
    ↓
optional deterministic render adapter
    ↓
future Dialogue Audio
    ↓
future Sound / Music
    ↓
future Mastering
```

Motion Generation creates moving visual assets.

Episode Assembly edits those existing assets into the canonical Episode timeline.

Dialogue Audio will later add voices without changing visual timing.

## Source of truth

`EpisodeTimeline` is canonical.

An MP4/WebM is not the source of truth.

Inputs:

- SeriesBlueprint
- SceneBlueprint
- SceneScript
- VisualPlan
- StoryboardBlueprint
- AnimaticTimeline
- READY MotionPlan

No source parent is mutated.

## READY-only boundary

Episode Assembly accepts only MotionPlans whose durable status is:

`READY`

Every Motion clip must resolve as:

- COMPLETED
- SKIPPED

PARTIAL, FAILED, GENERATING, PENDING, or unresolved plans return:

`EPISODE_MOTION_INCOMPLETE`

Assembly never silently edits around a failed motion generation.

## Motion vs still resolution

COMPLETED Motion clip:

```text
MotionPlan.outputAsset
    ↓
MOTION_VIDEO
```

SKIPPED Motion clip:

```text
MotionPlan.inputAsset
    ↓
STILL_HOLD
```

SKIPPED is an intentional creative hold, not a failure.

## Timing and logical trimming

Animatic timing remains authoritative.

Example:

```text
Animatic target     3.2s
provider asset      4.0s

Episode duration    3.2s
sourceOffset        0
source asset        unchanged
```

Episode Assembly does not destructively edit provider assets.

It represents use non-destructively with:

- `sourceOffsetSeconds`
- `durationSeconds`

Browser playback advances from the Episode global clock rather than waiting for the source video to end.

## Multi-scene preparation

The compiler accepts explicit ordered scene bundles.

Each bundle contains:

- scene order
- durable MotionPlan status
- Scene
- Script
- VisualPlan
- Storyboard
- Animatic
- MotionPlan

Scene order must be contiguous and explicit.

Database timestamps are never used to infer story order.

The current product may assemble only one developed Episode 1 Scene, but the schema supports adding more Episode 1 Scenes later without redesign.

## Dialogue

Dialogue is metadata only.

Animatic dialogue cues are copied exactly.

Clip-local Animatic offsets become Episode-global timestamps:

```text
episode cue start =
clip global start
+ animatic cue startOffset
```

Episode Assembly does not:

- synthesize speech
- create audio
- burn subtitles into assets
- rewrite dialogue

The UI may display dialogue as an editor-facing overlay.

## Transitions

Episode Assembly preserves Animatic transition intent:

- CUT
- HOLD
- DISSOLVE

Durations:

- CUT: 0
- HOLD: 0
- DISSOLVE: 0.35s

The dissolve is a visual overlap/fade treatment only.

It does not extend or shorten authoritative Episode timing.

## Persistence

Tables:

- `public.episode_assemblies`
- `public.episode_assembly_scenes`

Assembly statuses:

- DRAFT
- READY
- ARCHIVED

Identity:

`UNIQUE(series_id, episode_key, version)`

INITIAL creates v1.

Repeated INITIAL returns the existing v1.

History is never overwritten.

The normalized scene-link table stores:

- episode assembly
- Scene
- Animatic
- MotionPlan
- explicit scene order

This provides a durable multi-scene ownership/reference boundary while the canonical editorial structure remains in EpisodeTimeline JSON.

## RLS

Authenticated clients have SELECT only.

Episode ownership requires the creator to own the Series.

Scene-link reads additionally verify the referenced MotionPlan:

- belongs to the creator
- belongs to the Episode Series
- belongs to the linked Scene
- belongs to the linked Animatic

Browser clients cannot directly replace timeline JSON.

Creation uses the server-only service role and:

`create_episode_assembly(...)`

The RPC independently requires every referenced MotionPlan to be READY and owned by the creator/Series.

## Generation API

`POST /api/series/[seriesId]/episodes/episodeOne/assemblies/generate`

Body:

```json
{
  "mode": "INITIAL",
  "motionPlanIds": ["uuid"]
}
```

The motionPlanIds array is explicit Episode scene order.

Flow:

```text
authenticate
  ↓
load owned Series
  ↓
reuse existing v1?
  ↓
load every owned MotionPlan
  ↓
verify same Series + READY
  ↓
materialize clip states
  ↓
load Scene / Script / VisualPlan / Storyboard / Animatic
  ↓
compile EpisodeTimeline
  ↓
validate
  ↓
atomic persistence
  ↓
READY Episode Assembly
```

No generation model is invoked.

## Read API

`GET /api/series/[seriesId]/episodes/episodeOne/assemblies/[assemblyId]`

Returns:

- id
- status
- version
- safe EpisodeTimeline
- optional deterministic preview metadata

It does not return:

- provider task state
- prompt checksums
- generation prompts
- queue leases
- claim tokens
- credentials

## Episode Assembly Workspace

The Motion Workspace exposes:

- Assemble Episode
- Open Episode Assembly

The Episode Assembly Workspace includes:

- silent preview
- Play / Pause
- global current time / total time
- global seek scrubber
- generated motion video playback
- still-hold playback
- scene groups
- source labels: Animated clip / Still hold
- dialogue toggle
- Episode target / Assembly duration / difference
- visual coverage
- Script coverage
- assembly warnings

The next CTA:

`Add Voices`

remains disabled.

## Browser playback

A single global Episode clock controls both videos and stills.

For MOTION_VIDEO:

- current source time is synchronized to Episode-local time
- playback changes clips at the Episode duration boundary
- provider media cannot extend the Episode

For STILL_HOLD:

- the source Storyboard image remains visible for the exact Episode duration

Seeking uses Episode-global time.

## Preview renderer

Episode Assembly defines:

`EpisodePreviewRenderer`

v1 uses:

`BrowserEpisodePlaybackRenderer`

and intentionally throws:

`EPISODE_PREVIEW_RENDERER_NOT_CONFIGURED`

No FFmpeg dependency is required.

A future deterministic renderer may:

- physically trim Motion clips
- hold still frames
- concatenate scenes
- render dissolves

It may not generate novel content.

## Validation

Episode validation checks:

- assembly identity/version
- Scene ID uniqueness
- contiguous scene order
- contiguous clip order
- unique Episode clip IDs
- source Scene/Animatic/MotionPlan arrays
- fully resolved MotionPlans
- every Animatic clip represented
- exact Animatic duration
- source offset = 0 in v1
- completed clip → Motion output
- SKIPPED clip → Storyboard still
- source video long enough for used timeline window
- Script traceability
- VisualBeat traceability
- exact dialogue text
- exact dialogue character
- exact global dialogue timing
- monotonic scene/clip timestamps
- Scene duration
- Episode duration
- visual coverage
- Script coverage
- transition intent
- bounded dissolve duration
- protected canon
- protected mysteries
- strict rejection of undeclared audio/prompt/provider fields

## Canon safety

Episode Assembly never mutates:

- SeriesBlueprint
- SceneBlueprint
- SceneScript
- VisualPlan
- StoryboardBlueprint
- Storyboard assets
- AnimaticTimeline
- MotionPlan
- Motion output assets
- canon
- proposedCanonChanges

## Deployment

Apply:

`supabase/migrations/20260929110000_create_episode_assemblies.sql`

No new provider credential is required.

Episode Assembly does not call Runway or any other generative-media provider.
