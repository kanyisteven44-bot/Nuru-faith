# Nuru Faith development status

Audit date: 2026-09-10. This is a source and local-build audit, not a claim that every deployed feature works. No authenticated production account or database test environment was supplied.

## Baseline and preservation

- Dependencies installed with npm; package-lock.json now records the resolved installation. npm reported zero known vulnerabilities at installation.
- Initial production build and TypeScript check passed. Initial lint had 2,748 formatting errors, six explicit-any errors and one prefer-const error.
- Formatting follows the existing ESLint/Prettier configuration. Generated Supabase files received formatting only, except the necessary prefer-const correction in previewAuthStorage.ts. Integration configuration and generated database schema remain intact. TanStack generates routeTree.gen.ts during builds.
- No .git directory exists in this supplied folder, and Git is absent from PATH. No commits, history changes, force pushes, or deployments were performed. Use the connected Git checkout to create incremental commits.
- Preserve .lovable/project.json, Lovable Vite integration, auth bridge, SSR/error-reporting wiring, Supabase generated types, and generated route tree. Do not manually add duplicate framework plugins.
- PWA manifest and icons exist. There is no service worker. The previous roadmap's service-worker completion claim was incorrect; ANDROID.md describes the actual online-only state.

## System status

WORKING means a concrete implementation exists and local static checks pass; external integrations still need authenticated smoke tests.

| System | Status | Evidence and remaining work |
| --- | --- | --- |
| Authentication | PARTIAL | Supabase email/password, reset and Lovable OAuth wiring exist. Session initialization race and sign-out cache clearing corrected. Validate expired sessions, cross-tab sign-out and OAuth on the deployment. |
| Onboarding | PARTIAL | Profile/interests/church writes exist. Faith-stage selection is not persisted; multi-step writes are not atomic. |
| Home | PARTIAL | Real Bible API, DB devotionals/events/Reels. Reel fetch is now bounded and published-only. Continue Growing, reflection/action and church-specific prioritization are incomplete. |
| Reels | PARTIAL | Existing full-screen feed, swipe, comments/replies/pin/delete, likes/saves/follows/share/report/feedback and faith handoffs preserved. Cache identities and shared Reel lookup fixed. Verify video failures, data saver, actual watch-duration logging and concurrent optimistic actions. |
| Explore | WORKING | Bounded authenticated server queries, grouped results, categories, suggestions, user-scoped device recents, pagination, per-group errors and individually addressable results. Bible topics are a small curated reference index; text is retrieved by the existing Bible component. |
| Bible | PARTIAL | Real passage lookup, devotionals, reading-plan views and saved passages. Full reader navigation and reading-plan progress integration remain incomplete. |
| Scripture Series | PARTIAL | Published list, detail/session flow, private reflections and progress are implemented. Separate series bookmarks and full history integration are absent. |
| Nuru AI | PARTIAL | Existing Lovable server architecture retained. Added authentication, source-honesty instructions and UUID-safe context persistence. No retrieved sermon/transcript corpus or automatic verification of generated Bible quotations. Requires authenticated provider smoke test and stronger grounding before claiming quotation accuracy. |
| Community | PARTIAL | DB feed, post actions, group joins and prayer wall exist. Private-group access needs the new migration and role tests; group detail/discussion routing is incomplete. |
| Churches | PARTIAL | DB directory, home church and membership/events exist. Incorrect unconditional verified badge fixed. Teachings/service archives and complete admin workflows remain incomplete. |
| Mentorship | PARTIAL | DB mentor listing/request submission exists. No complete private chat, mentor response, end/report workflow. Existing safeguarding copy overstates these capabilities. |
| Music/media | PARTIAL | Official YouTube embeds, typed metadata calls, curated tables and owned audio player exist. Server search now requires approved/trusted channels. Save/history services were not wired into playback. |
| Podcasts | MOCKED | DB-backed show/episode listing; episode play button only displays a coming-soon toast. |
| Events | PARTIAL | DB list and RSVP persistence exist. Loading exists; full error states, detail routes and management need work. |
| Profile | PARTIAL | Profile/interests editing and sign-out exist. Saved count is hardcoded to zero; account/settings/deletion incomplete. |
| Saved content | PARTIAL | saved_reels, saved_posts, saved_scriptures and user_media_saves exist. A unified view and series/course saves are absent. |
| History | PARTIAL | reel_views and media_history exist; unified screen and Bible/series playback hooks are absent. |
| Notifications | PARTIAL | DB list and mark-read exist; no complete delivery/push pipeline or action deep links. |
| Admin | MOCKED | Role-scoped church overview; publishing, moderation and member panels are placeholders. |
| Supabase/RLS | PARTIAL | RLS and ownership policies exist. New migration protects verification, media approval, private group joins, AI conversation ownership and mentorship participants. Not applied or database-tested. Additional findings below remain open. |
| PWA | PARTIAL | Manifest/icons and viewport metadata exist. Online only; no service worker, native wrapper, APK/AAB or push implementation. |

