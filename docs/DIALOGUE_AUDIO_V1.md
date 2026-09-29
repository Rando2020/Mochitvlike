# Dialogue Audio v1

## Boundary

Dialogue Audio v1 adds character voice casting and durable per-line speech generation on top of a READY Episode Assembly.

It does not add:

- lip sync
- mouth animation
- music
- sound effects
- ambience
- Foley
- mastering
- final episode export
- new visual generation
- Motion regeneration
- automatic canon mutation

Pipeline:

```text
EpisodeTimeline
    ↓
VoiceCast
    ↓
DialogueAudioPlan
    ↓
durable per-line TTS jobs
    ↓
dialogue audio assets
    ↓
Dialogue Audio Workspace
    ↓
future Lip Sync
    ↓
future Sound / Music
    ↓
future Mastering
```

Visual timing remains authoritative.

Dialogue generation never rewrites Script dialogue.

Speech that does not fit its visual window produces a warning instead of silently retiming the Episode.

## Provider selection

v1 uses OpenAI `gpt-4o-mini-tts` through:

`POST /v1/audio/speech`

Official documentation:

- https://developers.openai.com/api/docs/guides/text-to-speech
- https://developers.openai.com/api/reference/typescript/resources/audio
- https://developers.openai.com/api/reference/cli/resources/audio/subresources/speech/methods/create

Current built-in voices used by the registry:

- alloy
- ash
- ballad
- coral
- echo
- fable
- nova
- onyx
- sage
- shimmer
- verse
- marin
- cedar

OpenAI documents style instructions for `gpt-4o-mini-tts`, streaming speech output, multiple languages, and MP3/Opus/AAC/FLAC/WAV/PCM formats.

v1 requests WAV because WAV provides deterministic duration/sample-rate/channel inspection without introducing FFmpeg or a decoder dependency.

Required:

`OPENAI_API_KEY`

Optional:

`OPENAI_TTS_MODEL=gpt-4o-mini-tts`

## AI voice disclosure

OpenAI's TTS documentation requires clear disclosure that the listener is hearing an AI-generated voice.

The status API and Dialogue Audio Workspace therefore display:

`Voices in this preview are AI-generated.`

## Commercial / data boundary

OpenAI's current services agreement governs API use for businesses/developers.

Current terms state that, as between the customer and OpenAI and to the extent permitted by law, the customer retains rights in Input and owns Output.

OpenAI's current business-data documentation states API/business inputs and outputs are not used to train or improve models by default.

Product/legal review is still required for the application's own end-user content rights, actor/voice rights, local law, distribution terms, and any future custom/cloned voice workflows.

v1 does not implement cloned voices.

## Voice selection

Voice selection is deterministic and bounded.

It uses:

- character ID for stable built-in voice distribution
- story role
- story function
- personality traits
- communication style

It does not use:

- race
- ethnicity
- visual appearance
- inferred gender from appearance
- celebrity likeness
- real-person imitation instructions

Voice IDs are selected only from the controlled built-in registry.

Style guidance is separate from spoken dialogue.

## VoiceCast

`VoiceCast` stores:

- Series
- Episode Assembly
- version
- one assignment per speaking character
- provider
- provider voice ID
- display name
- safe style metadata
- AUTO_SELECTED / CREATOR_SELECTED
- confidence / assumptions

Non-speaking cast members are excluded.

Provider credentials are never stored.

## Exact dialogue invariant

Every line originates from EpisodeTimeline dialogue cues and is checked against the original durable SceneScript again inside the worker.

The exact string is SHA-256 hashed.

Before provider work the worker requires:

```text
DialogueAudioPlan text
    ==
EpisodeTimeline cue text
    ==
SceneScript DIALOGUE block text
```

and:

```text
SHA256(text)
    ==
generation row text_checksum
```

Mismatch:

`DIALOGUE_TEXT_MISMATCH`

The provider is not called.

No paraphrasing, filler words, improvised interjections, translations, or extra dialogue are permitted by the application contract.

## DialogueAudioPlan

Each line contains:

- line ID
- Script block ID
- character ID
- exact text
- text checksum
- Episode-global start
- visual window
- voice assignment
- generation state
- audio asset
- natural duration
- duration difference
- timing fit

Mutable generation state is materialized from generation rows; immutable plan content remains versioned JSON.

## Speech instruction compiler

`compileSpeechInstructions()` is deterministic and versioned.

It returns:

- instructions
- version = 1.0
- SHA-256 checksum

Instructions explicitly tell the speech model to speak the supplied input exactly and prohibit additions/removals/paraphrases.

Creator-derived style fields are serialized as performance guidance and may not modify:

- spoken text
- provider credentials
- storage behavior
- application policy

The generation table stores only the instruction checksum/version, not full instructions.

## Timing fit

Visual timing never changes.

After WAV generation:

```text
difference =
natural speech duration
-
visual dialogue window
```

Classification:

`VERY_SHORT`
when natural duration is less than 55% of the visual window.

`TOO_LONG`
when natural duration exceeds the visual window by more than 0.25 seconds.

Otherwise:

`FITS`

Example:

```text
visual window  2.8s
speech         3.4s
difference    +0.6s
fit            TOO_LONG
```

The UI surfaces:

`Runs 0.6s long`

The Episode is not retimed.

## Persistence

Tables:

