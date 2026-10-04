# Real music and podcast catalogue

Music and podcast screens read approved `media_items`, in pages of 24, with exact database counts. Search covers titles and creators. YouTube uses the official visible embed; publisher podcast enclosures stream directly with native play/pause/seek controls. No audio is extracted from YouTube.

## How songs get in

Songs are never listed by hand. The chain is:

1. **Candidate names** — `content/music-source-candidates.json`, artist names gathered from the published references listed in that file. Names only: a candidate must not carry a channel id, and a test enforces that.
2. **Verification** — `scripts/resolve-music-sources.mjs` resolves each name against the YouTube Data API, and only accepts a channel that is a confident, unambiguous name match and is actually publishing eligible music. Anything else goes to `content/music-source-unresolved.json` for a person to check.
3. **The reviewed list** — accepted artists are written to `content/media-source-review.json` with their channel id, avatar, verification URL and a real sample video as proof.
4. **The seed** — `scripts/generate-music-seed.mjs` regenerates `supabase/seeds/multilingual_sources.sql` from that list. Never edit the seed by hand; `npm test` fails if the two drift apart.
5. **The songs** — the importer below walks each approved channel and pulls its uploads.

### Adding artists

```
YOUTUBE_API_KEY=... node --experimental-strip-types scripts/resolve-music-sources.mjs
node scripts/generate-music-seed.mjs
```

`NURU_DRY_RUN=1` resolves and reports without writing. `NURU_MAX_LOOKUPS` caps how many names are searched in a run: each search costs 100 units of a default 10,000/day quota, so roughly 95 new names per day.

The resolver refuses rather than guesses. A one-word artist name only matches a channel whose title is exactly that name, two channels scoring alike are reported as ambiguous instead of picked between, and a channel with fewer than three eligible music uploads is rejected. This matters because a wrong channel id makes the importer serve the wrong channel's uploads to young people as worship music. Unresolved names are a normal outcome, not a failure — work through them by hand and add the confirmed channel.

To widen the language picker, add the code and label to `MEDIA_LANGUAGES` in `src/lib/mediaDirectory.ts`. "Other languages" derives from that list, so a newly named language cannot also fall into it.

## Import songs

Preferred: open `/admin` as a Nuru super administrator or moderator with MFA, then use Music catalogue import → Start / resume import. Configure the server-only `YOUTUBE_API_KEY` in Vercel first. Each authenticated request validates the role and MFA, processes one bounded batch, and writes through existing database policies. Pause/resume saves only the next source and page token in browser storage; no credentials are saved there. If approved sources are exhausted below 10,000, the interface reports the shortfall. This is a manually operated import, not a background scheduler.

CLI alternative:

Run `node --experimental-strip-types scripts/import-music-catalog.mjs` with server-only `YOUTUBE_API_KEY`, `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the environment. Do not paste secrets into source files or use VITE-prefixed keys. Default target: 10,000 distinct songs; override with `NURU_MUSIC_TARGET`.

The importer walks approved official musical channels, validates public/processed/embeddable videos in YouTube's Music category, checks Kenya availability, excludes clips under 60 seconds, and inserts metadata with the existing `(source, external_id)` uniqueness constraint. Existing editorial records are preserved. It records pagination progress locally and resumes after API quota/network failures. Delete the local checkpoint to perform a fresh scan. A target shortfall is reported explicitly; exhausted sources do not become duplicate songs.

Availability can change after import. Keep the visible YouTube player and external fallback link. Recheck the catalogue regularly; metadata validation does not guarantee perpetual playback or access in every country.

## Podcasts

BibleProject episodes were imported from the publisher's public RSS feed `https://feeds.simplecast.com/3NVmUWZO` on 2026-10-02. Audio and artwork remain on the publisher's servers. No media is rehosted and no download permission is inferred. Stable feed GUID-derived IDs prevent duplicates. This import contains 543 distinct episodes; this is not a claim of 10,000 songs.
