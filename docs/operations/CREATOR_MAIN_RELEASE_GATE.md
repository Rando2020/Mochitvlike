# Creator Studio main integration - release gate

Branch: `release/creator-studio-main-candidate`.
Source candidate: `2ea0bd4392c18dd0f4285607245d7b8cdfd0f62e` (draft PR #32).
Parent main: `a2c7fb7de8a49f5c19e4a09f5524468e452cb0cc`.

This branch is **not a production deployment** and must not be merged while the Vercel scope is inaccessible and its integration check is failing.

### Preserved
- Existing `vercel.json` is restored **byte-for-byte from current main**, retaining five existing minute-frequency job schedules. The preview-specific cron deletion in PR #32 is deliberately NOT carried to the main candidate.
- Operational PR #28: authenticated scene generation, Supabase environment isolation guard, security repair `20261004035341`, and failure-safe diagnostics.
- Character reference PR #29: strict schema readers, generation direction and revision-bound visual references.
- Creator UX PR #30 and saved Story Architect PR #31: five mobile sections and revision-safe owner-scoped authoring.
- `database-release.yml` requires workflow_dispatch with reviewed SHA and explicit environment settings; no automatic production schema push in this workflow.

### Verified from the preview candidate before preparing this release branch
- CI passed on source commit `2ea0bd4392c18dd0f4285607245d7b8cdfd0f62e`.
- [Disposable two-owner PostgreSQL](https://github.com/Rando2020/Mochitvlike/actions/runs/39106819227) passed.
- [Cloud Smoke](https://github.com/Rando2020/Mochitvlike/actions/runs/39106819170) passed.
- [Mobile and desktop Chromium smoke](https://github.com/Rando2020/Mochitvlike/actions/runs/39106819355) passed for public demo, with screenshot artifacts.
- Production database migration ledger includes the earlier security repair but NOT Story Seeds. No creator records copied.

### Gates before merging to main
1. Reauthorize Vercel workspace `jojo31790-9839`. Inspect Git integration, deployment triggers, production/preview environment scopes, and worker schedules without exposing secrets.
2. Confirm whether a push to main automatically deploys production; do not merge until that consequence is explicitly approved or auto-deploy is safely disabled.
3. Recheck CI, Cloud Smoke, Story Seeds Postgres and browser smoke on this *exact branch head*. A green source branch is not sufficient.
4. Establish isolated preview DB only after an actual price check and approval. No hosted save claims without two real user sign-in/ownership checks.
5. Reconcile release migrations with existing production ledger. Do not apply Story Seeds to the production DB for preview validation.
6. No paid AI, GPU calls, sharing/coin transactions, or production migrations without separate authorization.

All original PRs remain intact; no production resources were changed by preparing this branch.
