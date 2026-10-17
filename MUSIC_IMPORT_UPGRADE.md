# Music importer upgrade

The previous importer reset its only cursor to null when a scan ended, allowing the next run to walk the same artists again. A filtered scan could also overwrite progress for the shared catalogue. The quick creator action explicitly restarted scans. Two catalogue-wide counts and several UI refreshes were performed for each page.

This change adds independent source checkpoints keyed by collection and channel, a service-only atomic checkpoint function fenced by the existing worker lease, explicit selected-source rescans, cached uploads-playlist IDs, and existing-ID lookup before requesting video details. Failed pages can be retried; saved successful pages and completed sources are retained. Metadata inserts remain idempotent. This is at-least-once processing: an interrupted insert before its checkpoint can replay safely, and that replay is counted as already catalogued.

The singer mode searches channels or resolves up to 25 creator links with concurrency limited to three. Staff must select channels and have verified MFA before approving them. Singer approval is separate from song scanning. No arbitrary search results are automatically approved.

The import studio shows persisted source coverage, outcomes, recent checkpoints, and measured processing time for the last 20 pages of the current browser run. No historical timings or old per-source completion are fabricated. These are reviewed-source scan measurements, not counts of unique singers newly created or a licence grant.

## Validation

- 300 tests pass, including 7 provider/engine tests, 6 executable SQL tests, and 3 server-access tests.
- TypeScript and local production build pass.
- SQL tests run on PGlite 0.5.10 (PostgreSQL 18), with synthetic tables, roles and lease data. This is not a full Supabase/PostgreSQL 17 deployment test.
- No new production schema, approvals, imports or API-quota consumption were performed during testing.
- Actual authenticated browser, MFA, graph layout and provider-quota validation are still required. Browser policy denied a local file-based layout fixture; it was not exposed through an alternate route. A static SSR render of the actual importer succeeded using synthetic data for internal layout preparation only.

## Release prerequisites

1. Rehearse `20261017085944_persistent_music_source_checkpoints.sql` on a separate PostgreSQL 17/Supabase QA database against the real migration history. Run database advisors and verify service-only ACLs.
2. Apply the additive migration before releasing the new server functions. The current production schema does not yet have these helpers; the upgraded screen fails closed with an upgrade-required message when they are absent.
3. Verify the QA flows: pause/resume; reload; switch selected artists; finish then resume without YouTube calls; add a newly reviewed artist; explicit selected rescan; expired page token; quota error; staff MFA failure; source rejection; duplicate/racing inserts. Confirm counters and rendered graphs using observed responses.
4. Verify singer lookup, deliberate selection, MFA, partial failures and source updates without song scans.
5. Deploy the reviewed app commit after the migration; verify one bounded QA import and stop.

## Existing history and ongoing operation

Only the one identifiable in-flight legacy channel/page token is migrated. The old schema never stored per-source completion or the scope of prior subset runs, so completed artist histories before this upgrade cannot be reconstructed safely. The first upgraded scan can revisit those old pages once, skipping video-detail requests for existing catalogue IDs. New successful checkpoints are retained thereafter.

Normal resume does not revisit completed artists. To discover later uploads on one of those artists, select that creator and use the explicitly confirmed rescan action. This intentionally rereads playlist pages, without duplicating catalogue rows. YouTube page tokens describe a provider-owned changing playlist; an expired token is surfaced as an error, never silently reset. The scan runs while its browser controller is open, not as a durable background scheduler.
