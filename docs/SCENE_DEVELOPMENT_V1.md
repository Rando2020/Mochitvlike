# Scene Development v1

## Purpose

Scene Development turns an existing Episode beat into a durable, continuity-aware production plan.

It does not render media and it does not write final dialogue.

```text
SeriesBlueprint
    ↓
bounded SceneContext
    ↓
structured Scene generation
    ↓
validated SceneBlueprint
    ↓
series_scenes.blueprint JSONB
    ↓
Scene Workspace
    ↓
proposed canon changes
    ↓
future script-writing layer
```

## SceneContext

The generator does not receive the entire product state indiscriminately.

`buildSceneContext()` deterministically selects:

- the requested source beat;
- involved cast only;
- relationships among those involved characters;
- the beat's location;
- world rules;
- the active power system when relevant;
- current relevant canon facts;
- open mysteries;
- season direction.

It intentionally excludes unrelated cast detail, Character Sheet runtime prompts, avatar prompts, system prompts, and unrelated private behavior data.

## SceneBlueprint

A SceneBlueprint describes:

- why the scene exists;
- what must change;
- opening emotional/knowledge state;
- cast wants and pressure;
- location;
- entry, escalation, turn, and exit;
- dialogue intent rather than final lines;
- action intent rather than choreography;
- emotional turn;
- ending state;
- proposed canon changes;
- continuity protections.

## Canon safety

`proposedCanonChanges` never mutate `SeriesBlueprint.canon`.

Runtime validation prevents:

- changing immutable canon facts;
- resolving a mystery without explicitly targeting that mystery;
- referencing nonexistent canon;
- silently changing the source beat's required story change.

A later explicit canon-review/commit workflow should decide which proposals become canonical.

## Persistence

`public.series_scenes` stores one active development object per:

```text
(series_id, episode_key, source_beat_id)
```

The uniqueness constraint prevents duplicate durable scene objects.

Normal repeated generation requests first reuse the existing scene. A concurrent uniqueness race reloads the winning row rather than replacing its UUID.

## API

### POST /api/series/[seriesId]/scenes/generate

Accepts only:

```json
{
  "episodeKey": "episodeOne",
  "beatId": "beat_1"
}
```

The authenticated server loads the owned series and constructs context itself.

### GET /api/series/[seriesId]/scenes

Returns scene summaries only.

### GET /api/series/[seriesId]/scenes/[sceneId]

Returns the revalidated scene.

### PATCH /api/series/[seriesId]/scenes/[sceneId]

Supports bounded status changes only.

## Repair semantics

Scene generation receives exactly one structured repair attempt.

There is no fabricated fallback SceneBlueprint. If a plan cannot satisfy continuity after repair, generation fails safely.

## Studio behavior

Unplanned beat:

```text
Develop Scene
```

Planned beat:

```text
Continue Scene
```

A planned scene is not considered rendered or completed.

## Scene Workspace

The workspace presents the story plan in creator language and ends with a disabled:

```text
Write Scene
```

That is the next product dependency.

No raw prompts or JSON are shown.
