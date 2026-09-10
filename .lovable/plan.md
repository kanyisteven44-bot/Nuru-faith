# Make Reels feel like Instagram

Right now Reels sits inside a padded card with a header, tabs and "Load more" buttons. The plan turns it into a true full-screen, swipe-up reel player with the interactions people expect from Instagram — while keeping the Nuru look and the faith actions.

## What changes on screen

**Full-screen player**
- Video fills the whole phone screen, edge to edge, no rounded card, no page padding.
- One reel per swipe, snapping cleanly up and down.
- The bottom navigation bar stays; everything else floats over the video.

**Feed tabs**
- "For You / Following / My Church" float on top of the video as light text tabs instead of a solid header block.

**Playback**
- Single tap pauses/resumes with a brief play icon.
- Double tap likes, with the heart burst (already there).
- Thin progress bar at the bottom that you can drag to scrub.
- Sound is off on first load; a small speaker button toggles it, and the choice sticks between reels.
- The next reel preloads so scrolling never stalls.

**Endless scrolling**
- "Previous / Load more" buttons go away; more reels load automatically as you approach the end, with a small spinner and a friendly "You're all caught up" at the very end.

**Side action rail (Instagram order)**
- Like with count, Comments with count, Share, Save, then a "..." menu.
- The "..." menu holds Report, Not interested, Copy link, and Why am I seeing this.
- Like and Save respond instantly and roll back if the save fails.

**Caption area**
- Avatar, name, verified tick, Follow button, caption with "more", scripture tag, topic chip.
- Audio title scrolls sideways like Instagram's music ticker.

**Faith actions kept, less bulky**
- Read, Pray, Ask AI, Discuss become a single compact row of pill buttons above the caption, so they don't crowd the video.

**Comments**
- Sheet opens over the video instead of covering it fully, video keeps playing behind, dimmed.
- Adds like-count sorting toggle (Top / Newest), optimistic comment posting, and swipe-down to close.

**Small touches**
- View count shown on each reel.
- Share uses the device share sheet with a copy-link fallback (already there, kept).
- Haptic-style tap feedback via subtle scale animation on the action buttons.

## Technical notes

- Rework `src/routes/_authenticated/reels.tsx`: full-bleed container using `100dvh` minus the nav bar, `snap-y snap-mandatory`, `overscroll-contain`, and safe-area padding.
- Replace the paged `useQuery` with `useInfiniteQuery` over `fetchReelPage` (page size stays 6), plus an IntersectionObserver sentinel for auto-loading.
- `ReelPane`: add paused state, `timeupdate`-driven progress, pointer-drag seek, preload of the neighbouring pane's video, and `playsInline`/`loop` kept for iOS.
- Optimistic like/save via React Query `setQueryData` with rollback in `onError`.
- New small components in `src/components/nuru/`: `ReelProgress`, `ReelMoreMenu` (Report / Not interested / Copy link / Why this reel).
- `ReelComments`: add sort toggle, optimistic insert, and drag-to-dismiss; keep existing pin/delete moderation.
- "Not interested" records a lightweight signal (reuse `reel_reports`-style table only if suitable; otherwise a local session filter) — no schema change unless needed.
- No changes to the design tokens, navigation, Supabase schema, or Nuru AI handoffs.
