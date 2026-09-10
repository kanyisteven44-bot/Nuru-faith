# Nuru Faith — Android / Google Play readiness

This document is the packaging guide for Nuru Faith. **No APK or AAB has been
built yet.** What exists today is a mobile-first web app that is installable as
a PWA, plus the configuration needed for an Android wrapper.

## 1. Current architecture and what it means for packaging

Nuru Faith runs on TanStack Start with **server-side rendering and server
functions** (Nuru AI, YouTube discovery). Those run on the server, not in the
browser bundle.

Consequence: the app **cannot** be copied into a Capacitor app as a local
static bundle (`webDir`) — the server half would simply not exist, and Nuru AI,
YouTube search and SSR routes would fail offline in the shell.

Supported path: **Capacitor with a remote server URL**, pointing the native
shell at the published Nuru Faith deployment. This is a legitimate Play Store
pattern as long as native capabilities (push, share, camera, deep links) are
added through Capacitor plugins, which is what section 4 covers.

## 2. Available today (no build step required)

- Installable PWA: `public/manifest.webmanifest`, maskable icons, theme colour
  `#06152A`, standalone display.
- Mobile-first layout, safe-area insets for gesture bars and notches, 44px+
  touch targets, bottom navigation that clears the Android nav bar.
- Add to Home Screen works in Chrome on Android immediately after publishing.

Offline caching / service worker is intentionally **not** enabled yet. It must
be added with `vite-plugin-pwa` (`generateSW`), never hand-written, and must
never register in the Lovable preview.

## 3. App identity

| Field | Value |
| --- | --- |
| App name | Nuru Faith |
| Short name | Nuru |
| Package ID | `com.nurufaith.app` |
| Theme colour | `#06152A` |
| Background colour | `#06152A` |
| Target SDK | 36 (Android 16) |
| Min SDK | 23 |

## 4. Capacitor wrapper steps (run locally, not in Lovable)

```bash
npm i @capacitor/core @capacitor/cli @capacitor/android
npx cap init "Nuru Faith" com.nurufaith.app --web-dir=dist/client
npx cap add android
```

`capacitor.config.ts`:

```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nurufaith.app',
  appName: 'Nuru Faith',
  webDir: 'dist/client',
  server: {
    // Points the shell at the deployed Nuru Faith app (SSR + server functions).
    url: 'https://<your-published-domain>',
    cleartext: false,
  },
  android: { backgroundColor: '#06152A' },
};

export default config;
```

Then:

```bash
npm run build
npx cap sync android
npx cap open android      # Android Studio
```

## 5. Deep links (App Links)

In `AndroidManifest.xml`, add an intent filter for
`https://<your-domain>` with `android:autoVerify="true"`, and publish
`/.well-known/assetlinks.json` containing the release signing certificate
SHA-256 fingerprint.

Routes worth deep-linking: `/home`, `/reels`, `/bible`, `/community`,
`/church`, `/events`, `/music`.

## 6. Permissions

Request only what is used, and only at point of use:

- `INTERNET` — required.
- `POST_NOTIFICATIONS` (Android 13+) — only if push is enabled.
- Camera / media picker — only when the user uploads a reel or avatar.

No background location, no contacts, no SMS.

## 7. Building APK vs AAB

- **APK (testing):** Android Studio → Build → Build Bundle(s)/APK(s) → Build
  APK(s). Sideload to a device for QA.
- **AAB (Play Store):** Build → Generate Signed Bundle → Android App Bundle,
  signed with the upload key. Enrol in Play App Signing.

Keep the keystore out of source control. Bump `versionCode` on every upload and
`versionName` for user-visible releases.

## 8. Play Store checklist

- Privacy policy URL (data collected: account email, profile, activity).
- Data safety form: account data, user content, app activity; no data sale.
- Account deletion: in-app under Profile → Settings, plus a public web URL.
- Content rating questionnaire (religious/social app with user content).
- User-generated content policy: reporting and moderation exist for reels,
  comments and posts.
- YouTube content: playback is via the official YouTube player only. Nuru Faith
  performs no downloading, extraction, background playback or ad blocking.
- Screenshots: phone (min 2), plus feature graphic 1024x500.

## 9. QA before release

Test on 320px, 360px, 412px and 430px widths: navigation, reels playback,
YouTube player, keyboard handling on forms, Android back button behaviour,
offline banner, and sign-in/sign-out.
