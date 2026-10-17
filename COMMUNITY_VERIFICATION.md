# Community reliability verification — 17 October 2026

The Prayer, Testimony and News chips previously filtered only the posts already loaded from the unfiltered feed. A matching post outside the first 20 rows could be hidden behind an incorrect empty state. News also used `news`, while the schema stores that content as `announcement`.

## Changes

- Apply the selected post kind in the Supabase query before pagination.
- Order by creation time and unique ID so timestamp ties have a deterministic order.
- Include the viewer and filter in the query key; retain the empty-following guard.
- Wait for Following dependencies; show feed and membership errors with retry instead of an empty result.
- Disable membership actions until membership data arrives and while a mutation is pending. Refresh group lists and the messaging group cache after success.
- Open a group's space from its Community card and label the membership removal action Leave.
- Replace fixed dark Community surfaces with theme tokens.

## Evidence

Three service regression cases fail against the previous code: matching prayer outside the first unfiltered page, stable tied-timestamp ordering, and combined author/kind filtering. All pass after the fix.

Ten new tests exercise the actual transpiled service and server-rendered route with controlled dependencies. They cover filtering, two pages, author mapping, empty-following short circuit, query failures, persisted News kind, pending dependencies, true empty results, group failures and disabled mutation controls.

Validation: 312 tests pass; TypeScript and production build pass. These are synthetic service/component checks, not authenticated end-to-end checks.

## Remaining boundaries

- Signed-in browser verification needs a QA account. No live posts or group memberships were created, removed or changed during this work.
- Timestamp ties are deterministic; offset pagination can still shift when posts are inserted or deleted between requests.
- Two-account calls, push, background playback and Android install/update remain separate release gates in issue #292. No overall quality score is asserted.
