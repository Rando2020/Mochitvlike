# Guided Studio v1

Mochi's screenshots are a reference for how a creator is guided, not a requirement to reproduce its interface or economy.

## Product objective

A creator should know what to do next, why it helps the story, and what the action will produce. Canonical saved data remains the source of truth.

## Implemented first slice

The Studio dashboard offers one recommended action, alongside an escape to choose another scene:

- Follow Episode 1 beat order.
- Open the earliest saved draft before proposing later work.
- Develop the earliest missing scene when earlier scenes are ready.
- When all scenes are ready, review the episode's story. Do not claim it is rendered or exported.
- Count only active scenes associated with current beats, deduplicated by latest update with a deterministic ID tie-breaker.
- Keep preview exploration local rather than issuing generation requests against `demo`.
- Reuse the existing scene-generation endpoint and scene workspace.
- Disable generation controls while a request is pending and catch failed requests.

This recommendation knows scene-planning state only. It cannot infer script, storyboard, motion, dialogue, mix, or export readiness from a scene summary. Draft review and subsequent script writing happen in the existing scene workspace. The request guard is local to this mounted Studio, not cross-tab or server idempotency.

## Deliberately separate follow-on work

A useful conversational coauthor needs persisted conversation, validated change proposals, and a production-state summary. A text composer without these capabilities would imply functionality the system does not yet offer.

The existing clarification card also requires persisted answer handling: its optional callback is not wired by the current series page. It must not be treated as a completed story decision in downstream guidance.

No credit economy, community sharing, reference approval changes, GPU invocation, or new generation endpoint is included here.

## Verification

Local TypeScript and production build passed. All 1,066 JavaScript tests, 94 visual-evaluation tests, and 130 visual-inference tests passed. Guidance tests cover new projects, draft continuation, gaps, archived and unknown scenes, duplicate versions, ready plans, alternative navigation, saved-scene routing, request failure/duplicate protection, canonical request payloads, and demo exploration.

No authenticated live creator flow or generated media was exercised. Browser verification is recorded in the PR separately.

## [SELF-PROMPT]: Creator guidance with persisted story decisions

Act as a principal creator-experience product architect and senior Next.js/Supabase engineer. Treat Mochi's screenshots as evidence of interaction principles: one meaningful choice at a time, contextual actions, visible saved progress, and continued access to cast and scenes.

Perform one isolated task: implement persisted clarification decisions and make their UI honest, discoverable, and consistent after refresh.

Repository: Rando2020/Mochitvlike.

First inspect current main, open PRs, CI, repository instructions, and the guided-studio branch/PR. Do not assume this document's snapshot is current. Inspect SeriesBlueprint validation, ClarificationCard, the series page, updateSeries, creator ownership/RLS, revision and downstream lineage semantics, and existing tests before choosing the write contract. Inspect authentication PR #20 without merging it implicitly.

Problem to resolve: ClarificationCard currently exposes Yes/No/Help controls through an optional callback that the production series page does not wire. A creator must not be led to believe an answer was saved when it was not.

Requirements:
1. Derive the interaction from the actual question. Do not force every open question into yes/no.
2. Use an existing supported persistence contract where it fits. Acknowledging an answer must not imply that the blueprint has already incorporated it.
3. Preserve premise, IDs, references, immutable production assets, protected mysteries, creator ownership, and validated canonical state.
4. Determine explicitly whether a decision changes canonical blueprint fields. If so, implement a validated proposal/apply boundary with revision protection. Do not silently rewrite cast, world, or existing production lineage.
5. If the necessary canonical-edit contract is larger than this isolated task, make the clarification card informational and record the dependency instead of adding a pretend save action.
6. Show pending, saved, error, and conflict states only from real responses. Refresh must preserve saved decisions. Handle retries without duplicate application.
7. Keep the creator-facing language about the story. Do not display JSON, prompts, schema terminology, internal error codes, or infrastructure details.
8. Keep the scene guide grounded in persisted state. An unresolved optional question must not block scene work unless the existing contract demonstrates that it is required.
9. Test ownership, validation failure, stale revisions, reload persistence, duplicates, unsupported questions, and rejected edits where the selected implementation applies.
10. Run repository CI checks and verify mobile/desktop interaction in a browser. Report anything that cannot be exercised live.

Open a bounded PR and do not merge. Report implemented behavior, exact files, tests, remaining limitations, and one next dependency with a new copy-ready [SELF-PROMPT]. Do not build the full conversational agent, visual generation, monetization, social sharing, or a new production pipeline in this task.
