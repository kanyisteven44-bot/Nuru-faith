# Real music and podcast catalogue

Music and podcast screens read approved `media_items`, in pages of 24, with exact database counts. Search covers titles and creators. YouTube uses the official visible embed; publisher podcast enclosures stream directly with native play/pause/seek controls. No audio is extracted from YouTube.

## Import songs

Preferred: open `/admin` as a Nuru super administrator or moderator with MFA, then use Music catalogue import → Start / resume import. Configure the server-only `YOUTUBE_API_KEY` in Vercel first. Each authenticated request validates the role and MFA, processes one bounded batch, and writes through existing database policies. Pause/resume saves only the next source and page token in browser storage; no credentials are saved there. If approved sources are exhausted below 10,000, the interface reports the shortfall. This is a manually operated import, not a background scheduler.

CLI alternative:

Run `node --experimental-strip-types scripts/import-music-catalog.mjs` with server-only `YOUTUBE_API_KEY`, `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the environment. Do not paste secrets into source files or use VITE-prefixed keys. Default target: 10,000 distinct songs; override with `NURU_MUSIC_TARGET`.

The importer walks approved official musical channels, validates public/processed/embeddable videos in YouTube's Music category, checks Kenya availability, excludes clips under 60 seconds, and inserts metadata with the existing `(source, external_id)` uniqueness constraint. Existing editorial records are preserved. It records pagination progress locally and resumes after API quota/network failures. Delete the local checkpoint to perform a fresh scan. A target shortfall is reported explicitly; exhausted sources do not become duplicate songs.

Availability can change after import. Keep the visible YouTube player and external fallback link. Recheck the catalogue regularly; metadata validation does not guarantee perpetual playback or access in every country.

## Podcasts

BibleProject episodes were imported from the publisher's public RSS feed `https://feeds.simplecast.com/3NVmUWZO` on 2026-10-02. Audio and artwork remain on the publisher's servers. No media is rehosted and no download permission is inferred. Stable feed GUID-derived IDs prevent duplicates. This import contains 543 distinct episodes; this is not a claim of 10,000 songs.
