# Scene Script Writing v1

## Purpose

Scene Development decides what must happen.

Script Writing decides the dramatic words and stageable actions that make it happen.

Neither layer renders media or automatically changes canon.

```text
SceneBlueprint
    ↓
bounded ScriptContext
    ↓
strict SceneScript generation
    ↓
runtime validation
    ↓
scene_scripts version 1
    ↓
Script Workspace
    ↓
future visual planning
```

## ScriptContext

`buildScriptContext()` includes only:

- the validated SceneBlueprint;
- cast members actually present in the scene;
- personality traits;
- Character Sheet seed communication style and personality;
- relationship-to-protagonist context;
- relevant canon facts;
- protected unresolved mysteries;
- Episode duration and a deterministic target duration.

It excludes unrelated cast, avatar prompts, runtime system prompts, unrelated world lore, and credentials.

## Character voice

Character voice is guided by personality and communication style, but those descriptive fields are never copied directly into dialogue or converted into runtime Character system prompts.

Dialogue is generated from dramatic intent, immediate wants, subtext, knowledge boundaries, and pressure.

## Script model

A SceneScript contains:

- versioned identity;
- estimated duration;
- ACTION blocks;
- DIALOGUE blocks;
- REACTION blocks;
- PAUSE blocks;
- required story-change verification;
- continuity verification;
- confidence and assumptions.

It deliberately does not contain camera, shot, lens, lighting, image, video, voice-model, or audio-generation instructions.

## Semantic validation boundary

Deterministic validation enforces what software can know exactly:

- parent IDs and version;
- cast references;
- block uniqueness;
- action-block presence;
- duration bounds;
- required story-change verification;
- zero reported contradictions;
- valid canon/mystery references;
- direct disclosure of exact protected phrases.

Subtler semantic questions, such as whether a paraphrase naturally communicates a required concept, remain model-assisted. The system does not pretend string matching is semantic understanding.

## Versioning

`public.scene_scripts` uses:

```text
UNIQUE(scene_id, version)
```

Initial generation creates v1.

Repeated `mode: INITIAL` requests return the existing latest script instead of overwriting history.

Future v2/v3 generation can be added without changing the persistence model.

## API

### POST /api/series/[seriesId]/scenes/[sceneId]/scripts/generate

Accepts only:

```json
{ "mode": "INITIAL" }
```

### GET /api/series/[seriesId]/scenes/[sceneId]/scripts

Returns lightweight version summaries.

### GET /api/series/[seriesId]/scenes/[sceneId]/scripts/[scriptId]

Returns one owned, validated script.

### PATCH /api/series/[seriesId]/scenes/[sceneId]/scripts/[scriptId]

Supports only DRAFT / APPROVED / ARCHIVED status changes.

## Canon safety

Generating, approving, or archiving a script does not mutate:

- `SeriesBlueprint.canon`;
- `SceneBlueprint.proposedCanonChanges`.

Canon commitment remains a separate future workflow.

## Creator experience

The Scene Workspace now shows:

```text
Write Scene
```

when no script exists and:

```text
Continue Script
```

when a durable script is available.

The Script Workspace renders action and dialogue as readable screenplay-like content. Technical block IDs, JSON, prompt language, model details, and validation internals stay hidden.

`Story Checks` provides a human-readable summary of continuity confidence.

The next disabled product seam is:

```text
Plan Visuals
```

No storyboard, shot, image, audio, or video generation exists in this layer.
