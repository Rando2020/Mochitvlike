# Sound Design + Music v1

## Boundary

Sound Design + Music v1 adds a coherent non-dialogue audio layer on top of a durable Episode Assembly and Dialogue Audio Plan.

It adds:

- instrumental background music
- ambience
- sound effects
- Foley
- intentional silence
- preview ducking/mix metadata

It does not add:

- lip sync
- mouth animation
- re-animation
- new visual generation
- Motion regeneration
- dialogue rewriting
- final mastering
- final export
- Episode 2
- arbitrary commercial music uploads
- voice cloning

Pipeline:

```text
EpisodeTimeline
    +
DialogueAudioPlan
    +
Series Creative DNA
    ↓
Sound Design Compiler
    ↓
SoundDesignPlan
    ├── MUSIC
    ├── AMBIENCE
    ├── SFX
    ├── FOLEY
    └── SILENCE
    ↓
library resolution / durable generation jobs
    ↓
audio assets
    ↓
EpisodeMixTimeline
    ↓
Episode Sound Workspace
    ↓
future Mix / Master
    ↓
future Final Export
```

Episode duration remains authoritative.

Dialogue is never rewritten or retimed.

Sound cues never create new story events.

## Provider research / v1 selection

v1 uses ElevenLabs behind provider-neutral interfaces.

### Music

Provider:

`ElevenLabsMusicProvider`

Default model:

`music_v2_5`

Endpoint:

`POST https://api.elevenlabs.io/v1/music`

v1 requests:

- instrumental output
- explicit duration
- MP3 output
- no inpainting persistence

Official docs reviewed during implementation:

- https://elevenlabs.io/docs/overview/capabilities/music
- https://elevenlabs.io/docs/api-reference/music/compose
- https://elevenlabs.io/docs/eleven-api/guides/cookbooks/music/
- https://elevenlabs.io/music-terms
- https://elevenlabs.io/music-api-terms
- https://elevenlabs.io/eleven-music-model-specific-terms

Eleven Music currently documents API access, instrumental generation, duration control, MP3/WAV availability, and broad commercial use subject to plan-specific Music Terms.

This application must not interpret "commercial use" as unrestricted.

The deployed ElevenLabs plan must permit the application's actual distribution context.

Current Music Terms prohibit prompt inputs including artist names, songwriter names, song titles, album titles, labels, publishers, and substantial recognizable copyrighted lyrics.

### Artist-imitation boundary

Raw creator `musicDirection` never reaches Eleven Music directly.

The application extracts a controlled vocabulary such as:

- orchestral
- ambient
- electronic
- synth
- piano
- strings
- cinematic
- tense
- melancholic
- playful
- mysterious

The final provider prompt explicitly requires:

- instrumental background underscore
- no vocals
- no lyrics
- no artist imitation
- no song imitation
- no recognizable copyrighted melody

This is a product guardrail in addition to provider-side copyrighted-material checks.

### Sound effects / Foley / ambience

Provider:

`ElevenLabsSoundEffectProvider`

Default model:

`eleven_text_to_sound_v2`

Endpoint:

`POST https://api.elevenlabs.io/v1/sound-generation`

Official docs reviewed:

- https://elevenlabs.io/docs/overview/capabilities/sound-effects
- https://elevenlabs.io/docs/api-reference/text-to-sound-effects/convert
- https://elevenlabs.io/docs/eleven-api/guides/cookbooks/sound-effects/

Current API controls include:

- prompt
- duration
- prompt influence
- looping
- sound-effects v2 model

Duration is bounded to the provider's documented generation limits.

Looping is used only for ambience that the editorial plan explicitly marks loopable.

## Library-first SFX boundary

Generic reusable sounds should not automatically incur generation cost.

`SoundLibraryProvider`

is provider-neutral.

v1 includes:

`EnvironmentSoundLibraryProvider`

It reads an optional server-side:

`SOUND_LIBRARY_MANIFEST_JSON`

A library asset is only used when a configured manifest entry exactly matches:

- cue type
- canonical controlled cue label

If no asset is configured, the resolver returns null.

It never fabricates an asset URL.

Examples of appropriate future library entries:

