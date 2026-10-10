# Nuru Faith launch-readiness gate

**Production:** https://app.nurufaith.co.ke — GitHub `kanyisteven44-bot/Nuru-faith`, Vercel `nuru-faith`, Supabase `qnqkcqywvqzfkickezxd`.

Use this as a live release checklist, not as evidence that every journey has already passed.
Do not approve a public launch solely from a READY deployment or Lighthouse score.

## Confirmed evidence — 9 October 2026

- Last tested deployment on `main` returned HTTP 200 and was Vercel READY.
- Public mobile browser audit completed **44 of 44 public screen cases** across
  360/390/430px and desktop; it tests sign-in and registration UI interaction,
  **not** real Supabase sign-in or new-user registration with credentials.
- Latest public homepage Lighthouse: performance **90**, accessibility **100**,
  best practices **100**, technical SEO **100**. LCP **3.2 s** is still above
  the preferred 2.5-second target. Results are **lab samples**.
- Supabase project ACTIVE_HEALTHY and security advisor reported no exposed
  table/RLS warnings. The rate-limit upsert concurrency fix is present in the
  live database.
- Google Search Console had last crawled the homepage when it carried a
  `noindex` tag. Live homepage currently returns `index, follow`. The sitemap
  is submitted, but Search Console reported **0 indexed of 12 submitted URLs**;
  indexing requires Google to recrawl, not a guarantee from Lighthouse.
- Vercel runtime error groups from October 5–7 refer to earlier deployments
  (missing service-role environment, server-function skew, old rate-limit race).
  Inspect new occurrence timestamps before calling a resolved old incident
  an active outage.

## Gates required before a broad public launch

| Area | Acceptance check | Status / owner |
|---|---|---|
| Auth | On two actual devices, register a fresh QA account, confirm email, sign in/out, reset password, reopen the PWA and test Google OAuth callback | **Needs dedicated QA credentials and real-device run** |
| Accounts | Test profile changes, changing username/photo, deleting your own post and account, and verify deleted media stays inaccessible | **Needs authenticated run** |
| Content | On weak mobile data, open Bible in multiple editions and listen with sound, resume courses/devotions, and verify saved/offline reading | **Needs authenticated and offline run** |
| Communication | Two distinct QA accounts: message, reply, deliver/read receipts, voice note, theme/photo, audio/video call, background push, declined/missed call | **Needs two real devices and permission testing** |
| Groups & moderation | Join public group, reject unauthorized access to private group, create report, moderate as church admin vs super admin | **Needs multi-role QA / RLS boundary test** |
| Payments & content rights | Review music/YouTube terms and required approvals before redistributing copyrighted audio/video; do not equate DB-approved with rights-cleared | **Owner/legal review required** |
| PWA | Install, close/reopen, service-worker update, browser back, offline states, notifications opt-in and battery saver | **Needs Android phone run** |
| Backups | Confirm Supabase backup retention and rehearse restore into a non-production instance before risky migrations | **Needs dashboard backup verification** |
| Auth hardening | Supabase Auth security advisor: **Leaked Password Protection Disabled**. Enable when supported by project plan | **Needs Auth dashboard setting** |
| Search visibility | Inspect sitemap/12 URLs and request re-indexing of public pages when Google supports it | **In progress; Google controls indexing** |
| Performance | Track mobile 75th percentile LCP/INP/CLS with real-user monitoring; improve LCP under 2.5 seconds and avoid regressions | **No field data confirmed** |

## Automated gates

- Every PR: `npm run typecheck`, `npm test`, production build and installed Google-sign-in UI smoke test.
- Production: `.github/workflows/mobile-browser-audit.yml` measures public pages at mobile and desktop widths and preserves report/screenshots; it skips protected flows unless **separate dedicated** `NURU_QA_EMAIL` and `NURU_QA_PASSWORD` GitHub Actions secrets are provided.
- Use **test-only accounts** without personal messages, real passwords or real account deletion. Never log or hardcode those credentials.
- After merging: verify latest Vercel production deployment sha, `app.nurufaith.co.ke` alias, public URLs, runtime error timestamp and Google Console robots/indexing state.
- Before declaring **launch-ready**, record real device test evidence for the incomplete rows above and resolve SEV-1/SEV-2 blockers.

## Rollback and incident response

Use `OPERATIONS.md`; rollback for unavailable login, public data exposure or data loss.
Never apply destructive database migrations on production without a verified backup
and test in non-production. Treat an unreadable Auth/Realtime service differently
from a merely unavailable third-party media thumbnail.
