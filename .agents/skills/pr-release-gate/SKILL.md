---
name: pr-release-gate
description: Review, validate and file a Crayvo pull request while preserving production isolation and a strict owner-only merge gate. Adapted from the tstack full-stop approach.
---
# Crayvo PR release gate

1. Inspect current `main`, relevant open/stacked PRs, deployment configuration, and existing scene-generation infrastructure before editing. Do not duplicate code, stack onto an unverified branch, or assume a preview is live.
2. Create a scoped feature branch. No direct push to main, automatic merge, or production deployment.
3. Preserve Supabase ownership/RLS rules, production/preview isolation, existing worker schedules and external model cost gates. No production schema migrations or paid media calls without authorization.
4. Run the matching existing validations when a capable environment is available: Node 22 + `npm ci`, `npm run typecheck`, `npm test`, `npm run build`; run Python visual-evaluation/inference suites when they are touched. Record the actual results; **not run** is not **passed**.
5. Review changed files for access control, secret exposure, provenance, reused architecture, idempotency, failure recovery, billing consequences, and rollback.
6. File a **draft PR** documenting problem, alternatives, code paths, test proof, limitations, live-deployment requirements, and human approval items.
7. If CI/reviews become available, address reproducible findings only. Do not imply unattended monitoring unless a separate actual automation is running.
8. Stop before merge. No `full-send` or unattended releases.

When upstream tstack is reviewed and installed in a compatible local coding agent, `file-pr` and `babysit-pr` may support these steps; never override the approval gate.

Attribution: Original project-specific workflow inspired by https://github.com/t3dotgg/tstack (MIT). It does not install tstack.
