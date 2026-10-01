# Character Performance Bible + Signature Ability System

## Product concept

Character identity in serialized animation is not only a face, costume, or voice.

A recurring character should remain recognizable through:

- posture,
- idle behavior,
- walking/running language,
- emotional movement,
- combat stance,
- attack/defense/dodge vocabulary,
- non-combat rituals,
- signature actions,
- special abilities,
- recurring VFX,
- recurring sound identity,
- progression that respects canon.

This layer is a semantic production bible.

It does not render images, motion, VFX, or sound.

The system exists so downstream generators receive canonical character-performance constraints rather than reinterpreting recurring movement or abilities from free-form prompts every time.

Pipeline:

```text
SeriesBlueprint
    ↓
CharacterPerformanceBible
    ├── MovementIdentity
    ├── ActionGuide
    └── AbilityKit
          ↓
Scene / Script
          ↓
VisualPlan / Storyboard
          ↓
future ShotSpecification
          ↓
Production Frame
          ↓
Motion
          ↓
VFX + Sound
```

## CharacterPerformanceBible

A Bible is versioned per character.

It contains:

```text
characterId
version

MovementIdentity
ActionGuide
AbilityKit
```

It is stored separately from the SeriesBlueprint so:

- the Show Genesis schema stays bounded,
- performance detail can evolve independently,
- later versions do not rewrite the original character definition,
- mundane characters do not need an AbilityKit.

The Bible validates against the SeriesBlueprint for:

- character ownership,
- canon unlock references,
- known-by character references,
- power-system bindings.

## Movement Identity

Movement Identity establishes the character's physical acting language.

It includes:

- overall posture,
- idle pattern,
- walk pattern,
- run pattern,
- emotional movement variants,
- physical principles,
- forbidden drift.

A MovementPattern contains:

```text
name
bodyLanguage
centerOfGravity
tempo
silhouettePrinciples
referenceAssetIds
```

This is semantic animation direction, not rig or skeleton data.

Example for Orin:

```text
economy over flourish
hands stay useful/protected
emotional stress contracts his movement
emergency movement is direct rather than athletic
```

Future motion systems should treat these as recurring character constraints.

## Action Guide

The Action Guide describes reusable physical vocabulary.

Categories:

- combat stance,
- attack vocabulary,
- defense vocabulary,
- dodge vocabulary,
- weapon handling,
- interaction patterns,
- signature actions.

An ActionPattern contains:

```text
start pose
semantic ActionBeat[]
recovery pose
camera guidance
movement principles
mustPreserve
mustNotDo
reference assets
```

This lets two visually similar characters still move differently.

## Signature actions

Signature actions do not require supernatural abilities.

Supported categories:

- RITUAL
- SOCIAL
- PERFORMANCE
- SPORTS
- COMBAT
- OTHER

The demo fixture includes Orin's:

`Three-Knot Field Wrap`

It is a mundane treatment ritual that remains recognizable through:

1. flat anchor turn,
2. diagonal pressure cross,
3. compact third knot,
4. one tension-check tap.

This proves Character Performance remains useful for drama, romance, sports, mystery, music, comedy, and other non-power genres.

Potential future examples:

- a detective's notebook ritual,
- a character-specific greeting,
- a volleyball serve,
- a musician's stage posture,
- an avoidance gesture,
- a recurring comedy reaction.

## ActionPose

ActionPose is semantic, not skeletal.

It includes:

- stance,
- facing,
- weight distribution,
- hand positions,
- silhouette,
- optional poseReferenceId.

Future Production Frame systems may compile it into:

- ControlNet pose guidance,
- keyframe guidance,
- pose-reference selection.

This version does not generate those assets.

## ActionBeat

ActionBeat is the smallest canonical semantic choreography unit.

Phases:

- PREPARATION
- WINDUP
- ACTION
- CONTACT
- IMPACT
- RECOVERY

It describes:

```text
body-region intent
hands
movement vector
intensity
duration hint
required visual elements
```

ActionBeat IDs are deterministic.

The model intentionally stops before skeletal animation.

## Ability Kit

A CharacterAbility contains:

