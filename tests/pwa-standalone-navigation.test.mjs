import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  isInstalledApp,
  isLegacyNuruHost,
  loginCallbackOrigin,
} from "../src/lib/pwaMode.ts";

const read = (file) => readFileSync(new URL("../" + file, import.meta.url), "utf8");

test("PWA launch mode is client-only, and the old Nuru domain remains distinct", () => {
  assert.equal(isInstalledApp(), false);
  assert.equal(isLegacyNuruHost("nurufaith.website"), true);
  assert.equal(isLegacyNuruHost("WWW.NURUFAITH.WEBSITE"), true);
  assert.equal(isLegacyNuruHost("app.nurufaith.co.ke"), false);
});

test("new installed app and browser use the official auth callback origin", () => {
  assert.equal(loginCallbackOrigin(
    "https://app.nurufaith.co.ke", "app.nurufaith.co.ke", true,
  ), "https://app.nurufaith.co.ke");
  assert.equal(loginCallbackOrigin(
    "https://nurufaith.website", "nurufaith.website", false,
  ), "https://app.nurufaith.co.ke");
});

test("legacy installed PWA completes sign-in on its own origin", () => {
  // Switching origin during OAuth opens a second Chrome custom tab; its close
  // (X) is part of Chrome and cannot be hidden by Nuru web UI.
  assert.equal(loginCallbackOrigin(
    "https://nurufaith.website", "nurufaith.website", true,
  ), "https://nurufaith.website");
  assert.equal(loginCallbackOrigin(
    "https://www.nurufaith.website", "www.nurufaith.website", true,
  ), "https://www.nurufaith.website");
});

test("the canonical installation guide never appears in an installed app", () => {
  const src = read("src/components/nuru/PwaInstallGuide.tsx");
  assert.match(src, /beforeinstallprompt/);
  assert.match(src, /appinstalled/);
  assert.match(src, /if \(!ready \|\| installed \|\| window\.location\.hostname !== "app\.nurufaith\.co\.ke"\) return null/);
  assert.match(src, /<button/);
  assert.match(src, /promptEvent\.prompt\(\)/);
  assert.match(src, /Install Nuru Faith/);
  assert.match(src, /Install app/);
  const page = read("src/components/nuru/PublicSeoLanding.tsx");
  const welcome = read("src/routes/welcome.tsx");
  assert.match(page, /<PwaInstallGuide \/>/);
  assert.match(welcome, /<PwaInstallGuide \/>/);
});

test("browser app install does not become an in-app redirect", () => {
  const notice = read("src/components/nuru/LegacyDomainNotice.tsx");
  assert.match(notice, /isInstalledApp\(\)/);
  assert.match(notice, /navigator\.clipboard\.writeText\(destination\)/);
  assert.match(notice, /installed \? \(/);
  assert.match(notice, /Copy the new website address/);
  const auth = read("src/routes/auth.tsx");
  assert.match(auth, /loginCallbackOrigin\(window\.location\.origin, window\.location\.hostname, isInstalledApp\(\), official\)/);
  const config = JSON.parse(read("vercel.json"));
  assert.ok(!(config.redirects ?? []).some((r) => r.has?.some((h) =>
    h.type === "host" && h.value === "nurufaith.website"
  )));
});
