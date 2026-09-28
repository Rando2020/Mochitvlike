# Visual Planning v1

## Purpose

Script Writing determines the dramatic words and actions.

Visual Planning determines how those words and actions should be communicated visually.

Storyboard Generation can later turn this plan into concrete panels or images. This layer renders no media.

```text
SceneScript
  ↓
bounded VisualPlanningContext
  ↓
strict VisualPlan
  ↓
scene_visual_plans version 1
  ↓
Visual Planning Workspace
  ↓
future Storyboard generation
```

## Visual beat boundary

A visual beat is one coherent visual storytelling unit, not a generated shot.

One beat may later become one shot, several shots, multiple storyboard panels, or a keyframe group. v1 intentionally avoids prematurely locking planning to provider/render mechanics.

## Bounded context

The engine receives the validated SceneBlueprint and SceneScript plus only the visual context it needs:

- relevant cast;
- visualConcept and visualDescription;
- Series Creative DNA visual style, color, lighting, animation, and camera language;
- Scene location and visual tags;
- world/power rules;
- emotional/action intent;
- protected mysteries.

Runtime Character prompts, avatar prompts, provider credentials, unrelated cast, unrelated locations, and unrelated lore are excluded.

## Traceability

Every VisualPlan.visualBeat contains sourceScriptBlockIds.

Every ACTION, DIALOGUE, and REACTION block must be represented. PAUSE blocks may be grouped into surrounding visual beats where dramatically meaningful.

Dialogue and Script blocks are read-only. Visual planning cannot rewrite the script.

## Duration

The summed visual-beat duration must remain within 20% of SceneScript.estimatedDurationSeconds.

This is a planning constraint, not frame-accurate timing.

## Persistence

`public.scene_visual_plans` stores versioned plans with:

```text
UNIQUE(script_id, version)
```

INITIAL creates v1. Repeated INITIAL requests reuse the existing plan. History is never overwritten.

## Canon and continuity

Visual planning is derivative only. It does not mutate:

- SeriesBlueprint;
- SceneBlueprint;
- SceneScript;
- Series canon;
- proposedCanonChanges.

The plan carries protected canon and mystery references forward for downstream storyboard safety.

## Creator experience

The Script Workspace now exposes:

```text
Plan Visuals
```

or:

```text
Continue Visual Plan
```

The Visual Planning Workspace presents:

- visual thesis;
- Creative DNA;
- staging and character positions;
- visual beats;
- composition and emotional intent;
- motion and transition intent;
- human-readable Script source lines;
- continuity notes;
- approximate duration.

The next product seam is intentionally disabled:

```text
Generate Storyboard
```

No images, keyframes, video, animation, or render prompts are generated in v1.
