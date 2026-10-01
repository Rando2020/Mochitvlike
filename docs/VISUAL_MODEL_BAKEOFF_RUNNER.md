# Visual Model Bake-Off Runner v1

## Boundary

This layer produces reproducible evidence for selecting Mochitvlike's future Production Frame architecture.

It does not:

- generate user-facing Episode frames,
- approve a production model automatically,
- train on scraped anime/manga,
- silently download floating model revisions,
- treat attractive single images as sufficient evidence.

## Architecture

```text
TypeScript product contracts
  ├── VisualFoundationModel registry
  ├── 36 visual benchmark scenarios
  ├── CharacterPerformanceBible
  └── 6 Burden Draw ability scenarios
            ↓
benchmarkBridge.ts
            ↓
contracts/benchmark.v1.json
            ↓
Python bake-off runner
  ├── SDXL adapter
  ├── FLUX adapter
  ├── IP-Adapter config
  ├── ControlNet config
  ├── LoRA phase contract
  ├── bounded performance conditioning
  ├── evidence metrics
  ├── artifact provenance
  └── human review
```

A Vitest regression test compares the committed JSON to the current TypeScript-derived bundle. Product-contract drift therefore fails CI.

## Models

The runner consumes the current registry entries only:

- Animagine XL 4.0
- Illustrious XL v2.0 Stable
- FLUX.1 Schnell

Each real run uses the exact recorded Hugging Face revision.

`revision="main"` is rejected.

Where the registry has a weight checksum and filename, the downloaded snapshot is verified before evidence is considered checksum-verified.

FLUX.1-schnell currently lacks a registered artifact checksum, so its evidence records `checksumVerified=false` until that provenance gap is closed.

## CPU CI vs GPU execution

GitHub Actions remains CPU-only.

CI validates:

- TypeScript bridge synchronization,
- Python package imports,
- model revision pinning,
- checksum logic,
- phase contracts,
- character/performance conditioning,
- reference provenance,
- deterministic scenarios,
- prompt checksums,
- artifact checksums,
- reports,
- human-review separation,
- mock SDXL/FLUX inference,
- failure isolation,
- production approval gating.

CI does not download multi-GB model weights.

Real GPU runs are explicit.

## Phases

### BASE

Foundation model only.

Evidence target:

- prompt comprehension,
- raw visual language,
- composition,
- anatomy,
- latency,
- memory.

### REFERENCE

Foundation model plus one explicit character reference using the architecture adapter.

No missing reference may silently degrade to BASE.

### STRUCTURAL

SDXL uses a dedicated ControlNet pipeline plus the character reference.

Current v1 structural control uses an SDXL Canny ControlNet as the executable structural path.

FLUX.1-schnell structural control is marked `UNVERIFIED` for the pinned candidate and is skipped rather than assumed safe.

Future evidence can add validated Flux ControlNet/Union combinations without changing the benchmark contract.

### CHARACTER_LORA

Requires:

- character reference,
- explicitly supplied Character LoRA.

The runner does not train a LoRA automatically.

The intended first training experiment uses wholly original Kael benchmark material only.

### ABILITY_CONSISTENCY

Uses:

- Orin,
- CharacterPerformanceBible v1,
- historical Burden Draw v1,
- bounded choreography,
- visual signature,
- AbilityVfxSpec,
- camera rules,
- synthetic benchmark-reference contract.

Canonical constraints and shot variables are compiled separately.

Canonical constraints include:

- physical contact,
- hand geography,
- inward transfer,
- compressed organic rings,
- wound-crimson/violet/pale-white palette,
- contained recoil,
- subdermal aftermath,
- no ranged projectile.

Variable inputs include:

- camera angle,
- shot size,
- lighting,
- background framing,
- secondary-character placement.

## Adapter strategy

### SDXL

v1 implements:

- text-to-image,
- IP-Adapter reference conditioning,
- ControlNet structural conditioning,
- Character LoRA loading.

Reference adapter:

`h94/IP-Adapter`

Structural adapter:

`diffusers/controlnet-canny-sdxl-1.0`

### FLUX

v1 implements:

- text-to-image,
- IP-Adapter path,
- Character LoRA loading.

Reference adapter:

`XLabs-AI/flux-ip-adapter`

The pinned Schnell + structural ControlNet combination remains unverified.

This distinction is intentional.

## Multiple adapters

Current Diffusers supports multiple LoRA activation and multiple IP-Adapter workflows in supported pipelines.

The v1 runner records adapter compatibility but intentionally begins with one character reference adapter per smoke scenario.

Multi-reference production conditioning should be added only after the base reference path is benchmarked.

## Synthetic benchmark references

No generated ability image is automatically canonical.

Reference assets created by the benchmark workflow carry:

```text
source = SYNTHETIC
benchmarkOnly = true
creatorApproved = false
```

Slots:

- activation pose,
- windup,
- release,
- impact,
- aftermath,
- VFX isolation,
- palette,
- shape language,
- motion arrows.

They never write themselves into `CharacterPerformanceBible.referenceAssetIds`.

## Metrics

The runner does not fabricate automated semantic perception.

Base CPU evidence supports:

- output checksum,
- latency,
- peak VRAM when CUDA exists,
- known-palette pixel evidence.

The following remain explicitly unavailable until a pinned estimator is added:

- semantic embedding similarity,
- character-reference embedding similarity,
- pose-keypoint score,
- composition score,
- contact-point verification,
- VFX shape recognition.

Those results return:

- `NOT_EXECUTED`, or
- `HUMAN_REVIEW_REQUIRED`.

## Ability review

Human review fields:

- technique recognizability,
- character consistency,
- activation-pose consistency,
- VFX consistency,
- palette consistency,
- motion-language plausibility,
- production usability.

Human review remains separate from automated evidence.

## Artifacts

```text
artifacts/{runId}/
  manifest.json
  visual-evaluation-results.json
  visual-evaluation-report.json
  visual-evaluation-report.html

  {modelId}/{phase}/{scenarioId}/
    output.png
    metadata.json
```

Metadata contains:

- exact model/revision,
- checksum verification,
- architecture,
- phase,
- scenario,
- seed,
- prompt hash,
- inference settings,
- installed runtime versions,
- reference IDs,
- LoRA IDs,
- ControlNet config,
- Performance Bible version,
- ability ID,
- ability variant ID,
- ability contract checksum,
- latency,
- peak VRAM,
- output checksum,
- timestamp,
- actual external cost when supplied.

No provider credentials are persisted.

## Determinism

Fixed seeds are recorded.

A seed does not imply bit-identical output across:

- different architectures,
- GPU types,
- library versions,
- nondeterministic kernels.

Runtime package versions are persisted for real runs.

## Production approval

The runner only produces:

`ProductionApprovalRecommendation`

Possible values:

- CONTINUE_EVALUATION
- ELIGIBLE_FOR_PRODUCTION_REVIEW
- REJECT

It never writes:

`productionStatus = APPROVED`

Eligibility requires complete evidence, checksum verification, license readiness, and adapter compatibility with no critical failure.

Human approval remains required.

## Hugging Face Jobs

Hugging Face Jobs is an available bounded GPU execution path.

Official Jobs documentation supports explicit GPU flavors and timeouts.

A smoke should progress in this order:

1. one model, one BASE scenario,
2. one character-reference scenario,
3. one Burden Draw ability scenario.

Stop if:

- the pipeline fails,
- reference conditioning fails,
- artifacts fail validation,
- cost/runtime is unexpectedly high.

Do not launch the complete three-model benchmark as a smoke test.

## Production Frame follow-on

The selected architecture will later consume:

```text
Series Visual DNA
+
Character reference
+
CharacterPerformanceBible
+
historical AbilityVariant
+
approved ability references
+
VisualPlan
+
Storyboard
+
ShotSpecification
        ↓
Production Frame Generation v1
```

This bake-off runner exists to choose and validate that visual foundation before it becomes a user-facing generation dependency.
