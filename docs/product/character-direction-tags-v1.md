# Character direction tags v1

## Creator experience

Open the show-creation page, expand **Main character direction · optional**, and choose up to three personality traits plus optional single choices for body build, clothing, voice texture, delivery, and pace. Unselected fields mean the story can suggest a direction. The reviewed show displays the selected choices. **Save and open Studio** persists them inside the protagonist's validated blueprint. Cast details display saved tags read-only.

This first slice configures a protagonist while making a new show. It does not edit an existing cast member or silently update older designs, scenes, audio, approved references, or production versions. Specific traits outside the bounded catalog can still be described in the show idea; only supported IDs become structured tag metadata.

## Tag contracts

| Group | Choices | Cardinality | Consumer |
| --- | --- | --- | --- |
| Personality | Compassionate, Guarded, Analytical, Impulsive, Playful, Resolute | 0–3 distinct | Show direction, future scene and script context |
| Body build | Slim, Athletic, Muscular, Broad, Stocky | 0–1 | Show direction and production-frame canonical visual constraints |
| Clothing | Practical, Travel-worn, Tailored, Armored | 0–1 | Show direction and production-frame canonical visual constraints |
| Voice texture | Warm, Clear, Raspy, Airy | 0–1 | Show direction and speech-delivery instructions |
| Voice delivery | Calm, Animated, Firm | 0–1 | Show direction, speaking style, and energy |
| Speaking pace | Measured, Brisk | 0–1 | Show direction and speech-delivery instructions |

Example: **Compassionate + Guarded / Athletic / Travel-worn / Warm / Calm / Measured**. Compassionate and guarded can coexist: the character helps people while protecting their own feelings. Multiple body builds or multiple voice deliveries are not selectable together. Tags guide generation without replacing goals, flaws, relationships, canon, or approved references.

IDs are stable and allowlisted. The catalog maps IDs to bounded descriptive guidance instead of interpolating arbitrary user-authored tags as instructions. Do not silently change the meaning of an existing ID; add a new ID when a materially different behavior is needed. No arbitrary numerical strength or fictional provider capability is exposed.

## Persistence and generation

`SeriesIdeaRequestSchema` accepts optional `protagonistDirection`. The generation provider receives its compiled guidance. The server validates the original strict SeriesBlueprint output before attaching the creator's exact selections to the unique protagonist. A model cannot author `generationDirection` metadata in its output. The client rejects a successful-looking response that loses the requested choices.

The persisted SeriesBlueprint schema accepts optional `cast[].generationDirection`; existing untagged blueprints validate unchanged. Storage uses the existing owner-scoped series creation/save/read flow with no migration or new table. Account-scoped draft recovery preserves selections, and old draft records without the field remain readable. New tagged records require the new consumers, so deploy the schema and consuming paths together instead of writing tagged records with an older build.

Scene preparation receives personality guidance. Script preparation receives independently compiled personality, visual, and voice guidance. Production-frame compilation adds body/clothing descriptions to canonical identity constraints while preserving source records and reference requirements. No tags waive reference approval or enable an unsupported inference model.

Voice casting keeps the existing deterministic built-in voice ID. Explicit voice delivery overrides the inferred delivery style and energy; texture and pace compile into speech instructions. All voice-tag combinations fit the existing persisted speaking-style bound. Body/clothing selections do not change voice identity or delivery. Exact script dialogue remains protected by the existing speech compiler. Texture is a delivery direction, not voice cloning or a guaranteed match to a particular timbre. Actual speech depends on an operational configured provider and job pipeline.

## Validation

Local verification passed: TypeScript, production build, 1,099 JavaScript tests, 94 visual-evaluation tests, and 130 visual-inference tests. A production HTTP smoke returned 200 and included all tag-control headings. This checks server rendering, not browser interaction or a live authenticated save/model call.

Tests cover allowlisted/unknown fields, duplicate and excessive personality choices, singleton conflicts, distinct compilation domains, exact protagonist association, model-authored metadata rejection, persistence validation with old/new records, scene/script inputs, visual canonical constraints, voice instruction propagation, all voice combinations against the persisted schema, exact dialogue protection, appearance-independent voice behavior, UI bounds, draft recovery, reviewed save payloads, and lost-tag response rejection.

Browser and live authenticated/model validation remain separate from unit tests. The earlier Chromium download attempt failed in this workspace; no successful browser or paid generation run is claimed here.

## [SELF-PROMPT]: Reviewable per-character direction editing

Act as a principal character-production architect and senior Next.js/Supabase engineer. Inspect current main, open PRs, repository instructions, CI, character-direction tags v1, series persistence/RLS, revision semantics, approved reference association, and downstream scene/media lineage. Implement one isolated review-and-apply flow for changing an existing cast member's structured direction.

Require creator ownership, series/character association, allowlisted tags, expected revision, explicit review, and atomic conflict detection. Never treat title/status updateSeriesRecord as a blueprint-write API. Determine how the revised character affects canonical descriptions and which existing references or production records need review. Preserve old immutable assets and historical lineage. Show affected work before applying, and confirm success only after persistence. A visual identity change must not quietly reuse a conflicting approved reference as though it matched the new direction.

Use an existing validated revision boundary if one exists. If it does not, build the smallest defensible boundary first, without broad conversational editing. Handle stale revisions, save retries, account changes, failed saves, refresh, and invalid association. Keep voice identity selection separate from delivery direction and never infer voice from appearance. Run relevant tests, TypeScript, build, browser/mobile checks when available, and database validation where persistence changes require it. Open a bounded draft PR without merging; distinguish mock, browser, database, and paid-provider evidence. Finish with the next copy-ready self-prompt.