- `public.voice_casts`
- `public.dialogue_audio_plans`
- `public.dialogue_audio_generations`

VoiceCast and DialogueAudioPlan are versioned by Episode Assembly.

Generation rows store:

- line identity
- Script block
- character
- creator
- provider/model
- provider voice ID
- instruction checksum/version
- text checksum
- Episode timing metadata
- generation status
- attempt ID
- claim token
- lease
- retry count
- sanitized error
- durable audio metadata
- timing-fit metadata
- timestamps

They do not store API credentials.

## Atomic creation

`create_dialogue_audio_plan(...)`

atomically creates:

1. VoiceCast
2. DialogueAudioPlan
3. every initial line job

HTTP 202 is returned only after this transaction succeeds.

Repeated INITIAL reuses v1.

## Durable jobs

Statuses:

- PENDING
- GENERATING
- COMPLETED
- FAILED

Plan statuses:

- GENERATING
- READY
- PARTIAL
- FAILED
- ARCHIVED

Claiming uses:

- FOR UPDATE SKIP LOCKED
- claim token
- attempt ID
- lease expiry

Current worker policy:

- initial lease: 180 seconds
- heartbeat: 45 seconds
- provider abort: 60 seconds

Only the current claim may complete or fail a line.

## External exactly-once limitation

The OpenAI speech documentation reviewed for v1 does not document a client-supplied idempotency key for `/audio/speech`.

There is therefore a narrow external-provider window:

```text
OpenAI returns generated WAV
    ↓
worker process terminates
    ↓
before durable upload/completion
```

A later worker may need to call speech generation again.

The database guarantees claim ownership and prevents stale workers from committing, but v1 does not claim mathematically exact provider-side once-only billing across that external crash window.

## Storage

Bucket:

`dialogue-audio`

Attempt path:

```text
users/{creatorId}/dialogue-plans/{planId}/lines/{lineId}/{attemptId}.wav
```

Attempts never overwrite one another.

If completion is rejected because ownership became stale, the uploaded attempt is removed.

## Worker

Internal route:

`/api/internal/dialogue-audio-jobs/process`

Authentication:

`Authorization: Bearer $CRON_SECRET`

Worker sequence:

```text
claim durable line
    ↓
verify current claim
    ↓
load DialogueAudioPlan
    ↓
load VoiceCast
    ↓
load EpisodeTimeline
    ↓
load original SceneScript
    ↓
verify exact text + checksum
    ↓
compile bounded speech instruction
    ↓
verify instruction checksum
    ↓
OpenAI speech generation
    ↓
WAV technical validation
    ↓
measure duration
    ↓
classify timing fit
    ↓
attempt-specific Storage upload
    ↓
claim-token completion
```

## Failure mapping

Sanitized codes include:

- TTS_PROVIDER_TIMEOUT
- TTS_GENERATION_DECLINED
- INVALID_TTS_RESPONSE
- DIALOGUE_AUDIO_STORAGE_FAILED
- VOICE_ASSIGNMENT_INVALID
- DIALOGUE_TEXT_MISMATCH
- INTERNAL_TRANSIENT

No stack traces, provider response bodies, secrets, or full speech instructions are persisted.

## Retry

Only FAILED lines retry.

Maximum explicit retries:

3

Retry preserves:

- Script block ID
- character ID
- exact text checksum
- Episode start
- visual window
- voice assignment

Successful lines are not regenerated.

## API

Create/reuse:

`POST /api/series/[seriesId]/episodes/episodeOne/assemblies/[assemblyId]/dialogue/generate`

Body:

```json
{ "mode": "INITIAL" }
```

Status:

`GET .../dialogue/[dialoguePlanId]`

Retry:

`POST .../dialogue/[dialoguePlanId]/lines/[lineId]/retry`

Status responses do not expose:

- claim tokens
- leases
- provider API keys
- service role
- internal queue data
- full private speech instructions

## Dialogue Audio Workspace

Episode Assembly now exposes:

- Add Voices
- Open Voices

Dialogue Audio Workspace includes:

- unchanged Episode visual playback
- generated dialogue synchronized to the Episode clock
- Play / Pause
- global seek
- Mute dialogue
- Show dialogue
- Voice Cast strip
- current built-in voice
- sample playback using an already-generated character line
- exact dialogue timeline
- Episode timestamp
- visual window
- natural speech duration
- timing fit
- per-failed-line retry

Human statuses:

- Waiting
- Voicing…
- Ready
- Needs retry
- Runs long

Voice changing remains intentionally bounded: v1 does not silently regenerate every character line.

Next CTA:

`Add Sound`

remains disabled.

## No lip sync

Generated audio never changes:

- video frames
- mouth shapes
- Motion assets
- Episode clip timing
- Episode duration

Lip sync remains a separate future layer.

## Quality boundary

`DialogueAudioQualityValidator` is provider-neutral.

Initial technical checks cover:

- WAV MIME
- non-empty payload
- positive duration
- sample rate
- channel count

It does not claim to prove:

- acting quality
- emotional correctness
- accent authenticity
- naturalness

Those remain future perceptual review concerns.

## Deployment

Apply:

`supabase/migrations/20260929140000_create_dialogue_audio.sql`

Required server-only variables:

- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `CRON_SECRET`

Optional:

- `OPENAI_TTS_MODEL=gpt-4o-mini-tts`
