# Guided show creation v1

## Result

The home page is now a real creator entry point rather than redirecting to the production-disabled demo. It offers idea input, bounded optional format settings, generated direction review, revision, explicit save, and navigation to the actual saved Studio. Existing saved series are loaded using the authenticated creator's ownership scope.

This change is stacked on `fix/deployment-login-onboarding` (PR #20) because sign-in/account/session refresh are required. It does not merge that dependency or PRs #21/#22.

## Repository correction

The handoff and UX proposal described Show Genesis as already available. Inspection of current main found no `/api/series/generate` implementation or generation engine, despite the existing blueprint schema and persistence foundation. This task adds the missing authenticated, bounded generation endpoint and provider boundary. It uses the existing SeriesBlueprint schema and invariant validator, requires configured server-side provider/model settings, validates requested format, repairs once, and fails closed thereafter. No demo blueprint or fabricated provider output is substituted on errors.

## Creator experience

- Describe a show in 3–5,000 characters.
- Optional episode settings: 30–120 seconds and 8–20 episodes.
- Review title, logline, premise, protagonist want, central tension, and opening hook.
- Unresolved clarification questions are informational, with no pretend save buttons.
- Revise preserves the idea and does not persist the direction.
- Save sends the reviewed validated blueprint to the existing series persistence API.
- A confirmed saved UUID opens the real Studio. A save receipt supports reopening after refresh.
- Draft recovery uses account-scoped sessionStorage in the same browser tab. It is not cloud draft persistence and disappears when the tab's session ends. If storage is unavailable, the page says so.
- The account and login screens lead to the real home entry point.

## Retry semantics

The browser assigns a `creationId` UUID to the reviewed direction and retains it for retries. The existing series table's primary-key constraint prevents another row with that ID. A duplicate-ID save is reused only when the creator, validated blueprint, schema version, and generation source all match. Creator identity still comes from authenticated server state. Different content or a hidden/foreign row fails with a generic save error. Existing clients may omit creationId and retain prior behavior. No migration is required.

This is save idempotency, not cross-tab generation idempotency. Generation remains a bounded foreground request with pending controls. Provider SDK automatic retries are disabled. A repair can use a second provider call after invalid output.

## Visual design

Original generated decorative artwork: `public/design/story-spark-v1.webp`.

The optimized asset is 1200 × 800 and 136,474 bytes. It is a decorative illustration with empty alt text, independently rendered HTML copy, and dark overlays. It is never uploaded, approved, or associated as a canonical character/ability reference. The exact prompt is in `prompts/design/story-spark-v1.md`. Generated with the built-in image-generation tool; no CLI/API fallback was used.

Controls use existing dark surfaces and violet accents. Review fields use short readable panels. Mobile layout stacks at 600px with 44px-plus actions and 16px inputs. Visual browser verification remains required before release.

## Configuration and operational limits

Required for authentication/persistence: existing Supabase URL and anon-key settings and applied repository migrations.

Required for generation: server-side `OPENAI_API_KEY` and explicit `OPENAI_SERIES_MODEL`, or existing `OPENAI_SCENE_MODEL`. No model is silently guessed. Configure a model compatible with the existing Responses structured-output contract.

The provider request timeout is 120 seconds per attempt with one optional repair. The route's maxDuration is 300 seconds; actual hosting plan/runtime limits must support it. The UI shows connection/provider-unavailable states. No live model call, authenticated real database save, or cloud deployment was performed in this task.

## Validation

TypeScript and production build passed. All 1,086 JavaScript tests, 94 visual-evaluation tests, and 130 visual-inference tests passed locally.

New tests cover schema/invariants/format, one-repair bounds, provider failure, authenticated route access, no generation-side save, account-scoped recovery, review-before-save, input retention, pending click protection, identical-ID retry, UUID routing, and no reuse of changed/hidden content. A same-process production HTTP smoke confirmed the actual home page and optimized artwork return 200. Rendering/behavior tests use provider/database fixtures, not live services. Browser visual verification remains unavailable because the Chromium download failed in this environment.

## [SELF-PROMPT]: Episode board and contextual series drawer

Act as a principal mobile creator-experience designer and senior Next.js engineer.

Perform one isolated task: implement Flow D's planning-only episode board and accessible read-only series drawer.

Inspect current main, open PRs, CI, repository instructions, guided-show-creation and guided-next-step PRs, and the current UX specification. Choose a clear dependency branch without merging prior work implicitly. Treat the repository as authoritative over the handoff.

Inspect SeriesStudio, EpisodeHero, EpisodeBeatList, active-scene selectors, scene routing/generation, CastDetailSheet, location/style data, and actual persistence state.

Build a canonical-order board of scene-plan cards using real summaries. Show Not planned, Draft plan, and Ready plan as distinct states. Reuse the saved-state recommendation from PR #21. Exclude archived/unknown beats and deduplicate active scene versions. Provide a Your series drawer for cast, locations, and style without new generation or canonical edit controls. Focus, Escape, scroll lock, and focus restoration must work; on desktop use a bounded contextual panel if useful.

Route saved scenes to their actual workspace and missing scenes through the existing canonical endpoint. Protect pending/error handling. No drag reordering, fake thumbnails, fictitious render progress, montage previews, media generation, credit economy, or public sharing.

Test beat order, active-scene selection, recommendations, routing, request handling, archived behavior, accessible keyboard interactions, and responsive layouts at 320/390/430/1280/1440px. Run required repository CI checks. Verify a real browser if available; distinguish fixtures from authenticated live validation.

Open a bounded PR without merging. Report exact files, capability boundaries, validation, remaining blockers, and a new copy-ready self-prompt for the next dependency.


## Browser-first integration

The combined operations branch reconciles PR #23 and PR #24. `/` remains the launch/access page, `/create` hosts this guided flow, `/studio` lists saved shows, and `/system` retains server-verified owner checks. Production/preview database isolation is preserved for all clients and worker routes. Native PR #24 remains unmodified and unmerged.

Cloud smoke uses a labeled browser-intercepted direction fixture, then real cookie-authenticated persistence to a disposable Supabase instance. It tests provider-unavailable UI, draft reload, a save whose committed response is lost, retry using the same UUID, exactly one database row, reload, and mobile layout overflow. It does not claim live model generation, paid media generation, or production hosting readiness.
