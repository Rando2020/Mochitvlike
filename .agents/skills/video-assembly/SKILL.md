---
name: video-assembly
description: Prepare safe, reproducible two-shot video compositing experiments for Crayvo; apply HyperFrames for captions, transitions, and assembly, without replacing the visual inference or character motion pipeline.
---
# Crayvo isolated video assembly

Use for compositing, titles, captions, timing, scene transitions, and final exports. Do **not** use this skill to claim character consistency, lip-sync generation, or full-body animation quality: those are separate measurable media-provider concerns.

## Context to inspect
- `README.md`, `docs/product/CRAYVO_WEB_IOS_MVP.md`, `docs/operations/OPERATIONAL_STUDIO_RELEASE.md`
- Existing scene planner, production frame, reference-condition adapter, media worker and visual-evaluation tests
- Exact current PR/base branch, not README-only claims

## Pilot contract
- 15-second **offline** sample, two connected shots, one owned/licensed hero reference, original dialogue, no real customer media.
- Start with local placeholder footage or explicitly approved existing test assets; never invoke paid generation, cloud render, or GPU endpoints without owner authorization.
- Construct a shot manifest with stable IDs, timestamps, aspect ratio, frame rate, reference asset IDs, audio source, caption timing, transitions, and expected continuity.
- Keep HyperFrames in a separate `experiments/hyperframes/` workspace if implemented; no new production dependency or server route until isolated render and security review pass.
- Use only the four upstream HyperFrames core skills where they are actually installed: `hyperframes`, `hyperframes-cli`, `hyperframes-registry`, `media-use`. Follow their render contract. Do not pretend this adapter installs or activates the CLI.
- Check Node 22 and FFmpeg compatibility. Pin and review a specific upstream package version before any installation; inspect scripts and licensing.
- Compare two shots frame by frame for cuts, sizing, safe title areas, captions, sound continuity, and hero identity. Assess generated body motion and lip-sync only if source assets contain both.
- Document render command, timing metadata, source licenses, artifacts, cost, and all unsupported features. Never publish media without approval.

## Acceptance record
| Gate | Required evidence |
| --- | --- |
| Safe inputs | Origin, ownership/license, no private assets exposed |
| Assembly | Two shots, exact intended total duration, no black gaps |
| Titles | Mobile-safe 9:16 composition, legible captions |
| Visual continuity | Side-by-side frame comparisons around transition |
| Audio | Dialogue continuity; timestamped sync check when lip motion exists |
| Reproducibility | Exact versions, command, machine, output path, and hash |
| Isolation | No production Supabase, live provider, real billing, worker, or user data |

Separate design evaluation from rendering. Report `NOT RUN` if actual rendering was not executed.

Attribution: Original Crayvo-specific adapter based on HyperFrames docs (Apache-2.0), https://github.com/heygen-com/hyperframes .
