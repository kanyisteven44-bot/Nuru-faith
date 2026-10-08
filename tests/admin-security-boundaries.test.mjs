import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const roleApi = readFileSync("src/lib/adminRoles.functions.ts", "utf8");
const roleUi = readFileSync("src/components/nuru/AdminRoleManager.tsx", "utf8");
const adminUi = readFileSync("src/components/nuru/AdminV3Screen.tsx", "utf8");
const operations = readFileSync("src/components/nuru/AdminOperationsHub.tsx", "utf8");

test("administrative role mutations require server-side super admin and AAL2", () => {
  assert.match(roleApi, /middleware\(\[requireSuperAdmin\]\)/);
  assert.match(roleApi, /assertAdminWriteAssurance\(context\.claims\.aal\)/);
  assert.match(roleApi, /assertSuperAdmin\(data, !!error\)/);
  assert.match(roleApi, /You cannot remove your own Super Admin access/);
  assert.match(roleApi, /Nuru must keep at least one Super Admin/);
});

test("role UI requires a fresh MFA assurance check before changes", () => {
  assert.match(roleUi, /getAuthenticatorAssuranceLevel\(\)/);
  assert.match(roleUi, /currentLevel !== "aal2"/);
  assert.match(roleUi, /<MfaChallenge/);
  assert.match(roleUi, /await requireAal2\(\)/);
});

test("admin route and operational queries remain role-scoped", () => {
  assert.match(adminUi, /if \(!isAdmin\)/);
  assert.match(adminUi, /enabled: !!userId && isAdmin/);
  assert.match(operations, /isSuperAdmin &&/);
  assert.match(operations, /status not connected/);
  assert.match(operations, /Incident triage/);
});

test("external services are never presented as connected without verification", () => {
  for (const name of ["GitHub", "Vercel", "Supabase", "Truehost", "Social accounts"]) {
    assert.ok(operations.includes(name), name);
  }
  assert.match(operations, /not live integrations/);
});
