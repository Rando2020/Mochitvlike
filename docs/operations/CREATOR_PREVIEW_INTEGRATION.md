# Combined Creator Studio preview candidate

Source SHA: PR #28 f353ce50b7519879fa5a3666b8fd46b330895e7f; PR #29 a4c90ec1ed44decd652a44d8dddf17255b06bf04; Story Architect PR #31 3d311dd9a4bbca8f7eb55ddcfcc36eb760283490.

This integration branch is an unmerged preview candidate. Its primary parent preserves PR #28 environment isolation and security migration. A file-level overlay preserves PR #29's schema readers and new reference-binding pathways, and PR #30/#31's Creator UX and Story Seeds migration. For overlapping files, #28 controls login, account, root launch, and proxy isolation. PR #29 controls generation schema/direction and GuidedShowCreation; a manual integration restores the /studio link. SeriesStudio uses #28's anti-duplicate scene flow, adds #29's cast-detail seriesId and #31's Story Architect entry link. The operational GuidedShowCreation CSS remains.

In this candidate only, `vercel.json` is omitted so that media cron configuration cannot be accidentally promoted with the preview. Never copy this config deletion to production.

### Release gates
No production deployment, PR merge, creator data copying, paid inference, media jobs, or shared credentials. Vercel workspace access is currently forbidden; a hosted preview needs reauthorization. A separate Supabase preview database requires explicit cost and setup approval. Run CI and disposable Postgres tests, then authenticated hosted 2-owner browser checks before any merge.
