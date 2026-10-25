# Shared Story Assistant Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox syntax for tracking.

**Goal:** Reconstruct the approved bounded assistant as a fresh, validated candidate and publish one draft PR after independent review.

**Architecture:** Server-owned snapshots from existing persisted bible/seeds; strict read-only API; reusable creator panel; injected real provider adapter with closed runtime admission.

**Tech Stack:** Existing TypeScript, Next.js, React, Zod, Supabase reads, Vitest/Testing Library, Node22/npm10.

**Spec:** `docs/superpowers/specs/2026-10-25-shared-story-assistant-design.md`

## Global Constraints
No live model calls, credential/config changes, DB writes/migrations, merge or deployment. No duplicated bible or fan/rehearsal inference. Fixtures only; runtime stays closed. Draft publication requires fresh review. No new dependencies.

## Review Focus
- Private owner data must never cross series or into mixed character samples.
- Known-empty seeds versus failed storage, and canon versus planning intent, remain distinct.
- Valid Unicode identifiers and runtime revisions must be safe and bounded.
- Same-series saved bible changes and A→B→A races must invalidate stale results.
- Archive/ownership changes during upload and generation must prevent output/admission.

### Task 1: Context/provider/service
**Files:** `lib/story-assistant/{schema,errors,context,provider,service}.ts`, fixture tests.
**Interfaces:** `buildStoryContext(series,plan,selectedBeatIds)` -> context with snapshot/sources/selectedBeatIds/availableBeats; shared request/context/result Zod schemas; `generateStorySuggestions({request,readContext,signal?},provider?)`; disabled default provider and injected Responses adapter.
- [x] Recreate failing context/schema/provider/service tests, then restore minimal implementation.
- [x] Cover full digests, metadata, long IDs, bounds, source refs, separate instructions/data and stale re-read.
- [x] Run focused tests and commit owned files.

### Task 2: Read-only API
**Files:** `app/api/series/[seriesId]/story-assistant/route.ts`, tests.
**Interfaces:** GET repeated beatId query -> `{context,capability}`; POST `{prompt,selectedBeatIds,expectedSnapshot}` -> validated `{snapshot,suggestions}` or sanitized private no-store error.
- [x] Write/run failing tests for auth/owner/archive, no writes, empty/error seeds, origin/type/byte limits and upload-time archive race.
- [x] Restore authenticated owner reads and fresh pre/post generation checks; no provider construction.
- [x] Run focused tests and commit.

### Task 3: Shared UI
**Files:** `components/story-assistant/**`, SeriesStudio, StorySeedsWorkspace, CreatorExperiencePreview and both owned pages.
**Interfaces:** panel props `seriesId`, `savedSeedRevision?`, `savedBlueprintUpdatedAt?`, `hasUnsavedChanges?`; use shared schemas only.
- [x] Recreate tests RED then GREEN for saved sources, disabled state, unsaved notice, stale outputs and A→B→A races.
- [x] Restore lazy panel and saved revision wiring, with per-series seed session isolation; no mixed sample connection.
- [x] Run focused tests and commit.

### Task 4: Fresh validation, review and publication
- [x] Exact Node22/npm10 lockfile install; full suite, typecheck, build and diff checks.
- [x] Document real versus fixture/browser/not-run boundaries and remaining activation gates.
- [ ] Freeze NEW commit/tree, obtain independent review and fix important findings with regression tests.
- [ ] Preserve durable source bundle, verify remote main/branches/PRs, publish one fresh branch without force, open draft PR and verify exact remote head/tree.
