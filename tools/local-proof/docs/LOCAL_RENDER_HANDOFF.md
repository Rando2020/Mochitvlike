# First finished local scene

## Outcome

One coherent 10–15-second short with a beginning, reaction and ending, using the selected existing character, visibly consistent identity, purposeful motion, and an approved soundtrack. Deliver the actual MP4 plus run evidence. Do not call a slideshow, camera-pan-only fixture or application preview the finished generated animation.

## Pending decisions and access

- User choice: Veya or Remnant. No choice is assumed here.
- Exact clean scene keyframe and motion brief: show and approve before running. A character sheet or tiny crop is not automatically a good video input.
- Access to the user's Windows computer for tasks is not enabled in the latest checked environment. Do not work around this restriction. The GPU is reported as RTX 4080 16 GB; installed ComfyUI/model versions, free RAM and disk space remain unverified.
- No paid cloud generation or provider activation is authorized by this preparation.

## Inspect before installing anything

When computer access is legitimately available, find the existing ComfyUI workspace and work already done. Record Python, PyTorch/CUDA, ComfyUI version, GPU memory, system RAM, disk capacity, installed nodes and model hashes. Check its launch log for missing nodes. Do not reinstall a working setup or fetch large weights automatically. Ask for required installations/downloads when their scope or license has not been approved.

## Existing model direction

Use the official native **Wan2.2 TI2V 5B** workflow as the first candidate, not a new paid provider. Official ComfyUI instructions describe enabling `Load Image` for I2V and the required files:

- `wan2.2_ti2v_5B_fp16.safetensors` in diffusion_models.
- `wan2.2_vae.safetensors` in vae.
- `umt5_xxl_fp8_e4m3fn_scaled.safetensors` in text_encoders.

The official guide says native offloading can fit modest VRAM, but actual performance and quality on this computer have not been measured. Missing nodes may reflect version mismatch. Use the official template matching the installed version; do not invent a static node graph and assume it runs.

Reference checked October 31, 2026: https://docs.comfy.org/tutorials/video/wan/wan2_2

## Render in small gates

1. Prepare a single uncluttered scene keyframe using the selected character design. Approve its identity/costume/composition and the motion brief. Keep actual approval evidence.
2. Save the exact input PNG and exported Comfy workflow, including seed and every model identity. Start with batch 1, a roughly two-second diagnostic (previous plan: 49 frames at 24 fps), and a modest supported resolution. 480×832 is a proposed vertical test, not a guarantee that every installed node accepts it. Inspect node validation and crop/aspect behavior first. 49 frames at 24 fps is approximately 2.04 seconds, not exactly two seconds.
3. Evaluate the diagnostic at normal speed and frame-by-frame: face, hair/costume/hand consistency, limbs, background movement, flicker, motion intent and any unwanted morphing. Record failure, not just the successful seed. Do not interpolate away a broken identity.
4. Generate additional accepted short takes for the same scene. Keep each take's source image, workflow, settings and measured render seconds. Reuse the approved identity, but approve changed scene keyframes or substantially changed motion. Record rejection reasons. Do not lengthen a bad take simply to reach a duration target.
5. Edit accepted takes with honest cuts, a purposeful ending and original/appropriately licensed sound. Create a single soundtrack mix aligned to the edit; the assembly tool does not invent voices or music.
6. Fill the accepted-takes manifest and run validation, then assembly. Use actual trims aligned to output frames. The template values are placeholders, not approved settings.
7. Review the exported MP4, not just individual takes: no black gaps, unintended jump cuts, clipping, stretched characters, abrupt audio cut, missing ending or mismatched duration. Watch once without subtitles to judge visual clarity; then with audio.

## Deliver and integrate only after proof

Deliver MP4; source keyframe(s); workflow(s); model file/version/hash list; seed/settings; timing and memory measurements; a short accepted/rejected-take report; output checksum and assembly receipt. Keep failed diagnostic footage labeled as such.

Only after the user sees and accepts the result should the proven local process be connected to Crayvo's persistent job/storage paths. Keep production reference rights, revision checks, spend controls and failure recovery intact. Local success does not establish cloud provider cost, throughput or reliability.
