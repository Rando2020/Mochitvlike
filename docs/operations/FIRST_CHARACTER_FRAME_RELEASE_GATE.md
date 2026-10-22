# First character-conditioned frame: release gate (2026-10-22)

**Status: BLOCKED. No GPU call, generated image, paid provider request, automatic approval, or creator-asset upload has occurred.**

This runbook is the minimum canonical frame experiment, not an independent image-generation feature. The actual project is Crayvo in `Rando2020/Mochitvlike`.

## Verified source versus unverified runtime

- `main` at inspection: `536a3e232aab291db3cb2051ab8a929090fafed2`; PRs #38, #39 and #40 remain independent draft proposals.
- The three VisualFoundationModels are **CANDIDATE**, none **APPROVED**. The ReferenceConditioningAdapter is **CANDIDATE**. Do not change these labels to make an experiment pass.
- The connected production Supabase project has no persisted production-reference assets or production frames at this checkpoint. No Remnant sheet, sample/benchmark fixture, or locally prepared crop is an approved creator asset.
- Vercel's `mochitvlike` project has GitHub-linked deployment evidence, but management access to workspace `jojo31790-9839` returns 403; real hosted creator acceptance and a separate preview database are not verified.
- An image submitted to ChatGPT is not automatically an owned, licensed, stored, approved, revision-bound reference in Crayvo.

**Conclusion:** the requested *approved-model, approved-reference* frame is not runnable yet. No production GPU job should be queued. A separate, explicitly labeled development evaluation may occur **only after** environment isolation, scope/rights review, cost approval and account access.

## Smallest canonical path

1. Verify a creator-owned saved series, scene, script, visual plan, storyboard, and **one-character** storyboard panel. Use a fixed Orin-only panel from the original **The Wounds We Keep** *only if it actually exists in that creator's saved series*. Never manufacture IDs or write fixture content to the live database.
2. Validate the CharacterSheet/SeriesBlueprint visual design and, if present, the versioned CharacterPerformanceBible. Resolve the same character's current `generationDirectionHistory` and `referenceBindingHistory`.
3. Accept only an owner-scoped `production_reference_assets` row with `status=APPROVED`, `approved=true`, `creator_approved=true`, `benchmark_only=false`, satisfactory provenance and commercial/model-conditioning rights, checksum, immutable storage history, and matching character association. The `PRIMARY_IDENTITY` source role is required unless a current visual-revision binding explicitly attests an allowed source role for identity. Do not silently select older approved references after a visual revision.
4. Read the existing model registry. Normal production requires a model with `productionStatus=APPROVED`, reviewed licensing, benchmark and exact pinned artifact revision. Inference adapter production approval is an **independent** requirement.
5. Compile one fixed `ProductionFrameGenerationSpec` through `buildProductionFrameGenerationSpec` from that exact storyboard panel. Preserve pinned model revision, reference IDs/checksums, performance/ability variants, 32-bit seed, parent IDs and checksums.
6. Only after all approvals and the explicit budget gate, create the existing atomic frame + generation RPC. Claim via the existing durable worker; recheck model, environment, stored frame approval marker and **current** reference approval/bytes before making the paid provider request.
7. Call the existing authenticated FastAPI/Modal inference boundary using pinned SDXL and IP-Adapter Plus conditioning, not an arbitrary user prompt or checkpoint URL. Reject multi-character mixing.
8. Validate returned image with the inference service's Pillow decode/verify, enforce PNG, dimensions and checksum at the worker, upload to attempt-specific private Storage, and atomically complete only under a valid claim token. Superseded/failed attempts remain in job history. The full image and checksum must be inspected again on read/approval; technical validation does not establish likeness.
9. Show the generated still labeled **Development Visual** when applicable. Creator explicitly approves or rejects it. A single frame never establishes cross-frame consistency.

Do **not** use direct unversioned Hugging Face/Civitai sources, silently train a LoRA, promote a model, mutate historical character references, or bypass creator decisions.

## Proposed controlled single-image development evaluation (not authorization)

