# Shared creator storytelling assistant — reconstructed candidate

## Intent and authorization
The user approved a creator-only, suggestions-only assistant grounded in the existing saved owned bible and saved story seeds, and subsequently approved publication as a draft PR only. The prior local-only implementation was lost when its execution workspace was replaced. This is a reconstructed NEW candidate; prior review/test evidence does not transfer.

## Architecture and scope
Reuse `series` and `story_seed_plans`, with no second bible, new database schema or automatic writes. An authenticated read-only creator endpoint derives a bounded context snapshot with source IDs, full saved-source digests, blueprint timestamp, seed revision, selected episode beats, genre, tone, story engine, character motivations, world constraints, canon and private mysteries. All required context is included or the request fails; no silent truncation. Empty saved seeds differ from unavailable storage. Locked seeds and outlines are planning intentions, not established canon.

A reusable accessible panel is available in owned Studio and Story Seeds, with explicit saved/unsaved inclusion, selected-beat focus and source inspection. Existing scripted Director/Rehearse/Fan chat remains disconnected to prevent creator-private context reuse. Server re-reads and client request epochs/aborts invalidate stale suggestions on saved revisions, same-series bible changes, selection, focus, refresh and A→B→A navigation. No suggestions are displayed before a matching fresh snapshot is verified.

The real OpenAI Responses adapter receives an injected SDK transport. It uses fixed instructions separate from untrusted serialized story data, strict structured output, source-reference validation, store:false, no tools, bounded input/output, zero retries and a short timeout. Suggestions explain fit, setup and consequences, with a meaningful alternative, not a mandatory formula. Fixture tests cannot establish expert storytelling quality.

Runtime admission stays hard-closed. No environment flag alone activates generation. Live activation requires separately approved total text budget, durable admission/reservation and reviewed server-only client factory/route wiring. No paid calls, credential reading/creation, environment configuration, database mutations, merge or deployment are authorized here. No dependencies are added. Draft publication is allowed only after fresh independent review.

## Builder choices
Reuse existing TypeScript/Zod/React, authenticated Supabase/RLS reads, Vitest/Testing Library and npm lockfile. Keep old short source IDs readable; hash only percent-encoded IDs that would exceed bounded ID limits, using a collision-safe namespace. Lazy-load creator context when opened. Revalidate owner/archive status after request-body reading, before future provider admission. These choices preserve scope without building unrelated admission infrastructure.

## Verification
Recreate regression tests before implementation, run fresh full tests/typecheck/build, then freeze a new commit/tree for independent review. Verify owner isolation, unavailable seeds, untrusted content, strict model output, Unicode IDs, archive-during-upload, saved blueprint and seed invalidation, A→B→A races, and no writes/real provider calls. Document browser/live/model-quality acceptance not performed. Preserve a durable source bundle before publication.
