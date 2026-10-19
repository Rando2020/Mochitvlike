# CRAYVO Web + iPhone MVP

## Scope and release gates
Crayvo is the working public brand, with "Stories become worlds." and "Crayvo it." Naming clearance is not complete; another unrelated live CRAYVO app exists. Do not register final bundle ID, buy a domain, or submit for App Store review until legal/name screening is complete.

### What this branch delivers (source implementation, not deployment proof)

**Web**: Native Next.js install manifest, icon and Apple Home Screen icon, shared Crayvo brand mark, branded landing and sign-in, mobile responsive CTA, consistent product metadata, references to existing /create and /studio pages, no changes to the existing show-generation, save, ownership, or worker paths.

**iOS**: Dedicated React Native/Expo SDK 57 app under apps/mobile. Uses existing Supabase Auth email/password and authenticated RLS SELECT on public.series, shows saved series, Episode 1 hooks/beats, and cast. Explicitly opens the verified web /create page for creation and editing. Does not pretend to render media or share web cookie sessions. No new database writes. Native sign-in and browsing require existing creator accounts.

## Web path to live

1. GitHub branch feature/crayvo-mobile-web-app is stacked on release/creator-studio-main-candidate (PR #33 source), not main. No auto-merge or production migration.
2. Run existing Node 22 CI: npm ci, npm run typecheck, npm test, npm run build. Run existing Chromium (320/375/390/428/768/1440 viewports as available) and disposable Auth/DB tests against the exact branch commit.
3. Reconnect access to existing Vercel workspace jojo31790-9839 and *existing* project mochitvlike. The connector currently returns HTTP 403. Do not create a replacement project or copy production data.
4. Inspect current Git deployment scopes, project settings, build error and worker cron requirements. Current vercel.json contains five every-minute worker schedules. Confirm plan compatibility and prevent background workers from running in preview.
5. Review cost of an independent Supabase Preview environment and receive approval before provisioning. Set Preview public Supabase URL + publishable/anon key to preview, separate environment guard values to preview. Do not paste secrets into chat.
6. Preview only: verify two distinct sign-ins, save/reopen show, revision conflicts and owner denial. For media, no GPU/job invokes.
7. Once verified, record the actual HTTPS preview URL. On iPhone Safari open that URL, Share > Add to Home Screen. The web icon/manifest make the site installable, but it requires a reachable HTTPS deployment.
8. Hold production merge/release until environment isolation, schema release gate, name clearance and safe cron schedule handling have passed. An application rollback is not a database rollback.

## Native iPhone path (Windows-friendly)

1. Within apps/mobile, copy .env.example to .env. Set only public values matching *the intended environment*, including EXPO_PUBLIC_WEB_BASE_URL after the web preview is verified. No service_role.
2. Use Node 22, npm install, npx expo install --fix, npm run check, then npm start. Connect Expo Go or a development build to an iPhone; local iOS simulator requires macOS.
3. Test native sign-in/out, show-list ownership isolation, empty state, pull-to-refresh, episode/cast detail, expired session, offline error/retry and Create in browser CTA.
4. For an installable signed iOS binary: authenticate Expo EAS, choose an owned bundle identifier, configure App Store Connect/Apple Developer credentials and native app icons, prepare privacy disclosure, then build a TestFlight candidate. Apple Developer membership and build service can involve charges; review first. No binary/TestFlight distribution is claimed in this branch.
5. Native creation, visual generation, character editing and native media playback remain a later scoped feature. The Expo app is a *functional signed-in series viewer*, not parity with the web studio.

## Data security and continuity

- Mobile client uses a publishable key, never service_role, and confirms the current Supabase user before owner-filtered reads. Public.series has authenticated SELECT RLS tied to creator_id. RLS must be independently verified in the actual preview environment and tested using two distinct users before release.
- The existing Next.js app relies on cookie sessions. Native sessions are distinct and held in Expo's storage adapter. Do not weaken web API auth to accommodate native requests; design a separately verified bearer-session boundary for future native writes.
- Session storage currently follows Expo SQLite localStorage quickstart. Review encrypted session storage for production before exposing sensitive private projects.
- No migration, privileged RPC, queue, approved asset mutation, media spend, schema rewrite, hosting project rename, or repo rename occurs.
- Creator preview areas labelled "concept" remain nonproduction UI.
- Internal package and repository names stay historical until API callbacks and hosting integrations are independently mapped.

## Acceptance evidence to collect

| Check | Required evidence |
|---|---|
| Root Next.js types/tests/build | GitHub CI run on exact brand branch SHA |
| App TypeScript dependency/install | Mobile GitHub CI on exact branch SHA |
| Web PWA install metadata | HTTPS manifest route and icon responses |
| Web creator experience | Real hosted preview, separate DB, two test owner browser runs |
| iPhone native beta | Actual iPhone session, screenshots, login and saved-series RLS |
| TestFlight/App Store | Signed build and actual listing, after naming/legal/cost review |
| Production | Deliberate reviewed release, not automatic PR merge |

## Next isolated self-prompt

Act as principal release engineer, iOS product engineer, QA lead and security engineer. Reinspect current GitHub branch, CI and protected Vercel project. Fix failing CI without changing authentication/worker/data boundaries. Recover the same existing Vercel scope, present actual independent preview database cost, establish isolated preview only after approval. Host the Crayvo brand candidate, verify install manifest, icon and real authenticated show save/reopen for two owners, then run Expo development build on a real iPhone using the matching preview Supabase. Capture exact SHA, URLs and evidence. Do not merge into main, run GPU or app-store submit until all gates pass.