```text
identity
concept
activation
choreography
visual signature
VFX contract
camera language
audio signature
rules
power-system binding
continuity
reference assets
reference sheet
variants
```

Classification:

- CORE
- SIGNATURE
- UTILITY
- DEFENSIVE
- ULTIMATE

Nature:

- POWER_SYSTEM
- MUNDANE

A POWER_SYSTEM ability must bind back to the existing SeriesBlueprint power system.

A MUNDANE ability/action may exist in a series without a supernatural power system.

## Original fixture: Burden Draw

The demo ability is Orin's original signature technique:

`Burden Draw`

It comes from the existing Wounds We Keep power system, Burden Healing.

Its canonical invariants include:

- an existing injury must already be present,
- physical contact is required,
- energy moves inward from the injury toward Orin,
- the technique is never a ranged projectile,
- the patient improves as Orin receives the cost,
- Orin's recoil is contained and inward,
- an organic subdermal trace appears beneath his wrapping.

This means later rendering cannot reinterpret the technique as a generic outward energy blast without violating the Bible.

## Power-system integration

The current SeriesBlueprint power system stores:

- rules,
- costs,
- limitations

as canonical arrays.

The Character Performance system does not copy those strings into a second world model.

Instead it derives deterministic references from the existing Series power-system entries.

A POWER_SYSTEM ability stores those reference IDs.

Validation rejects:

- references to nonexistent power rules,
- mismatched system names,
- power abilities in a Series whose power system does not exist.

Ability-specific rules can add narrower constraints, but they should reinforce rather than replace world rules.

## Ability choreography

Ability choreography is split into:

```text
windup
activation
release
impact
recovery
```

Each phase contains ActionBeat records.

This lets future rendering preserve the recognizable sequence while still allowing different:

- camera positions,
- shot sizes,
- environments,
- lighting,
- surrounding characters.

The move's identity is choreography plus visual signature, not one frozen shot.

## Ability variants and progression

Abilities can evolve without rewriting history.

AbilityVariant contains:

```text
id
abilityId
name
version
status
canonicalFrom
changes
replacesVariantId
```

A variant may become canonical from:

- a specific Episode number,
- a specific canon fact.

Archived variants remain resolvable.

The demo lifecycle:

```text
Burden Draw: Field Method
version 1
ARCHIVED
canonical from Episode 1

        ↓

Burden Draw: Controlled Transfer
version 2
ACTIVE
canonical from Episode 6
```

At Episode 2 the resolver returns v1.

At Episode 8 the resolver returns v2.

The declared current variant does not silently replace the variant used by an earlier Episode.

## Canon-aware availability

Abilities can also have a canon unlock.

The demo Burden Draw ability is gated by:

`fact_transfer`

Helpers:

```text
getAvailableAbilities(...)
getCanonicalAbilityVariant(...)
```

take a CanonPerformanceContext:

```text
episodeNumber
activeCanonFactIds
```

They never invent unlocks.

Before the canon unlock is active, the ability is unavailable.

## Visual signature

A CharacterAbility has a persistent visual signature:

- silhouette,
- palette,
- energy shape,
- motion language,
- VFX motifs,
- particle language,
- impact language,
- aftermath language.

These are stronger constraints than a free-form generation prompt.

Example Burden Draw identity:

```text
compressed organic rings
inward-moving flecks
wound-crimson / violet / pale-white palette
contained recoil
brief subdermal aftermath
```

## AbilityVfxSpec

AbilityVfxSpec defines a provider-neutral future VFX contract:

```text
energyShape
palette
emissionAnchors
particleMotifs
distortion
travelBehavior
impactBehavior
aftermathBehavior
```

No VFX is rendered in this feature.

The contract exists so future VFX and Production Frame systems share the same canonical vocabulary.

## Ability reference sheet

Every ability defines a deterministic reference-sheet contract for:

- activation pose,
- windup,
- release,
- impact,
- aftermath,
- VFX isolation,
- palette,
- shape language,
- motion arrows.

Each slot has:

```text
deterministic assetKey
required flag
description
future assetId
```

No reference images are generated in this task.

Later, these assets can become conditioning inputs for Production Frame Generation.

## Camera language

