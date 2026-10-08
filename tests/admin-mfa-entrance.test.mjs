import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("admin command center refuses to mount before verified MFA", () => {
  const src = read("src/routes/_authenticated/admin.tsx");
  const guard = src.indexOf('if (access === "none")');
  const dashboard = src.indexOf("<AdminV3Screen");
  assert.ok(guard !== -1 && dashboard > guard);
  assert.match(src, /setAccess\("checking"\)/);
  assert.match(src, /await getMfaRequirement\(\)/);
  assert.match(src, /setAccess\("error"\)/);
  assert.match(src, /access === "challenge"/);
  assert.match(src, /<MfaChallenge[^>]+onSuccess=/);
  assert.match(src, /access === "setup"/);
  assert.match(src, /<MfaSecurityPanel required onReady=/);
  assert.match(src, /name: "robots", content: "noindex, nofollow"/);
});

test("MFA requirement is scoped to privileged staff, and validates session assurance", () => {
  const src = read("src/lib/accountSecurity.ts");
  assert.match(src, /getAuthenticatorAssuranceLevel\(\)/);
  assert.match(src, /assurance.nextLevel === "aal2" && assurance.currentLevel !== "aal2"/);
  assert.match(src, /STAFF_ROLES = new Set\(\["super_admin", "moderator", "church_admin"\]\)/);
  assert.match(src, /if \(!isStaff\) return "none"/);
  assert.match(src, /return hasVerifiedTotp \? "none" : "setup"/);
});

test("existing admin permissions and AAL2 high-impact write protection remain", () => {
  const panel = read("src/components/nuru/AdminV3Screen.tsx");
  const db = read("supabase/migrations/20261006133000_lock_user_roles_to_super_admin_aal2.sql");
  assert.match(panel, /if \(!isAdmin\)/);
  assert.match(db, /super_admin/);
  assert.match(db, /aal2/);
});
