# Motion Generation v1

## Boundary

Motion Generation is the first Series layer allowed to create novel moving visual frames.

It does not add:

- voice synthesis
- dialogue TTS
- lip sync
- music
- sound effects
- final episode mastering
- automatic canon mutation
- one-shot full-episode video generation

Pipeline:

```text
AnimaticTimeline
    ↓
MotionPlan
    ↓
MotionGenerationSpec
    ↓
durable clip jobs
    ↓
Runway image-to-video tasks
    ↓
motion assets
    ↓
Motion Workspace
    ↓
future Episode Assembly
```

Animatic timing remains authoritative.

## Provider selection

Motion v1 uses Runway Gen-4.5 through the Runway REST API.

Reasons:

- first-frame image-to-video is a native API path;
- official examples support Node/REST;
- Gen-4.5 supports image-to-video;
- current Gen-4.5 duration range is 2–10 seconds;
- Gen-4.5 image-to-video supports landscape 1280:720;
- task creation is asynchronous and returns a task ID;
- task output can be resumed/polled by task ID;
- successful output URLs are ephemeral, so Motion v1 downloads them into Supabase Storage.

Official references:

- Runway API getting started: https://docs.dev.runwayml.com/guides/using-the-api/
- Runway input parameters: https://docs.dev.runwayml.com/assets/inputs/
- Runway SDK/task polling: https://docs.dev.runwayml.com/api-details/sdks/
- Runway output formats: https://docs.dev.runwayml.com/assets/outputs/
- Runway changelog: https://docs.dev.runwayml.com/api-details/api_changelog/

Environment:

`RUNWAYML_API_SECRET`

Optional model override:

`RUNWAY_MOTION_MODEL=gen4.5`

API version header:

`X-Runway-Version: 2024-11-06`

## Duration mapping

MotionPlan always preserves:

`targetDurationSeconds = AnimaticClip.durationSeconds`

Provider duration is a separate transport concern.

Current deterministic mapping:

```text
ceil(targetDurationSeconds)
then clamp to 2..10 seconds
```

Examples:

- 1.2s Animatic target → 2s Runway generation
- 3.2s Animatic target → 4s Runway generation
- 12s Animatic target → 10s Runway generation

Future Episode Assembly may trim a longer provider output or extend/fallback around a shorter maximum-duration output.

The Animatic is never rewritten to match provider billing/duration units.

## MotionPlan

MotionPlan preserves:

- Animatic clip identity and ordering
- Storyboard panel identity
- VisualBeat traceability
- Script block traceability
- source Storyboard still
- Animatic target duration

It derives bounded:

- camera motion
- subject motion
- environmental motion
- emotional intent
- continuity notes

Motion compiler never calls the video provider.

## SKIPPED clips

A clip may be marked `SKIPPED` where intentional stillness is stronger and the source contains no required action.

SKIPPED clips:

- remain in plan order;
- count as resolved;
- use the Storyboard still in Motion playback;
- do not create provider tasks;
- remain available to future Episode Assembly.

## MotionGenerationSpec

Provider work receives only bounded visual/motion data:

- source image
- target duration
- Creative DNA
- relevant characters only
- visualConcept / visualDescription
- appearance continuity notes
- active location
- environment continuity
- camera/subject/environment motion
- protected canon/mystery constraints

It excludes:

- runtime system prompts
- private memories
- avatar prompts
- unrelated cast
- unrelated lore
- provider credentials

## Prompt compiler

`buildMotionPrompt()` is deterministic and versioned.

Output:

- prompt
- negativeConstraints
- promptVersion = 1.0
- SHA-256 promptChecksum

Explicit negative constraints cover:

- character identity/face/body/costume drift
- extra or missing characters
- identity swaps
- location drift
- unexplained props
- text/captions/subtitles/logos/watermarks/UI
- unintended cuts
- invented story actions
- canon contradiction
- premature mystery reveals

Creator-derived strings are serialized as subject data and explicitly treated as non-executable provider instructions.

Plaintext prompts are not stored in PostgreSQL.

## Durable data

Tables:

- `public.motion_plans`
- `public.motion_clip_generations`

Plan statuses:

- DRAFT
- GENERATING
- READY
- PARTIAL
- FAILED
- ARCHIVED

Clip statuses:

- PENDING
- GENERATING
- COMPLETED
- FAILED
- SKIPPED

INITIAL identity:

`UNIQUE(animatic_id, version)`

Plan + every clip row are created atomically through:

`create_motion_plan_with_jobs(...)`

HTTP 202 is returned only after durable database acceptance.

## Job recovery

Workers claim with:

- `FOR UPDATE SKIP LOCKED`
- claim token
- attempt ID
- lease expiration

Current motion lease:

