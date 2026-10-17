# Nuru Faith verification record — 14 October 2026

Master checklist: [#292](https://github.com/kanyisteven44-bot/Nuru-faith/issues/292).
Production baseline: `426e55b6e66b426f297e4413469956b5d0dbc643`.
No merge, production deployment, database mutation, account creation, or live personal credentials were used in this audit.

## Findings and changes

- **PR #293, `52901c5`:** narrator regex fix reviewed; local typecheck, 283 tests and build passed. CI run 38581687031 passed dependency audit/typecheck/test/build. Browser visit and reload of its Netlify preview both rendered the app error boundary. Console: missing Supabase URL and publishable-key variables. Device voice availability/playback remains unverified. Keep draft.
- **PR #294:** the six-item truncation described in #292 is absent in current main. A behavioral service test instead reproduced overlap between 48-row pages when timestamps tie and physical row order changes: 48 unique clips instead of 96. Add descending unique-ID ordering. Three regression tests pass; complete branch suite 282/282. This does not solve offset drift from concurrent inserts/deletes, or prove real playback.
- **Hosted-build configuration gate:** fail Netlify/Vercel builds before shipping browser code missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. Reject privileged/unknown key types and invalid/insecure URLs without printing key values. Local builds remain usable without live credentials. This validates configuration shape, not connectivity, API permissions or account journeys. Do not copy production secrets into previews; use a dedicated QA backend.

## Evidence by area

| Area | Evidence available | Remaining release evidence |
|---|---|---|
| Authentication | Public production welcome and email/password/Google sign-in controls render; OAuth/deep-link/session source tests pass in full suites | Two QA accounts: signup/verification, actual login/logout/OAuth, reset/deletion/profile changes on Android |
| UI/navigation | Production welcome: no horizontal overflow or broken images in observed desktop viewport; sign-in form renders | Authenticated pages, all mobile widths, empty/loading/error states, real-device navigation |
| Music | Existing queue/discovery/catalog/source-policy tests pass | Actual audio/video, language continuity, background audio, nonrepeat queue and rights approval |
| Reels | Actual fetchReelPage exercised with mock query boundary; timestamp-tie defect fixed in #294; watched-page continuation/exhaustion/error tests | Live pagination with two QA accounts, offline/slow playback, licensed sources; concurrent-write cursor design |
| Bible audio | #293 narrator scoring tests pass; existing multilingual/TTS/sharing/offline-policy tests pass | Licensed recordings vs TTS clearly verified; installed voice/language availability, real audio, offline/verse navigation |
| Messaging | Existing queue/pagination/call-auth/attachment/push/ownership tests pass | Two-account delivery/read/groups/media/voice notes/push/calls, permissions and background behavior |
| Mentorship/learning/prayers | Existing catalog and reader/permission-related tests pass | Live booking/permissions/moderation, save/resume and prayer journeys |
| Admin | Read-only deployed function/policy inspection; five flagged admin RPCs check super_admin | Real role-denial tests; deployed review RPC has no explicit AAL2 guard and needs staged verification; RPC drift must be versioned |
| Security | Live security advisor, function definitions and selected policies read without user records | Leaked-password protection is disabled; role RLS matrix, rate-limit probes, session revocation, backups and restore rehearsal |
| Performance | Repository Lighthouse files captured today: mobile 83, desktop 98; accessibility/best-practices/SEO 100 for public entry only | Fresh repeat measurements after changes; authenticated performance and field INP/LCP/CLS |
| Accessibility | Existing light-mode/labels/touch-target source checks; public Lighthouse accessibility 100 | Keyboard/screen-reader/contrast/touch audits across authenticated pages and devices |
| PWA/deployments | Existing worker/offline/standalone tests pass; green PR #293/#294 CI | Working configured preview, actual Android install/update, weak-network recovery and rollback rehearsal |

Source-pattern tests are not end-to-end proof. The 282/283 suite totals differ because #294 starts from main and does not include #293's four narrator tests; #294 adds three service tests.

## Live security review

Read-only Supabase advisor on the app project confirmed:

- Leaked-password protection disabled: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- Six authenticated SECURITY DEFINER RPC warnings: https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- Audit log has RLS and no policies: deny-by-default may be intentional; do not grant broad access to remove an informational advisory.

Definitions show five admin RPCs check caller super_admin via user_roles. That warning alone is not proof of unauthorized access. The prayer list RPC intentionally returns non-identifying fields; inspect grants and role behavior before changing it. The deployed admin review RPC does not contain an explicit AAL2 check; SECURITY DEFINER paths must be tested separately from restrictive table RLS. Admin RPC definitions were not found in repository migrations in this audit. No permission/schema fixes have been applied live.

## Deployment/monitoring blockers

1. PR #293 Netlify preview responds HTTP 200 but throws at runtime because browser Supabase configuration is absent. A deployment-ready badge is insufficient.
2. Production smoke run 38574078088 failed: app.nurufaith.co.ke requests failed and the legacy-domain canonical expectation failed. The script still treats the temporary app subdomain as primary; update the monitor to current apex ownership without dropping legacy checks.
3. Local Chromium launch is blocked by the execution environment (socket operation not permitted). Cloud browser provided actual public production/preview observations; local browser failure is not an app failure.
4. No dedicated QA backend/two-account Android test setup was available. No destructive production tests were attempted.

## Measurement and scoring

Today's committed public Lighthouse mobile report: performance **83/100**, LCP **3.327 s**, TBT **244 ms**, CLS **0.000574**. Desktop performance **98/100**, LCP **0.804 s**. These are existing captures at ~09:19 UTC, not a fresh measurement by this audit, and not overall product scores.

Fully completed master release gates: **0 of 11**. Several gates have partial automated/static/public evidence, but every gate needs further checks before it can be marked complete. This is release-verification coverage, not a claim that the app has zero quality. An overall 90–99% quality score cannot be certified while preview startup fails and authenticated/device/security/restore evidence is missing.

Next order: configure a QA-only preview backend; verify PR previews at their exact SHA; stage admin RPC/MFA tests and versioned remediation; repair current-domain monitoring; then run two-account Android journeys and repeat performance/accessibility/PWA checks. Keep all unverified work draft.
