# Nuru Faith — 10,000 User Readiness

## Target

The first launch target is **10,000 registered users**, with normal production
spikes of hundreds of simultaneously active users.

That is different from **10,000 simultaneous users**. The latter requires
higher paid Realtime/compute limits, larger-scale load testing, and likely
additional database/edge capacity.

## Changes in this hardening pass

- Removed the always-on global notification Realtime subscription.
- Web Push remains the immediate delivery path; unread counts poll every 60s.
- Notification inbox refreshes every 30s only while that page is mounted.
- Reel feed database reads are bounded to a 48-row candidate window per page
  instead of re-reading up to 500 candidates for every six Reels.
- Reel-view exclusion checks only the current candidate ids instead of loading
  a user's entire watch history on every page.
- Comment lists are capped at 100 rows per request.
- AI conversation/message history reads are bounded.
- Added indexes for unread notifications, Reel feed filters, Reel-view
  exclusion, follower ordering, comment ordering, and people discovery.

## Infrastructure gate

For a serious 10k-user launch, use Supabase Pro rather than Free.

The Free plan is suitable for development/pilots but has a 200 concurrent
Realtime-client limit, 5 GB egress, 500 MB database size, and no automatic
backups. Nuru now minimizes Realtime dependence, but production should still
have managed backups and paid capacity.

If Nuru expects more than 500 simultaneous Realtime clients in future, configure
a plan/usage setup that supports the required peak before launch.

## Load-test progression

Do not jump from four users straight to a destructive 10k-concurrency test.

Use a non-production deployment and progress through:

1. 50 virtual users
2. 200 virtual users
3. 500 virtual users
4. 1,000 virtual users
5. only then evaluate whether a larger test is justified

At every stage measure:

- p50 / p95 / p99 latency
- HTTP error rate
- Vercel function errors
- Supabase CPU / memory / connections
- database slow queries
- egress
- Edge Function failures
- authentication failures
- Web Push failures

The included `load-tests/k6-10k-readiness.js` is deliberately conservative and
tests public navigation only. Authenticated/social workload tests should use a
dedicated staging project with synthetic test accounts, never real user
credentials.

## Launch acceptance criteria

- HTTP error rate < 1%
- p95 public navigation < 1.5s under the selected pilot load
- no database connection exhaustion
- no Realtime quota errors
- no sustained Edge Function 5xx spike
- backups verified
- Web Push delivery tested on multiple real devices
- moderation workflows tested
- no high-severity Supabase security-advisor findings
