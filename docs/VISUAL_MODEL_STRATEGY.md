# Visual Model Strategy v1

## Purpose

Mochitvlike needs a visual foundation for serialized anime/manga production, not a rotating dependency on whichever community checkpoint currently makes the prettiest isolated image.

The production question is:

> Can the system preserve an original show's characters, costumes, locations, composition, and visual identity across dozens of shots?

The first registry/evaluation layer therefore separates:

1. model discovery,
2. license/provenance review,
3. reproducible revision pinning,
4. production benchmark evidence,
5. eventual production approval.

No model is APPROVED in this first version.

## Hugging Face vs Civitai

### Hugging Face

Canonical production registry source for externally hosted models.

Reasons:

- exact repository identity,
- revision pinning,
- Diffusers integration,
- model-card/license metadata,
- adapter ecosystem,
- programmatic reproducibility.

A Hugging Face production record must store an exact immutable revision rather than `main`.

### Civitai

R&D discovery source only.

Civitai is useful for learning what creators are doing with checkpoints, LoRAs, workflows, and style adapters.

A Civitai asset must not be referenced directly by the production VisualFoundationModel registry.

If a community artifact is ever considered for production, it must first be:

1. provenance reviewed,
2. license reviewed,
3. copied/pinned into an approved Hugging Face or INTERNAL artifact source,
4. checksummed,
5. benchmarked,
6. explicitly approved.

## Initial model candidates

### Animagine XL 4.0

Registry:

`cagliostrolab/animagine-xl-4.0`

Pinned revision:

`2b7c1b397761bf5bd3cc42e5b39ec99314a75a96`

Pinned checkpoint SHA-256:

`1d5b43ff75b6ab598502d4c779d2fbfa3dceca51c60c3b609640a60772333916`

Architecture:

SDXL

Hub metadata license:

`openrail++`

Use in v1:

Anime-specialized benchmark candidate.

Commercial, derivative-training, and redistribution rights remain `REVIEW_REQUIRED` until the exact license obligations are reviewed for Mochitvlike's deployment and creator-training model.

Official source:

https://huggingface.co/cagliostrolab/animagine-xl-4.0

### Illustrious XL v2.0 Stable

Registry:

`OnomaAIResearch/Illustrious-XL-v2.0`

Pinned revision:

`69459c1fe6f46db41ab31e6114f05acc0e06bcaa`

Pinned checkpoint SHA-256:

`c2a1a3eaa13d4c107dc7e00c3fe830cab427aa026362740ea094745b3422a331`

Architecture:

SDXL

Hub metadata license:

`creativeml-openrail-m`

Use in v1:

Anime/illustration benchmark candidate with an SDXL-compatible fine-tuning ecosystem.

Commercial, derivative-training, and redistribution fields remain `REVIEW_REQUIRED` until obligations are reviewed.

Official source:

https://huggingface.co/OnomaAIResearch/Illustrious-XL-v2.0

### FLUX.1 Schnell

Registry:

`black-forest-labs/FLUX.1-schnell`

Pinned revision:

`cfac132b798278bc25d0d8a8608dc4522b13c615`

Architecture:

FLUX

License:

Apache-2.0

The official model card explicitly says the checkpoint may be used for personal, scientific, and commercial purposes.

Use in v1:

General-purpose prompt-following/control comparison candidate, not an assumed anime winner.

The gated weight was not available for checksum retrieval during this registry implementation, so `artifactChecksum` remains null. This intentionally prevents APPROVED status even though the license is clearer.

Official source:

https://huggingface.co/black-forest-labs/FLUX.1-schnell

## Production approval rules

APPROVED requires at least:

- production registry provider is HUGGING_FACE or INTERNAL,
- exact revision,
- artifact checksum,
- commercial-use field is explicitly true,
- completed production benchmark,
- operational cost/latency review,
- human artifact review.

The registry code currently enforces the first four mechanical gates.

Benchmark evidence will gate promotion in the later evaluation runner.

## Benchmark philosophy

The canonical benchmark contains original Mochitvlike fixtures only.

No Naruto, Dragon Ball, One Piece, Sailor Moon, Pokémon, Studio Ghibli character, or other named franchise fixture belongs in the production benchmark.

The four original fixtures are:

- Kael,
- Lyra,
- Mira,
- Vesper.

The benchmark covers:

### Character identity

Same person under:

- close-up,
- profile,
- full body,
- expression change,
- camera-angle change,
- lighting change.

### Multi-character identity

Tests:

- two known characters,
- three known characters,
- visual identity separation,
- costume attribution,
- hair/eye/accessory attribution.

### Pose and composition

Tests:

- standing,
- running,
- fighting,
- seated dialogue,
- over-the-shoulder,
- low angle,
- high angle,
- extreme close-up,
- wide establishing.

### Continuity

Tests:

- same room from reverse angle,
- exterior continuity,
- recurring prop,
- recurring costume,
- palette continuity.

### Anime

Tests:

- cel-shaded production frame,
- action keyframe,
- emotional close-up,
- comedy reaction,
- dark-fantasy environment.

### Manga

Tests:

- monochrome panel,
- lineart,
- screentone,
- action panel,
- dialogue composition,
- environment panel.

## Scoring

Weights:

- character identity: 20%
- multi-character identity: 15%
- pose adherence: 15%
- style consistency: 15%
- camera composition: 10%
- background continuity: 5%
- anatomy: 5%
- prompt comprehension: 5%
- adapter compatibility: 5%
- speed/cost: 5%

Raw measurements and human review remain separate fields.

A report may calculate a weighted summary, but it never automatically selects a winner.

