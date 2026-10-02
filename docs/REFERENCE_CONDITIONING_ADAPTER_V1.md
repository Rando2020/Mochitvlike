# Reference Conditioning Adapter v1

## Purpose

Reference Conditioning Adapter v1 upgrades Visual Inference Service v1 from prompt-only development rendering to real image-conditioned SDXL rendering while preserving the existing Production Frame durable-job, provenance, checksum, and model-revision boundaries.

The canonical path is:

```text
ProductionFrameGenerationSpec
  -> approved Production References
  -> Visual Inference Service
  -> ReferenceConditioningAdapter
  -> pinned SDXL base model
  -> pinned IP-Adapter Plus SDXL
  -> PNG
  -> existing Next quality gate
  -> existing durable Production Frame storage
```

## Adapter selection

Selected development adapter:

```text
id: ip-adapter-plus-sdxl-vith
repository: h94/IP-Adapter
revision: 9bf28b38530e55ffa91c6d82e5161a982c22f284
subfolder: sdxl_models
weight: ip-adapter-plus_sdxl_vit-h.safetensors
SHA-256: 3f5062b8400c94b7159665b21ba5c62acdcd7682262743d7f2aefedef00e6581
license: Apache-2.0
production status: CANDIDATE
```

The adapter remains CANDIDATE. It is not automatically production-approved.

IP-Adapter Plus was selected over FaceID/InstantID style identity paths for this v1 because it provides general SDXL image prompting without introducing InsightFace pretrained face-model restrictions into Mochitvlike's commercial production foundation.

## Official Diffusers integration

The concrete SDXL backend uses Diffusers `load_ip_adapter()`, pins the adapter revision, and supplies the safetensors weight explicitly.

Conditioning influence is set with `set_ip_adapter_scale()`.

The service does not accept adapter repositories, revisions, paths, or scales from the client.

## Reference roles

Production Reference Approval remains authoritative.

### IDENTITY

Source:

```text
CHARACTER
referenceRole = PRIMARY_IDENTITY
```

Exactly one deterministic primary identity reference is selected for the single character.

PROFILE, FULL_BODY, COSTUME, EXPRESSION, TURNAROUND and OTHER do not replace a missing PRIMARY_IDENTITY.

### VFX_STYLE

Supported ability slots:

```text
VFX_ISOLATION
SHAPE_LANGUAGE
```

Only one deterministic reference is selected for this role in v1.

### COLOR_LANGUAGE

Supported ability slot:

```text
PALETTE
```

### Structural / text-only in v1

The following are not incorrectly treated as identity/style image prompts:

```text
ACTIVATION_POSE
WINDUP
RELEASE
IMPACT
AFTERMATH
MOTION_ARROWS
```

These remain canonical semantic/structural references for future ControlNet/pose conditioning.

## Deterministic ordering

The conditioning order is:

```text
1. PRIMARY_IDENTITY
2. VFX_STYLE
3. COLOR_LANGUAGE
```

Within a role, canonical slot then reference ID provides deterministic selection.

The maximum conditioning reference count is four.

## Scales

v1 internal defaults:

```text
identity: 0.65
VFX style: 0.30
color language: 0.20
```

All scales are server configuration and bounded to 0.0-1.0.

The client cannot provide unbounded scales.

These values are development defaults, not claims of globally optimal visual quality.

## Multi-character limitation

v1 deliberately supports one conditioned character per Production Frame.

If more than one canonical character is present, reference conditioning fails with:

```text
MULTI_CHARACTER_REFERENCE_CONDITIONING_NOT_SUPPORTED
```

The service does not average Orin and Mara embeddings and call the result identity preservation.

A future multi-character implementation should evaluate region-aware IP-Adapter masks, composition-first + bounded inpainting, or another explicit per-character spatial strategy.

## Adapter cache

The SDXL base pipeline is cached as before.

The ReferenceConditioningAdapter object is cached alongside the loaded pipeline and adapter weights load only once per backend/model process.

Model cache paths remain server-controlled.

## Reproducibility record

Generation runtime metadata retains:

```text
base model ID
base model revision
adapter ID
adapter revision
seed
conditioning reference IDs
conditioning scales
steps
guidance
backend
```