A recurring move must be recognizable without forcing the exact same cinematography.

Ability camera language contains:

- preferred shots,
- preferred angles,
- hero moment,
- shots/angles to avoid.

For Burden Draw, one invariant is preserving the contact-hand geography.

A director may still choose a profile, high three-quarter, close-up, or wide shot as long as the ability's defining information remains readable.

## Audio signature

AbilityAudioSignature defines semantic sound identity:

```text
activationCue
releaseCue
impactCue
recurringMotif
```

The demo uses a recurring distorted heartbeat language consistent with the existing Series sound DNA.

This feature does not synthesize sound.

A future SoundDesignPlan compiler may use these fields to create stable recurring audio cues.

## Production Frame integration

Future Production Frame Generation should receive:

```text
Character reference
+
CharacterPerformanceBible
+
relevant ActionPattern / SignatureAction
+
CharacterAbility
+
historically correct AbilityVariant
+
Ability reference assets
+
Series visual style
+
Storyboard
+
ShotSpecification
    ↓
Production Frame
```

The helper:

`buildProductionFramePerformanceContext(...)`

already produces the bounded performance-specific portion of that future request.

Free-form prompts should not be allowed to redefine:

- ability palette,
- effect travel direction,
- contact requirements,
- canonical hand placement,
- signature shape language.

## Motion integration

The helper:

`buildMotionChoreographyContext(...)`

translates an action, signature action, or ability into:

- start pose,
- ActionBeat sequence,
- recovery pose where applicable,
- reusable pose-reference IDs,
- movement vectors,
- VFX anchor hints.

Future flow:

```text
ActionBeat[]
    ↓
semantic key poses
    ↓
trajectory guidance
    ↓
MotionPlan
```

A repeated move may therefore reuse choreography without repeating the same camera shot.

## Sound integration

The helper:

`buildAbilitySoundIntegration(...)`

returns the historically correct ability variant plus:

- activation cue,
- release cue,
- impact cue,
- recurring motif.

This is intentionally semantic.

Sound Design remains responsible for generating/resolving actual audio assets.

## Character Performance Studio UX

Future creator-facing Character Studio:

```text
Character
├── Overview
├── Appearance
├── Personality
├── Performance
└── Abilities
```

Performance:

```text
Movement Identity
Action Guide
Signature Actions
```

Abilities:

Each card should show:

- name,
- classification,
- one-line concept,
- current historical variant,
- visual palette,
- unlock status.

Ability detail:

```text
Concept
Activation
Choreography
Visual Signature
Camera Language
Audio Signature
Rules
Variants
Reference Assets
```

Creators should never edit raw JSON.

The current code provides a Character Performance Studio view-model contract but does not build the complete UI.

## Ability consistency benchmark

The visual evaluation category union now recognizes:

`ABILITY_CONSISTENCY`

The Character Performance system provides six deterministic future scenarios:

1. same ability, front angle,
2. same ability, side angle,
3. same ability, wide shot,
4. same ability, changed lighting,
5. same ability with another character,
6. same ability in a different Episode.

Each scenario carries:

- character ID,
- ability ID,
- historical variant ID,
- deterministic seed,
- canonical properties that must remain stable,
- properties allowed to vary,
- deterministic reference-asset keys.

The benchmark is not executed in this feature.

A future visual-model runner should measure whether the same ability remains recognizable under these transformations.

## Immutability

The integration helpers are pure.

They materialize effective historical ability state without modifying:

- SeriesBlueprint,
- CharacterPerformanceBible,
- AbilityVariant,
- canon.

Archived episodes should store or resolve the historical variant that applied to their Episode context.

## What this layer prevents

Without the Bible:

```text
Episode 2:
red inward healing rings

Episode 5:
blue lightning

Episode 8:
outward magic projectile

Episode 10:
different hand pose
```

With the Bible:

```text
camera may vary
lighting may vary
shot size may vary
supporting cast may vary

BUT

activation grammar remains recognizable
palette remains canonical
energy shape remains canonical
motion direction remains canonical
VFX motifs remain canonical
cost and limitations remain canon-correct
historical variant remains correct
```

That is the production invariant this system exists to enforce.
