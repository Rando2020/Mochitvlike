# Crayvo local proof kit

This is a small **offline finishing step**, not another generator or app. It joins accepted local video takes into a real, downloadable H.264 MP4 and writes a reproducibility receipt. It does not download models, call a provider, spend money, upload media, approve a character, or touch the database.

**Current result:** the assembly code is tested with synthetic red/blue video and a generated sine tone. No Veya or Remnant animation has been generated. The first real scene still needs local computer access, selected character, approved scene keyframe and motion, and a successful local render.

## Run

Use already installed Python 3.10+ and FFmpeg/ffprobe with libx264. Tested here on Python 3.12.14 and FFmpeg 7.1.5 on Linux. Windows execution is not yet verified; the code uses portable Python paths and subprocess argument arrays, without shell scripts.

1. From the repository root, run `cd tools/local-proof`. This isolated kit requires no npm dependencies and changes no existing production code.
2. Copy `examples/accepted-takes.template.json` to a working folder. Keep its references, workflows, takes and optional soundtrack inside that folder. No absolute paths, URLs or paths outside that folder are admitted.
3. Replace placeholder hashes with actual SHA-256 values. Record real approvals and model/run details; do not turn flags on without evidence. Repeat clips in intended cut order, with unique IDs.
4. Validate without creating output:

   `python scripts/assemble_local_proof.py scene/manifest.json renders/proof.mp4 --validate-only`

5. Assemble:

   `python scripts/assemble_local_proof.py scene/manifest.json renders/proof.mp4`

The tool refuses existing output or receipt files. It produces `proof.mp4` and `proof.receipt.json`. Use a new filename for each revision. If a process is interrupted, inspect any partial output before choosing a new filename; do not treat a file without a valid receipt as completed.

## What is supported

- Accepted local video takes, frame-aligned in/out trims, ordered cuts.
- A uniform even output resolution and integer frame rate. Different source aspect ratios are letterboxed, not cropped or stretched.
- No slow motion, repeated frames to extend a short take, generative interpolation, or silent duration padding of the video. A trim beyond the source duration fails.
- Optional separately supplied soundtrack, with rights evidence. It is trimmed or silence-padded to the video, then faded out over the final quarter-second. Source clip audio is deliberately removed. Mix narration, effects and music into this approved soundtrack beforehand.
- Original clip/source-image/workflow file hashes, recorded model hashes, seed, prompt, dimensions, frames, steps and render time. Unknown peak VRAM should remain null, not guessed.
- Optional app correlation IDs can be retained in the input manifest and receipt. They do not create records or attest that an app approval exists.

Approvals and model identities in the JSON are user/operator attestations. This tool checks required fields and source/workflow file bytes; it cannot authenticate the user's approval, prove how footage was generated, or compare model weights on an inaccessible machine. The receipt deliberately does not certify real footage as AI-generated. Keep actual generation logs and evidence alongside it.

## Verify the finishing tool

`python -m unittest discover -s tests -v`

Tests create and remove only synthetic media in a temporary folder. They verify actual encoded cuts/frame order, mismatched source frame rates/aspect ratios, trimmed frame count, soundtrack timing, checksum failures, invalid/unaccepted inputs, missing approvals, path escape and overwrite prevention. Synthetic manifests require `--fixture` and receipts explicitly say they are tests. Do not use a test output as a model-quality demonstration.

## Fit with existing Crayvo

Inspected against the recovered local mock source commit `4824adf7c920fcc23568da8d1c1990d76f57849b`, based on main `e155101a3d042e5e4a6dc6a888b93c9937c383d4`. Source archive SHA-256: `00012a0577a1b5efc0cf0b6bafbd42b785984ac26b157e5c307e1c6ac7099178`.

That source's `lib/episodes/assembly/previewRenderer.ts` has no configured file renderer. This kit addresses the offline MP4 finishing gap without claiming to implement its server `EpisodePreviewRenderer` interface. `lib/motion/types.ts` currently limits the provider aspect-ratio contract to 16:9. A vertical local proof must not be silently sent through that contract as though compatible.

The four-second rehearsal remains procedural fixture playback. Keep its zero-spend provider guards, source approvals and uncertain-submission protections unchanged. After a real local short passes review, design an explicit ingestion/provider adapter with ownership, storage, provenance, aspect-ratio and quality checks. Do not return a `file://` path as a hosted app asset or disable a production guard.

See `docs/LOCAL_RENDER_HANDOFF.md` for the first real render sequence and acceptance gate.