- initial lease: 900 seconds
- heartbeat: every 120 seconds
- worker provider abort: 8 minutes
- internal route maxDuration: 780 seconds

Runway task identity is stored as:

`provider_task_id`

This contains no prompt or credential.

If a process dies after the provider task ID has been persisted:

1. the database lease expires;
2. a new claim is issued;
3. the new worker retrieves the same provider task;
4. no second provider generation is launched.

If a provider poll times out/transiently fails while a provider task exists, the worker shortens the lease and returns `DEFERRED` so a later worker can resume.

### Residual exactly-once limitation

There is an unavoidable narrow external-system window:

```text
Runway accepts create request
    ↓
process dies
    ↓
before provider_task_id is persisted
```

Runway documentation does not currently expose a documented client-supplied idempotency key for image-to-video task creation.

Therefore the system provides strong database idempotency and provider-task resume once the task ID is recorded, but cannot mathematically guarantee provider-side exactly-once charging across that specific crash window.

This is documented rather than hidden.

## Storage

Bucket:

`motion-clips`

Attempt path:

```text
users/{creatorId}/motion-plans/{motionPlanId}/clips/{motionClipId}/{attemptId}.mp4
```

Runway output URLs are not surfaced to users because the official documentation states they are ephemeral.

The worker downloads the provider result and persists it to Supabase Storage before marking the clip completed.

Stale uploaded attempts are deleted if claim-token completion is rejected.

## Provider output

Runway task status is polled through:

`GET /v1/tasks/{taskId}`

Polling is at least six seconds apart.

Official guidance recommends five seconds or more, with backoff/jitter for failures.

Terminal provider success returns one or more output URLs.

Motion v1 uses the first output.

## Quality validation

Provider output cannot be semantically proven correct by TypeScript.

Motion v1 therefore separates:

`MotionQualityValidator`

from structural schema validation.

Initial:

`TechnicalMotionQualityValidator`

checks:

- video MIME
- non-empty payload
- expected 1280x720 transport dimensions
- positive provider duration
- valid Animatic target metadata

It intentionally does not claim to verify:

- face identity
- costume continuity
- subject count
- location continuity
- mystery leakage

The interface is the extension point for a future visual-consistency evaluator.

## Public API

Create/reuse:

`POST .../animatics/[animaticId]/motion/generate`

Body:

```json
{ "mode": "INITIAL" }
```

Status:

`GET .../motion/[motionPlanId]`

Retry:

`POST .../motion/[motionPlanId]/clips/[motionClipId]/retry`

Status responses never include:

- raw prompt
- prompt checksum
- claim token
- lease data
- provider task ID
- provider credentials

## Worker

Vercel Cron:

`/api/internal/motion-jobs/process`

requires:

`Authorization: Bearer $CRON_SECRET`

One invocation claims one motion clip.

The worker:

1. validates current claim;
2. reloads durable parent chain;
3. reconstructs MotionGenerationSpec;
4. recompiles prompt;
5. verifies checksum + provider duration;
6. resumes or creates Runway task;
7. renews DB lease;
8. downloads provider output;
9. runs technical quality validation;
10. uploads attempt-specific asset;
11. completes under claim token;
12. cleans stale uploads if completion is rejected.

## Retry semantics

Explicit creator retry applies only to FAILED clips.

Max explicit retries:

3

Retry:

- preserves MotionPlan clip identity
- preserves sequence
- preserves Animatic target duration
- clears previous provider task ID
- creates a new generation attempt
- does not touch successful clips

Transport recovery for the same provider task does not increment `retry_count`.

## Motion Workspace

Animatic now exposes:

- Generate Motion
- Open Motion

Motion Workspace shows:

- overall resolved progress
- current clip
- source still for unresolved/SKIPPED clips
- generated video for completed clips
- target duration
- human generation state
- per-failed-clip retry

Human states:

- Waiting
- Animating…
- Ready
- Needs retry
- Held as still

Playback supports completed generated clips, with SKIPPED clips falling back to their Storyboard still.

Next CTA:

`Assemble Episode`

remains disabled.

## Canon safety

Motion Generation never mutates:

- SeriesBlueprint
- SceneBlueprint
- SceneScript
- VisualPlan
- StoryboardBlueprint
- Storyboard assets
- AnimaticTimeline
- canon
- proposedCanonChanges

Generated videos are derivative assets only.

## Deployment

Apply:

`supabase/migrations/20260928070000_create_motion_generation.sql`

Required server-only variables:

- `SUPABASE_SERVICE_ROLE_KEY`
- `RUNWAYML_API_SECRET`
- `CRON_SECRET`

Optional:

- `RUNWAY_MOTION_MODEL=gen4.5`

No audio or final Episode Assembly dependency is introduced.
