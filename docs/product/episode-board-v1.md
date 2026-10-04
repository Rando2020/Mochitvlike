# Episode board and series drawer v1

Implemented flow D from the creator UX proposal. This slice builds on PR #21, whose current-beat selection, deduplication, next-step recommendation, and shared request guard are reused. It does not depend on the home/login changes in PRs #23 or #24.

## Creator flow

Studio → Episode opens an ordered planning board. Each card shows the canonical beat, its story change, associated cast and location, and the newest active saved scene title when present. States are **Not planned**, **Draft plan**, and **Ready plan**. Ready is a scene-plan status, not a rendering or episode-readiness claim.

Saved cards open the actual scene workspace. Missing cards use the existing scene-generation endpoint with the canonical beat ID. Pending state is shared with the next-step guide and disables duplicate requests. Failure preserves the board and permits retry; the notice advises reloading if a plan was saved before a connection interruption. Demo mode is read-only.

**Your series** opens a read-only native modal dialog with canonical cast, locations, and visual direction. Background interaction is blocked by the browser's native dialog semantics. Opening locks body scroll; closing, Escape, and unmount restore it. Closing restores focus to the opening control and preserves the Episode tab. No reference images or sharing controls are invented.

## Design

[Episode board and drawer design fixture](../design/episode-board-v1.svg) shows the two surfaces and state hierarchy. Copy in this illustration is abridged example content, not a screenshot or canonical record. The implementation uses actual blueprint fields, never the illustration's labels. No new decorative raster assets are needed for this slice.

Mobile: one card per row, full-width bottom drawer, safe-area padding. At 720px: two cards per row and a right-side drawer. Cards use minmax(0, 1fr), wrapping copy, and flexible status rows for narrow screens and long titles. Actions have at least 44px targets and visible keyboard focus. No new motion is introduced.

## Validation and limits

Local validation passed: TypeScript, production build, 1,075 JavaScript tests, 94 visual-evaluation tests, and 130 visual-inference tests. The design SVG was rendered and inspected. Chromium installation failed with truncated downloads, so browser validation is pending. No live account, model, or media-generation calls were exercised.

The UI tests cover beat order, active/archived/unknown/duplicate selection, stage labels, missing context, real saved-scene routes, the selected beat request, duplicate prevention, failure recovery, demo behavior, drawer open/close/Escape, scroll restoration, empty locations, and focus restoration. JSDOM mocks only dialog lifecycle methods; it cannot prove native focus trapping, background inertness, or pixel geometry. Browser review at 320px, 390px, and desktop remains required if no browser runtime is available. No authenticated model or paid media generation is needed for these UI checks.

The existing server page supplies ownership-scoped series and scene summaries. This change adds no queries, write contracts, reordering, reference approval, media polling, or export capability. Archived plans are excluded from current progress; a history view is outside this slice.

## [SELF-PROMPT]: Character continuity view

Act as a principal character-production UX designer and senior Next.js engineer. Inspect current main, repository instructions, open PRs, CI, the episode board, cast details, character performance records, production reference association/read/approval routes, private image access, and immutable versions. Choose an isolated branch that includes only required dependencies; do not merge unrelated work.

Implement one bounded character continuity view using verified existing contracts: biography, visual concept, available movement and ability records, character-associated reference gallery, accessible image zoom, and navigation to the existing explicit reference review workflow. Derive character/reference association server-side with creator ownership and series scope. Show missing and candidate artwork honestly. Preserve rights checks, immutable approved versions, and historical production lineage. Do not generate or approve assets automatically, introduce sharing, or imply unsupported conditioning works.

If a scoped read or signed image access contract is absent, implement and test that small boundary first, or leave the gallery informational with a precise dependency. Avoid exposing another creator's assets or loading arbitrary remote URLs. Test ownership, association mismatches, absent/candidate/rejected/approved states, signed-access failures, zoom Escape/focus/scroll behavior, and narrow screens. Run relevant tests, typecheck, and build; distinguish mock validation from browser/live evidence. Open a bounded draft PR without merging. Finish with a concise outcome and a copy-ready self-prompt for the next required dependency.