- door close
- footsteps
- cloth movement
- rain
- wind
- room tone

## Sound compiler

The compiler is deterministic and bounded.

Authoritative inputs:

- SeriesBlueprint.creativeDNA.sound
- SeriesBlueprint.creativeDNA.tone
- SceneBlueprint
- SceneScript
- VisualPlan
- EpisodeTimeline
- DialogueAudioPlan

It may create:

- Scene-level music
- established-environment ambience
- explicit-action SFX
- explicit-action Foley
- Script-PAUSE silence
- dialogue ducking metadata

It does not infer unseen actions.

### SFX/Foley whitelist

v1 only emits physical-event cues when an authoritative ACTION Script block contains a controlled recognized event.

Examples include:

- door opens/closes
- glass shatters
- sword impact
- explosion
- thunder
- punch/kick impact
- footsteps
- cloth movement

Every such cue points back to the exact Script block ID.

If an event is not supported by an existing Script ACTION block, the compiler does not create it.

## Source references

Cue source references may identify:

- SERIES_SOUND
- SCENE
- SCRIPT_BLOCK
- VISUAL_BEAT
- LOCATION
- DIALOGUE_LINE

Validation rejects invalid Scene, Script, VisualBeat, or Dialogue references.

## Intentional silence

Silence is first-class editorial data.

v1 creates a SILENCE cue only when an authoritative SceneScript PAUSE exists.

A SilenceCue includes:

- Episode-global start
- duration
- Script block source
- story purpose
- reason

The compiler does not try to maximize audio density.

Music/SFX overlap with explicit silence becomes an editorial warning instead of being silently hidden.

## Timing

EpisodeTimeline is the source of truth.

No sound may:

- extend Episode duration
- shift visual clips
- shift dialogue
- change Script
- change Motion

All sound cue timing is Episode-global.

Generated/provider assets are non-destructively used within cue windows.

The underlying provider file is never destructively edited.

### Generated duration metadata

v1 provider adapters use duration-bounded generation requests and persist:

`durationSource = REQUESTED`

The v1 server does not decode MP3 files to independently measure exact sample duration.

This is intentional to avoid introducing FFmpeg solely for metadata extraction.

The quality layer therefore verifies:

- non-empty bytes
- expected audio MIME
- positive bounded duration metadata

It does not claim exact decoded-duration verification.

Future mastering/export should decode real media duration before final output.

## Ambience loops

Ambience may be marked loopable.

For long ambience windows, provider generation is bounded to a maximum source duration and playback may intentionally loop it across the Episode cue.

Non-loopable short assets are not silently looped.

The status layer warns when a non-loopable asset is shorter than the editorial window.

## Dialogue ducking

Dialogue files remain unchanged.

Preview metadata uses:

Music normal:
`-12 dB`

Music under dialogue:
`-22 dB`

Ambience normal:
`-24 dB`

Ambience under dialogue:
`-30 dB`

Effects default:
`-8 dB`

Ducking is playback metadata only.

No destructive gain processing occurs in v1.

## EpisodeMixTimeline

Preview-only tracks:

- Dialogue
- Music
- Ambience
- Effects

Each clip contains:

- Episode-global start
- editorial duration
- normal gain
- optional ducked gain
- loop flag
- safe asset URL

The master preview gain is metadata only.

No final mixed file is created.

## Persistence

Tables:

- `public.sound_design_plans`
- `public.sound_audio_generations`

Plan statuses:

- DRAFT
- GENERATING
- READY
- PARTIAL
- FAILED
- ARCHIVED

Cue generation statuses:

- PENDING
- GENERATING
- COMPLETED
- FAILED
- SKIPPED
- LIBRARY

Plan version identity:

`UNIQUE(episode_assembly_id, version)`

INITIAL creates/reuses v1.

## Atomic creation

`create_sound_design_plan(...)`

atomically creates:

1. SoundDesignPlan
2. every audible cue generation/library row

SILENCE requires no asset job.

HTTP acceptance occurs only after durable persistence succeeds.

## Durable jobs

Sound generation reuses the repo's existing durable pattern:

- FOR UPDATE SKIP LOCKED
- claim token
- attempt ID
- lease
- heartbeat
- stale takeover
- bounded explicit retry
- attempt-specific Storage path

