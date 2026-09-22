# Nuru Faith production operations

This file is the operational checklist for the production Nuru Faith service.

## Production identifiers

- GitHub: `kanyisteven44-bot/Nuru-faith`
- Vercel project: `nuru-faith`
- Supabase project ref: `qnqkcqywvqzfkickezxd`
- Production branch: `main`
- Changes must reach production through a verified preview/PR. Do not develop directly on `main`.

## Release gate

Before merging a release:

1. `npm run typecheck`
2. `npm test`
3. `npm run build`
4. Verify the Vercel preview is READY.
5. Run Supabase security advisors after any schema/RLS change.
6. For migrations, verify the target project ref before applying.
7. Smoke-test auth, Home, Reels, Community, Bible, Mentorship, Notifications and Admin.
8. Check Vercel runtime errors after deployment.

A failed preview is a release blocker.

## Database and security

All tables in the exposed `public` schema must have RLS enabled. Authorization belongs in
RLS/server-side checks, never only in React controls.

Never expose:

- `SUPABASE_SERVICE_ROLE_KEY`
- AI provider secrets
- YouTube API keys
- Firebase service-account credentials
- cron secrets

The only current Supabase security-advisor warning after the 2026-09-22 hardening is
**Leaked Password Protection Disabled**. Enable leaked-password protection in Supabase Auth
before broad public onboarding when the project plan supports it.

After every DDL/RLS release:

- re-run Supabase security advisors;
- inspect policies for accidental broad `WITH CHECK (true)` or ownership gaps;
- regenerate `src/integrations/supabase/types.ts`.

## Backup and recovery

A backup is not considered trustworthy until a restore has been tested.

Operational policy:

- Verify the project's managed database-backup status in Supabase at least monthly.
- Keep a separate periodic logical database export before destructive migrations and major launches.
- Preserve migration files in Git; never treat migrations as a replacement for data backups.
- Before a high-risk data migration, take/verify a recovery point first.
- Run a restore drill at least quarterly into a non-production environment.
- Record the restore date, backup used, result and any missing data.

Recovery priority:

1. Stop further destructive writes.
2. Identify the first bad migration/action and affected tables.
3. Preserve logs and current state.
4. Restore/recover into a non-production environment first when possible.
5. Validate auth/profile/content/mentorship integrity.
6. Only then repair production.

## Monitoring and incidents

Vercel Runtime Errors is the current server-side production error source. Review it after every
release and at least weekly.

Known production finding from the 2026-09-22 audit:

- YouTube search exhausted API quota and produced repeated 429 errors.
- The application now backs off for six hours on 403/429 quota responses and returns a graceful
  quota state rather than repeatedly hammering the API.

The occasional TanStack `Server function info not found` error should be correlated with a
deployment transition before being classified as a persistent application bug.

Suggested severity:

- **SEV-1:** login unavailable, data exposure/loss, app unavailable to most users.
- **SEV-2:** core feature broken (AI, Bible, Reels, mentorship, notifications).
- **SEV-3:** partial degradation or isolated UI/content issue.

For SEV-1, stop rollout/rollback first. Diagnose second.

## Notifications

Supabase is the notification source of truth.

The production database creates notifications for:

- new followers;
- comments on posts;
- comments on Reels;
- new mentorship requests;
- mentorship status changes.

The app subscribes to notification changes in real time while it is connected, tracks reads with
`read_at`, supports deep links, and displays a real unread count.

### Background browser push

The PWA uses the standards-based Web Push API rather than Firebase for browser notifications.

- Users opt in from the Notifications screen; permission is never requested on page load.
- Browser subscriptions are registered through the JWT-protected
  `manage-web-push-subscription` Edge Function.
- VAPID private material and the database-to-function dispatch secret are encrypted in Supabase Vault.
- The VAPID public key is safe to ship to browsers.
- Notification inserts dispatch asynchronously with `pg_net` to `send-web-push`.
- The sender disables expired 404/410 subscriptions and records `delivered_at` after successful delivery.
- A failed push never deletes the database notification; in-app notifications remain authoritative.

This covers compatible browsers/PWAs. A future native Android/iOS app may use a platform-specific
push layer such as FCM/APNs without replacing the database notification source of truth.

## PWA and offline behavior

`public/sw.js` caches generic static assets and provides `/offline.html` as a safe navigation
fallback.

Authenticated HTML/data is deliberately not cached as a generic offline page, because doing so
could expose one user's private content to another user on a shared browser/device.

The current offline banner is connectivity status, not a promise of full offline sync. Full
offline notes/downloads require an explicit encrypted/local-storage design before being advertised.

## Storage

Current production bucket:

- `reel-media` — private, video-only.

Do not create empty buckets merely for architecture symmetry. Create separate buckets when
features actually need them, with purpose-specific policies. Future private mentorship/admin
attachments must not inherit public media access patterns.

## Moderation

The Admin dashboard uses the existing RLS-protected report sources:

- `reports`
- `reel_reports`
- `external_reel_reports`

Authorized admins/moderators can move reports through review, resolution or dismissal. The UI is
not the security boundary; RLS remains authoritative.

## Production data discipline

Do not seed fabricated social relationships or user activity into production.

Before a broad launch, test with real consenting pilot users and specifically measure:

- signup/onboarding completion;
- follow/community interactions;
- Reel playback failures;
- notification delivery/read rates;
- mentorship request flow;
- moderation workload;
- Vercel error rate and YouTube quota consumption.