The canonical ProductionFrameGenerationSpec still retains reference IDs/checksums.

No claim is made that different CUDA/GPU/runtime versions produce bit-identical pixels.

## Security

PR #18 controls remain:

- authenticated server-to-server inference
- exact base-model registry
- HTTPS reference URLs
- hostname allowlist
- redirect rejection
- bounded downloads
- decoded-pixel limits
- SHA-256 verification
- no prompt logging
- no signed URL logging
- bounded inference time
- bounded GPU concurrency

Adapter-specific controls add:

- no client adapter ID
- no arbitrary adapter repository
- no adapter filesystem path
- pinned immutable adapter revision
- bounded reference count
- bounded conditioning scales
- rejected/pending/archived/benchmark references excluded
- cross-character ability references rejected
- candidate adapter restricted to development mode
- multi-character conditioning fail-closed

## Error contract

Added bounded errors:

```text
ADAPTER_NOT_SUPPORTED
ADAPTER_REVISION_MISMATCH
ADAPTER_LOAD_FAILED
REFERENCE_ROLE_UNSUPPORTED
IDENTITY_REFERENCE_REQUIRED
REFERENCE_CHARACTER_MISMATCH
MULTI_CHARACTER_REFERENCE_CONDITIONING_NOT_SUPPORTED
REFERENCE_CONDITIONING_FAILED
CONDITIONING_QUALITY_FAILED
```

These map back through HttpProductionFrameProvider into bounded durable job failures.

## Quality evaluation

The visual-evaluation package now defines a reference-conditioning A/B experiment:

```text
A: canonical prompt only
B: exact same request + approved PRIMARY_IDENTITY reference
```

Fixed:

- model revision
- adapter revision
- seed
- dimensions
- prompt checksum
- scheduler
- steps
- guidance

Review dimensions:

- identity preservation
- costume preservation
- hair/face continuity
- pose compliance
- composition compliance
- environment continuity
- style consistency
- ability/VFX signature consistency
- reference overfitting/copying
- artifact rate

Identity/style/ability recognizability remain human/perceptual review. The code does not pretend a checksum proves those semantics.

## First canonical frame experiment

The intended first canonical comparison is an Orin-only panel from The Wounds We Keep.

The conditioned result must use:

- existing Series/Scene/Script/VisualPlan/Storyboard lineage
- VISUAL_DEV_MODEL_ID
- development_visual = true
- approved Orin PRIMARY_IDENTITY reference
- exact SDXL model revision
- exact IP-Adapter revision
- existing Production Frame durable job

The unconditioned A image is development evidence only.

The conditioned B image may become the durable development Production Frame only after the creator reference exists and the GPU service is deployed.

## Deployment status

No authenticated Modal deployment environment is connected to this implementation session.

Therefore no GPU deployment or real canonical frame is claimed by this change.

The adapter code is deployable using the existing Modal Visual Inference Service configuration. The Modal secret should additionally configure:

```text
REFERENCE_CONDITIONING_ADAPTER_ID=ip-adapter-plus-sdxl-vith
IDENTITY_CONDITIONING_SCALE=0.65
VFX_CONDITIONING_SCALE=0.30
COLOR_CONDITIONING_SCALE=0.20
MAX_CONDITIONING_REFERENCES=4
```

## Current limitations

- no real GPU execution was available during implementation
- no creator-approved Orin reference can be inferred from repository source alone
- single-character conditioning only
- pose/depth/lineart ControlNet not implemented yet
- ability structural pose slots remain semantic/text-only
- adapter remains CANDIDATE
- base models remain CANDIDATE
- no LoRA training
- no automatic model or adapter approval

## Next acceptance gate

Once Modal credentials and an approved Orin PRIMARY_IDENTITY reference exist:

1. deploy the service
2. verify health/readiness
3. choose an Orin-only canonical Storyboard panel
4. generate A prompt-only evidence
5. generate B IP-Adapter conditioned evidence
6. keep every non-conditioning parameter identical
7. perform human identity/continuity review
8. persist only the canonical conditioned DEVELOPMENT frame through the durable Production Frame path
