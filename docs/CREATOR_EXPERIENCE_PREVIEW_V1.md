# Creator Experience Preview v1

Status: **concept UX and in-memory interaction**, not a production feature. The brand shown is explicitly a placeholder.

## Routes
- /creator-preview: public sample from the existing The Wounds We Keep demo blueprint.
- /series/[seriesId]/creator-preview: authenticated, owner-scoped read-only series load through the existing getSeries path. Not linked to a public share endpoint.
- Existing Series Studio: adds a visible link to the owner-scoped concept route.

## Implemented prototype
- Responsive five-section app navigation: Watch, Create, Story, Cast, Coins.
- Watch/discovery presentation tied to actual sample series metadata, with truthful non-playback CTA.
- Quick idea input with local guidance, and a deeper Studio entry point.
- Guided/advanced Story Architect with plot seed cards, placement, character association, lock and remove interactions in React state only.
- Three conversation modes with explicitly scripted deterministic examples, not real AI, and no hidden creator canon sent to an external provider.
- Per-character chibi/expressive performance controls as local selection only.
- Sharing permission previews that default to private and never grant actual use rights.
- Illustrative compute cost estimator and mock wallet. No ledger, claims, rewards, purchases, charges, generation or GPU jobs.

## Product principles
1. Creators decide canon. The assistant proposes, never silently approves.
2. Free story planning should lead to explicit quoted paid media creation.
3. Character knowledge must be partitioned by creator, published audience, and story time.
4. Chibi is a performance variant, not a new canonical identity.
5. Guest character appearances need versioned, explicit owner grants, permitted usages and provenance.
6. High engagement does not automatically equal quality or unlimited compute credit awards.
7. Keep mobile navigation and simple creation lightweight; advanced plotting is opt-in.
8. Use the real blueprint as read-only design context. Existing persistence schema remains unchanged.

## Important gaps
- All edits are lost on reload. Do not use this preview to create actual canonical story seeds.
- No public feed, video stream, live chatbot, AI writing assistant, approved chibi media, licensing API, or credit wallet is connected.
- No migration, runtime feature flags or new permissions are introduced.
- CI/browser and accessibility review are still required on exact PR commit.
- Open operational security and revision-bound reference approval PRs must be reconciled before product release.

## Next bounded delivery
Build Story Seeds v1 separately as a persisted, owner-scoped, revision-safe API and guided/advanced editor using a dedicated schema. Review impact before changing locked/canon seeds, and never mutate historical production assets. Preserve PR #28's security repair and all #29 schema readers when integrating. Verify cross-owner denial, lost-response retry and conflicting updates against a disposable database before any hosted release.
