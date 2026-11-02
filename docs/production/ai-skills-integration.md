# Crayvo AI skills pilot (2026-11-01)

## Proposed skills and evidence

- `.agents/skills/video-assembly/SKILL.md`: original project adapter to HyperFrames (Apache-2.0), for *post-production only*. Upstream: https://github.com/heygen-com/hyperframes
- `.agents/skills/pr-release-gate/SKILL.md`: original project adapter to tstack (MIT) for safe owner-gated pull requests. Upstream: https://github.com/t3dotgg/tstack
- These SKILL.md files are agent instructions. No third-party packages, cloud render accounts, credentials, or provider hooks are installed by this change.

## 15-second proof-of-concept backlog
1. Inventory existing two-shot assets, production-frame state, continuity metadata, audio, and provider outputs already in the repo.
2. Design a 9:16 two-shot manifest using owned test media. Hero identity match, dialogue timing and natural body motion must be evaluated separately from composition.
3. If the owner approves package installation, pin/review HyperFrames and its transitive dependencies; create `experiments/hyperframes/` outside production routing.
4. Run an actual local 15-second render on an isolated workstation with Node 22 + FFmpeg, and inspect frames near shot boundaries and captions; do not invent success.
5. Write a results report with source licenses, timing/frame evidence, resource cost, audio-sync measurement, quality scorecard, limitations, and a go/no-go decision.
6. Keep media-production integration out of the Next.js deployment, Supabase production database, and scheduled workers until independently approved.

## Exit criteria
- Reproducible command and output artifacts exist.
- Quality findings are source-grounded, including limitations.
- No production deployment, purchase, provider call, or automatic merge occurred.