A model with a higher aggregate score may still be unsuitable because of licensing, deployment cost, weak adapter support, or a critical identity-consistency failure.

## Character consistency architecture

Future production target:

```text
Foundation Model
    +
Series Style LoRA
    +
Character LoRA(s)
    +
IP-Adapter character references
    +
ControlNet pose/depth/edge
    +
ShotSpecification
    ↓
Production Frame
```

### LoRA

Current Diffusers supports named LoRA adapters and activating multiple adapters with independent weights.

This is appropriate for future combinations such as:

`series_style + kael + lyra`

without training a full foundation model for each show.

Official documentation:

https://huggingface.co/docs/diffusers/api/loaders/lora

### IP-Adapter

IP-Adapter supplies image-reference conditioning independently from text conditioning.

Current Diffusers documentation supports multiple IP-Adapters and specifically documents face/subject plus style combinations.

This is appropriate for canonical character-sheet references.

Official documentation:

https://huggingface.co/docs/diffusers/using-diffusers/ip_adapter

### ControlNet

ControlNet supplies structural conditioning from inputs including:

- edges,
- depth,
- human pose,
- segmentation/keypoints.

Current Diffusers also supports Multi-ControlNet.

This is appropriate for converting the existing Storyboard/VisualPlan composition into a constrained production frame.

Official documentation:

https://huggingface.co/docs/diffusers/using-diffusers/controlnet

## Character LoRA lifecycle

Future lifecycle:

```text
CharacterSheet
    ↓
canonical visual design
    ↓
approved reference sheet
    ↓
controlled reference views
    ↓
creator approval
    ↓
optional Character LoRA v1
    ↓
production usage
    ↓
additional creator-approved examples
    ↓
explicitly versioned Character LoRA v2
```

Training a Character LoRA must not be mandatory for the first generated frame.

IP-Adapter plus canonical references should remain a valid lower-cost path.

## Series Style LoRA lifecycle

Future lifecycle:

```text
Series Visual DNA
    ↓
initial production frames
    ↓
creator-approved frames
    ↓
explicit opt-in dataset
    ↓
Series Style LoRA v1
    ↓
more approved shots
    ↓
Series Style LoRA v2
```

A later LoRA version never silently replaces the adapter used by an already-rendered Episode.

Model/adapter versions must be stored with generated production artifacts.

## Training data provenance

TrainingAsset sources:

- OWNED
- COMMISSIONED
- LICENSED
- OPT_IN
- PUBLIC_DOMAIN
- SYNTHETIC

Eligibility requires:

- training permission,
- commercial permission,
- creator opt-in where the source is creator project material.

Do not build the proprietary Mochitvlike training corpus from unlicensed manga scans, anime streaming frames, or scraped commercial artwork.

## Three learning strategies

### 1. Pixel training

Use pixels only when Mochitvlike can document appropriate rights:

- owned,
- commissioned,
- licensed for training,
- explicit creator opt-in,
- appropriate public-domain material,
- eligible synthetic material.

### 2. Structural/statistical visual storytelling grammar

Learn production patterns without necessarily placing commercial anime pixels into proprietary weights.

Potential measurements:

- shot duration,
- cut density,
- shot-size frequency,
- camera-angle frequency,
- panel aspect ratio,
- page composition,
- action/reaction patterns,
- scene density,
- dialogue density,
- cliffhanger placement.

This data can improve VisualPlan, Storyboard, Animatic, and Manga layout compilers.

Legal/data review still applies to how source media is acquired and analyzed.

### 3. Creator-approved synthetic production data

The long-term moat should be first-party production data with explicit creator consent.

Potential record:

```text
Visual DNA
+ Character references
+ Shot specification
+ model/adapters/seed
+ candidates
+ accepted candidate
+ rejected candidates
+ creator edits
```

This trains serialized production preferences rather than generic image aesthetics.

## Creator opt-in

Mochitvlike must not silently train on private creator projects.

Creator material is training-ineligible until the relevant opt-in and permissions are present.

Opt-out/withdrawal policy and downstream model-unlearning implications require a separate product/legal design before a production training program launches.

## Shared anime/manga architecture

Shared state:

```text
Series
Characters
Canon
Locations
Visual DNA
Scene
Composition
```

Anime output:

```text
ShotSpecification
    ↓
Production Frames
    ↓
Storyboard
    ↓
Motion
    ↓
Episode
```

Manga output:

```text
PanelSpecification
    ↓
Panels
    ↓
Page Layout
    ↓
Speech Balloons
    ↓
Lettering
    ↓
Chapter
```

Manga generation is not implemented in this registry task.

## Connection to current production pipeline

The existing pipeline already owns:

```text
SceneScript
    ↓
VisualPlan
    ↓
Storyboard
    ↓
Animatic
    ↓
Motion
    ↓
EpisodeTimeline
```

Visual Generation v2 should therefore not become an unstructured prompt box.

It should consume a future deterministic ShotSpecification compiled from VisualPlan/Storyboard and return versioned ProductionFrame artifacts.

That lets ControlNet enforce composition while Character LoRA/IP-Adapter enforce identity and Series Style LoRA enforces show identity.

## Evaluation execution

This PR intentionally does not add a GPU inference runner.

The TypeScript layer establishes:

- exact candidate model registry,
- license/provenance gating,
- canonical 36-scenario benchmark,
- deterministic seeds,
- evaluation result schema,
- weighted scoring,
- human-review separation,
- reproducible report contract.

The next isolated ML task should create a GPU-backed bake-off runner capable of executing the same scenarios against pinned candidate revisions and writing artifacts/results into this schema.