Current settings:

- lease: 180 seconds
- heartbeat: 45 seconds
- provider timeout: 90 seconds

Only the current claim may complete or fail a cue.

A stale worker may not commit.

A stale uploaded attempt is removed.

## External exactly-once limitation

The Eleven Music and Sound Effects APIs reviewed for v1 do not provide an application-level exactly-once billing guarantee tied to our PostgreSQL claim token.

There remains a narrow external crash window:

```text
provider successfully generates audio
    ↓
worker dies before durable application completion
    ↓
lease expires
    ↓
replacement worker may generate again
```

PostgreSQL remains the source of truth and prevents stale commits.

The app does not claim provider-side exactly-once charging.

## Failure mapping

Sanitized codes include:

- SOUND_PROVIDER_TIMEOUT
- SOUND_GENERATION_DECLINED
- INVALID_SOUND_RESPONSE
- SOUND_STORAGE_FAILED
- SOUND_SPEC_MISMATCH
- INTERNAL_TRANSIENT

Never persist:

- API credentials
- raw provider responses
- claim tokens in public responses
- private arbitrary source prompts

## Storage

Bucket:

`episode-sound`

Attempt path:

```text
users/{creatorId}/sound-plans/{planId}/cues/{cueId}/{attemptId}.mp3
```

Attempts never overwrite each other.

Library assets retain their own configured safe URL/path.

## APIs

Create/reuse:

`POST /api/series/[seriesId]/episodes/episodeOne/assemblies/[assemblyId]/dialogue/[dialoguePlanId]/sound/generate`

Body:

```json
{ "mode": "INITIAL" }
```

Sound creation requires Dialogue Audio to be sufficiently resolved.

Status:

`GET .../sound/[soundPlanId]`

Retry:

`POST .../sound/[soundPlanId]/cues/[cueId]/retry`

Status responses do not expose:

- claim tokens
- leases
- service-role credentials
- ElevenLabs API key
- private provider internals

## Episode Sound Workspace

The Dialogue Audio Workspace exposes:

- Add Sound
- Open Sound

Episode Sound Workspace includes:

- unchanged Episode visual playback
- generated Dialogue playback
- Music playback
- Ambience playback
- SFX/Foley playback
- global Episode seek
- Mute Dialogue
- Mute Music
- Mute Ambience
- Mute Effects
- four horizontal track lanes
- cue cards
- cue generation status
- retry controls
- intentional silence cards
- editorial warnings

Next CTA:

`Mix & Master`

remains disabled.

## Quality boundary

Provider-neutral interfaces:

- MusicQualityValidator
- SoundEffectQualityValidator

v1 verifies technical transport-level properties only.

It does not claim to prove:

- musical quality
- emotional appropriateness
- mix quality
- cinematic quality
- exact decoded MP3 duration

Those require future perceptual QA/mastering infrastructure.

## Security

Required server-only secret for providers:

`ELEVENLABS_API_KEY`

Optional:

`ELEVENLABS_MUSIC_MODEL=music_v2_5`

`ELEVENLABS_SOUND_MODEL=eleven_text_to_sound_v2`

Optional reusable library manifest:

`SOUND_LIBRARY_MANIFEST_JSON`

Existing server-only:

- SUPABASE_SERVICE_ROLE_KEY
- CRON_SECRET

Browser clients have SELECT-only RLS access to owned Sound plans/jobs.

Writes occur through server-owned creation/worker RPCs or bounded authenticated retry RPC.

## Deployment

Apply:

`supabase/migrations/20260930130000_create_sound_design.sql`

Add the sound worker cron:

`/api/internal/sound-jobs/process`

## Future dependency

The next layer should be:

`Mix / Master + Final Episode Export v1`

That layer should:

- decode actual media duration
- perform deterministic audio mixing
- apply final loudness/limiting policies
- render a final audio mix
- combine it with the unchanged Episode visual timeline
- preserve the canonical EpisodeTimeline/SoundDesignPlan as source of truth
- produce a durable export artifact

Lip sync should remain a separate optional enhancement rather than becoming a prerequisite for final export.
