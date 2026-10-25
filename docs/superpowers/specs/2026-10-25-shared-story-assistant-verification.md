# Reconstructed candidate: fresh verification handoff

The former local-only freeze was lost when its execution workspace was replaced. This is a NEW candidate reconstructed from retained task context, not the original reviewed tree. Fresh independent review is required before the authorized draft PR. Merge, paid activation and live configuration changes are not authorized.

## Scope
Creator-only read-only snapshots from existing saved owned series and seed plans; one shared Studio/Story Seeds panel; source IDs/digests, revisions and saved-versus-unsaved/intent-versus-canon labels; bounded requests/output; strict ownership and freshness checks; real injected structured-output adapter with hard-closed runtime admission. No second bible or automatic writes. Existing scripted Director/Rehearse/Fan samples remain disconnected.

## Fresh checks
Base/main was rechecked as `82cf5d2ec3211ee6af93afe8a99bc772e335d023`. Product-code verification commit: `dba1d788309679faf62eaa063cf5b44a60471d2d`. The final freeze adds only this handoff and plan progress. Local branch: `feat/shared-story-context-assistant-recovered-20261025`.

Pinned Node22.20.0/npm10.9.4 were unpacked from pinned npm registry tarballs without install scripts. The repo dependency/lock files are unchanged. Fresh commands:

```sh
export PATH=/tmp/crayvo-node22/package/bin:$PATH
NPM=/tmp/crayvo-node22/npm10/package/bin/npm-cli.js
node "$NPM" ci --cache /tmp/crayvo-story-npm-cache --ignore-scripts --no-audit --no-fund
# Final checks used env -i with only the pinned PATH, HOME=/tmp and telemetry disabled.
node "$NPM" test -- --maxWorkers=2
NEXT_TELEMETRY_DISABLED=1 node "$NPM" run build
node "$NPM" run typecheck
git diff --check
```

- Lockfile install: 161 packages, success.
- Full Vitest suite: **128 files / 1,381 tests passed**, no final failures.
- Typecheck and diff check: passed.
- Production build: passed, including the new assistant API. Nonfatal warning: existing dynamic font path failed DNS lookup for `fonts.googleapis.com` (`EAI_AGAIN`, glyph `✦`). No unrelated font changes made.
- Build-generated changes to tracked `next-env.d.ts` were restored before final typecheck.
- Logs: `/tmp/crayvo-recovered-{install,final-tests,final-build,final-typecheck}.log`.

Fresh TDD evidence: missing core/API modules failed before reconstruction; all 18 core/provider/service and 17 API tests subsequently passed. All 14 new UI tests failed before restored behavior, then passed. The broader focused Studio/preview run passed 10 files / 67 tests with two workers.

Under simultaneous unbounded test runs, four existing UI tests hit 5-second timeouts: SceneDevelopment saved-scene continuation; EpisodeBoard retry after failed request; StudioGuide scene creation and missing-configuration guidance. Overlapping full runs were canceled (exit130), then all tests passed serially with two workers. No assertions, timeouts or production behavior were changed to hide these failures.

## Coverage and limitations
Fixture/mock tests cover owner/anonymous/archive scope, archive during POST body-read, storage-error versus known-empty seeds, source and snapshot validation, long Unicode identifiers, input/output bounds, untrusted instructions/data separation, no writes, default disabled admission, real transport request settings, stale pre/post context, same-series saved bible revisions and A→B→A client races. UI tests use Testing Library/jsdom, not a real browser.

Not performed: live provider calls, credentials read/creation, live DB/RLS acceptance, authenticated browser acceptance, real storytelling-quality evaluation, deployment validation or budget metering. No database mutation/migration, runtime setting, merge or paid resource was created. Existing automation may run disposable CI after the authorized PR; that is not live acceptance.

## Activation and publication
See `2026-10-25-shared-story-assistant-activation.md`. The adapter is prepared, not operationally connected, and environment variables alone cannot activate it. Approved total text budget, durable admission/reservation and reviewed server-only factory/route wiring remain necessary.

The candidate will be frozen for independent review, then preserved as a standalone source archive and complete Git bundle. Draft publication must preserve the reviewed tree and use a fresh branch without force, followed by remote head/tree and draft-state verification. No prior local review is substituted for this new review.
