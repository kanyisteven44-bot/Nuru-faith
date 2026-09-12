# Vercel deployment checklist

## Environment variables

Set these in the Vercel project's **Settings → Environment Variables** for the
Production environment (and Preview, if you want preview deployments to work
too). Names only — set the actual values in the Vercel dashboard, never in
the repo.

| Variable | Where it's read | When it's needed | Client-safe? |
|---|---|---|---|
| `VITE_SUPABASE_URL` | `src/integrations/supabase/client.ts` (`import.meta.env`) | **Build** — Vite inlines it into the client bundle | Yes — Supabase project URL is public by design |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `src/integrations/supabase/client.ts` | **Build** | Yes — this is the publishable/anon key, public by design |
| `SUPABASE_URL` | `client.ts` (SSR fallback), `client.server.ts`, `auth-middleware.ts` | **Runtime** — read via `process.env` on the server | Server-only usage in this codebase (not shipped to the browser bundle) |
| `SUPABASE_PUBLISHABLE_KEY` | `client.ts` (SSR fallback), `auth-middleware.ts` | **Runtime** | Server-only usage here; same publishable key as above |
| `SUPABASE_SERVICE_ROLE_KEY` | `src/integrations/supabase/client.server.ts` | **Runtime** | **Server-only. Never** expose to the client or prefix with `VITE_` — bypasses RLS |
| `YOUTUBE_API_KEY` | `src/lib/youtube.functions.ts` | **Runtime** (only when YouTube-backed features are hit) | Server-only |
| `AI_GATEWAY_API_KEY` | `src/lib/ai.functions.ts` (via the `ai` SDK) | **Runtime** (only when AI features are hit) — **not needed on Vercel**, see below | Server-only |
| `LOVABLE_CRON_SECRET` | `src/integrations/supabase/cron-auth.ts` | **Runtime** (cron endpoint auth) | Server-only |
| `LOVABLE_CRON_SECRET_PREVIOUS` | `src/integrations/supabase/cron-auth.ts` | Optional — fallback during secret rotation | Server-only |

Notes:
- Nuru AI calls the Vercel AI Gateway through the `ai` SDK. On Vercel it
  authenticates automatically via OIDC, so **no AI key needs to be set** for a
  Vercel deployment; set `AI_GATEWAY_API_KEY` only when running the server
  somewhere else. If the gateway runs out of credits the UI surfaces that
  directly ("Nuru AI is out of credits"), which is a billing issue rather than a
  missing variable.
- `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY` and
  `SUPABASE_URL`/`SUPABASE_PUBLISHABLE_KEY` point at the same Supabase
  project — set both pairs to the same values so build-time (client) and
  runtime (SSR) code agree.
- Nothing else needs to be set for the Nitro/Vercel target: Nitro
  auto-detects Vercel from the `VERCEL` system env var Vercel sets on every
  build, so `NITRO_PRESET`/`SERVER_PRESET` should be left unset.

## Framework detection

`vercel.json` pins the framework preset to `tanstack-start` so Vercel's
dashboard build/install command detection matches this stack even though the
repo carries both `bun.lock` and `package-lock.json`. This does not change
the build command, install command, or output directory — Nitro's `vercel`
preset still emits a standard Build Output API v3 directory
(`.vercel/output`) that Vercel picks up automatically.

## Known-good local reproduction

```bash
npm ci
npm run typecheck
npm run lint
npm test
VERCEL=1 npm run build   # matches what Vercel's build environment sets
```

The build should produce `.vercel/output/functions/__server.func/` (Node
`nodejs22.x` function) rather than `.output/server/wrangler.json`
(Cloudflare Worker) — the latter means the build ran without `VERCEL` set in
the environment.