| Field | Proposed fixed value | Source/status |
| --- | --- | --- |
| GPU runner | Modal, one L40S container, `max_containers=1`, `max_inputs=1` | Existing `ml/visual-inference/deploy/modal_app.py`; not deployed/verified |
| Base model | Animagine XL 4.0, `cagliostrolab/animagine-xl-4.0` | Development **candidate**, not production-approved |
| Base model revision | `2b7c1b397761bf5bd3cc42e5b39ec99314a75a96` | Existing pinned registry |
| Conditioning adapter | `h94/IP-Adapter`, `ip-adapter-plus_sdxl_vit-h.safetensors` | Development **candidate** |
| Adapter revision | `9bf28b38530e55ffa91c6d82e5161a982c22f284` | Existing pinned adapter registry |
| Reference | One currently approved and revision-attested `PRIMARY_IDENTITY` image | **Missing** |
| Frame | One Orin-only scene panel; fixed framing, no VFX, no second character | **Saved panel missing** |
| Dimensions | 1536 × 1024 PNG | Existing frame compiler default |
| Seed | Deterministically compiled from storyboard/panel/model/revision | Existing compiler |
| Diffusers | SDXL, 28 inference steps, guidance 6.5, identity scale 0.65 | Existing service defaults |
| Inference timeout | 140 s service; 150 s Next worker; 180 s Modal function | Existing code/config |
| Container startup | Modal `startup_timeout=900` s; `scaledown_window=300` s | Existing deployment config |

Normal production **cannot** use this candidate combination. The development override is intentionally rejected in hosted Next.js production runtimes and in production-mode inference services. Either complete **separate, evidence-backed production model and adapter approval**, or conduct the benchmark using a truly separate development environment with explicit budget and rights approval. Do not relax guards as a shortcut.

## GPU cost proposal, not an invoice or authorization

Modal's published **L40S** GPU rate is **$0.000542 per GPU-second** at time of research: https://modal.com/pricing . At that base rate, 140 seconds of GPU time is approximately **$0.076**, 180 seconds approximately **$0.098**, and a 300-second warm-container interval approximately **$0.163**. A worst-case **900-second startup + 180-second execution + 300-second warm period** would correspond to roughly **$0.75 in L40S GPU seconds alone**, *if all those seconds are metered*. Cold loading and download time, CPU, RAM, storage, egress, region multipliers, billable warm time, and credits affect actual cost. These estimates are **not** a hard spending ceiling.

**Proposed budget request:** one authorized development frame, **$2 maximum owner-approved spend**, zero retries, one container; configure a provider-level budget control and inspect actual billing before treating $2 as enforceable. Without account confirmation of such a limit, keep execution disabled. Do not presume Starter credits are available in this workspace. Deployment/model-download costs may occur before the image is generated.

## Human acceptance record

Capture **source approval record**, immutable model/adapter IDs and revisions, seed, frame/spec/prompt checksums, actual GPU seconds and bill, image dimensions/PNG verification/storage checksum, full failed-attempt list and human review by dimension:

| Dimension | Reviewer record |
| --- | --- |
| Face/eyes/hair and silhouette | Pass / Fail / Not reviewed + evidence |
| Costume/accessories/character identity | Pass / Fail / Not reviewed + evidence |
| Pose, shot composition and camera | Pass / Fail / Not reviewed + evidence |
| Series palette and style | Pass / Fail / Not reviewed + evidence |
| Anatomy/artifacts/copying | Pass / Fail / Not reviewed + evidence |
| Character signature/ability (if used) | Pass / Fail / Not reviewed + evidence |
| Creator decision | Explicit approve / reject / unreviewed |

Keep the reference and result privately stored. Human review does not change registry model approval.

## Next bounded benchmark after the one-image gate

Two controlled images, same model and adapter revision, prompt constraints, dimensions, seed, style and camera: **A** prompt-only baseline; **B** creator-approved `PRIMARY_IDENTITY` conditioning. Compare identity, costume, anatomy, composition and overfitting with a human reviewer plus inspectable metrics. Both are development evidence until approved, and no multi-character or episode-level consistency is claimed.