## Implemented in this pass

- Guard useAuth against stale initialization and unmounted updates.
- Clear query cache for all sign-out events, including events outside the profile screen.
- Include user ID, actual following IDs and interests in Reels feed keys; align church membership cache keys.
- Bound Home's Reel query; only query published public Reels.
- Handle shared Reel IDs with a direct published-content lookup.
- Fix narrow input flex sizing and wrap end-of-feed actions.
- Propagate interest deletion failures instead of silently proceeding.
- Parse YouTube API responses with Zod instead of any.
- Centralize Christian search intent and channel trust checks. Discovery/blocked/unknown channels are excluded; explicit trust records take precedence over media source fallback.
- Require authenticated AI requests and prevent external media IDs from breaking UUID context persistence.
- Build Explore with bounded queries and distinct content detail URLs.
- Add a forward-only security migration; no duplicate domain tables.
- Ignore local environment credentials in Git.

## Security findings and deployment gate

Apply and test supabase/migrations/20260910190000_enforce_review_boundaries.sql in a test database before production. Source inspection found:
- Self-editable verification fields on profiles/mentors and church-admin media approval bypass: migration adds server enforcement.
- Private group self-join by guessed ID: migration narrows self-join rules.
- AI messages could reference conversations outside the author account: restrictive ownership boundary added.
- Mentorship request parties could be changed: migration makes them immutable.
- Remaining audit items: public profile/membership visibility; anonymous prayer identity exposure through raw rows; church-admin moderation scope; caller-controlled Reel author/church/source/rights claims; update policies with WITH CHECK(true); mentorship status authority; signed upload URLs lasting a year. Do not describe RLS as fully audited or production-secure.

Database acceptance tests must cover anonymous, two ordinary users, church admins for two different churches, moderator, super admin and service role. Test insert/update as well as reads; client UI restrictions do not constitute authorization.

## Duplicates, placeholders and performance

- Both src/components/nuru/ReelComments.tsx and src/components/nuru/reels/ReelComments.tsx exist. The feed uses the nested version; verify all callers before removing the older implementation.
- content.ts and ai.ts overlap in AI conversation/message helpers. Preserve current callers until consolidation is justified.
- Legacy music_tracks/music_playlists/podcasts coexist with media_items/media_playlists/media_sources. Migrate or bridge deliberately; do not create replacement tables blindly.
- No existing test script or test suite was found.
- Remaining placeholder controls: podcast playback, admin panels, voice answers, full Bible reader, phone sign-in.
- Existing unbounded requests remain in several older services (courses, tracks, mentors, comments, saved IDs). Explore avoids these by querying the database with limits; index/EXPLAIN work is still needed against realistic data.
- Media approval rank is only approximate: local featured content and verified churches/mentors receive preference, while external results use official/verified/trusted channel rank. No complete cross-source ownership ranking exists yet.

## Next implementation sequence

1. Finish authenticated stability and RLS acceptance tests; add regression coverage for auth, deep links, search filters and trust precedence.
2. Bridge legacy podcast/music sources into Explore and add direct actions from church/group/mentor/course/event detail results.
3. Unified Saved and separate History using existing structures; add only the missing series/course bookmark support.
4. Admin/church submission: validated YouTube URL, metadata preview, category/association, pending review, staff approve/reject and publication.
5. Calm Home with Today's Light, continue series and church/community relevance.
6. Browser QA at 320, 360, 375, 390, 412 and 430px, including keyboard/safe-area sheets and video playback.

## Validation limits

Build success does not prove RLS, external API configuration, mobile browser behavior or end-to-end authentication. No production mutations or paid AI/YouTube requests were made. See the final implementation handoff for the latest local checks.

