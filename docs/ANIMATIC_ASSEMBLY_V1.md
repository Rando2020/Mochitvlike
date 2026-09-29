# Animatic Assembly v1

## Boundary

Storyboard creates concrete still images.

Animatic Assembly creates time, editorial rhythm, and deterministic still-image camera treatment.

Motion Generation is a later layer that may create novel moving imagery.

```text
Storyboard
    ↓
AnimaticTimeline
    ↓
browser/editorial playback
    ↓
optional deterministic preview renderer
    ↓
future Motion Generation
```

The `AnimaticTimeline` is canonical. An MP4/WebM is never the source of truth.

## Inputs

Animatic v1 derives only from durable validated parent state:

- SeriesBlueprint
- SceneBlueprint
- SceneScript
- VisualPlan
- StoryboardBlueprint
- materialized Storyboard panel generation state

It never rewrites any parent object.

## PARTIAL Storyboards

READY Storyboards may compile normally.

PARTIAL Storyboards may compile only when COMPLETED panels still cover every meaningful Script block:

- ACTION
- DIALOGUE
- REACTION

If any meaningful Script content exists only in a failed/incomplete panel, generation returns:

`ANIMATIC_STORYBOARD_INCOMPLETE`

No story moment is silently dropped.

## Timing model

Timing is deterministic.

Sources:

- `SceneScript.estimatedDurationSeconds`
- `VisualBeat.estimatedDurationSeconds`
- dialogue length
- explicit PAUSE blocks
- reaction padding
- action padding

The compiler scales clip durations toward the Script target and validates final duration within ±15%.

It does not use an LLM for timestamps.

## Dialogue duration

Default speech model:

`ANIMATIC_DIALOGUE_WPM=150`

Estimate:

```text
word count / words-per-minute × 60
```

A minimum readable duration is applied.

The environment variable:

`ANIMATIC_DIALOGUE_WPM`

may tune pacing behavior.

Changing it never changes Script text, canon, character state, or Storyboard assets.

Dialogue cue text must equal the SceneScript text exactly.

## Editorial motion

Allowed still-image transforms:

- STATIC
- SLOW_PUSH
- SLOW_PULL
- PAN_LEFT
- PAN_RIGHT
- PAN_UP
- PAN_DOWN

These are CSS/editorial transforms over existing Storyboard assets.

They do not:

- invent new frames
- animate faces
- move limbs
- alter character poses
- alter environments
- interpolate motion

Transitions:

- CUT
- HOLD
- DISSOLVE

## Persistence

Table:

`public.scene_animatics`

Version boundary:

`UNIQUE(storyboard_id, version)`

INITIAL creates v1.

Repeated INITIAL requests return the existing latest Animatic instead of overwriting history.

Statuses:

- DRAFT
- READY
- ARCHIVED

Authenticated clients have SELECT only.

Creation uses a server-only service-role RPC:

`create_scene_animatic(...)`

## RLS

Animatic SELECT requires ownership through:

```text
User
  ↓
Series
  ↓
Scene
  ↓
Script
  ↓
VisualPlan
  ↓
Storyboard
  ↓
Animatic
```

Browser clients cannot directly replace timeline JSON.

## API

### Create / reuse

`POST /api/series/[seriesId]/scenes/[sceneId]/scripts/[scriptId]/visual-plans/[planId]/storyboards/[storyboardId]/animatics/generate`

Body:

```json
{ "mode": "INITIAL" }
```

Flow:

```text
authenticate
  ↓
load owned parent chain
  ↓
materialize Storyboard assets/state
  ↓
verify coverage
  ↓
reuse v1?
  ↓
compile deterministic AnimaticTimeline
  ↓
validate
  ↓
service-role persist
  ↓
return READY Animatic
```

### Read

`GET .../animatics/[animaticId]`

Returns:

- safe Animatic metadata
- AnimaticTimeline
- optional deterministic preview asset metadata

It does not expose provider credentials or unrelated private state.

## Workspace

The Storyboard Workspace now exposes:

`Continue to Animatic`

or:

`Open Animatic`

The Animatic Workspace includes:

- large playback viewport
- Play/Pause
- current time / total time
- scrubber
- ordered timeline clips
- click-to-seek
- optional dialogue overlay
- editorial motion treatments
- pacing metrics
- pacing warnings

The next boundary remains disabled:

`Generate Motion`

## Optional preview renderer

Animatic v1 defines:

`AnimaticPreviewRenderer`

but ships with:

`BrowserPlaybackOnlyRenderer`

The durable Animatic does not depend on FFmpeg, MP4, or WebM generation.

This is intentional for v1:

- browser playback already represents canonical timing;
- deployment environments vary in FFmpeg availability;
- preview-file failures should never invalidate an Animatic.

A later adapter may render MP4/WebM deterministically from the same timeline.

## Validation

Animatic validation checks:

- parent identity/version
- unique clip IDs
- valid completed panel IDs/assets
- monotonic sequence
- valid source VisualBeat IDs
- valid source Script IDs
- ACTION/DIALOGUE/REACTION coverage
- exact dialogue text
- dialogue character IDs
- exact action text
- positive durations
- non-overlapping time ranges
- final duration ±15%
- motionStrength 0–1
- confidence 0–1
- strict schema rejection of undeclared generative-video fields

## Canon safety

Animatic Assembly never mutates:

- SeriesBlueprint
- SceneBlueprint
- SceneScript
- VisualPlan
- StoryboardBlueprint
- Storyboard panel assets
- canon
- proposedCanonChanges

It derives timing/playback metadata only.

## Deployment

Apply:

`supabase/migrations/20260928060000_create_scene_animatics.sql`

No new media-generation credential is required.

Optional:

`ANIMATIC_DIALOGUE_WPM=150`

No FFmpeg dependency is required for browser playback.
