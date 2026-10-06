import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const shell = readFileSync("src/components/nuru/AdminCommandShell.tsx", "utf8");
const dashboard = readFileSync("src/components/nuru/AdminDashboardOverview.tsx", "utf8");
const roles = readFileSync("src/lib/adminRoles.functions.ts", "utf8");
const migration = readFileSync(
  "supabase/migrations/20261006133000_lock_user_roles_to_super_admin_aal2.sql",
  "utf8",
);

test("admin command center keeps the approved navigation structure", () => {
  for (const label of [
    "Dashboard",
    "Users",
    "Churches",
    "Content",
    "Music",
    "Reels",
    "Community",
    "Messages",
    "Reports",
    "Roles",
    "Settings",
  ]) {
    assert.match(shell, new RegExp(label));
  }
  assert.match(shell, /Nuru Faith Admin/);
  assert.match(shell, /Manage\. Empower\. Build a brighter generation\./);
});

test("admin dashboard uses real operational data instead of mock metrics", () => {
  assert.match(dashboard, /media_sources/);
  assert.match(dashboard, /media_items/);
  assert.match(dashboard, /profiles/);
  assert.match(dashboard, /churches/);
  assert.match(dashboard, /posts/);
  assert.match(dashboard, /Pending Approvals/);
  assert.match(dashboard, /Recent Activity/);
  assert.match(dashboard, /Quick Actions/);
  assert.match(dashboard, /System Status/);
  assert.doesNotMatch(dashboard, /48,729|12,384|23,456/);
});

test("role management is Super Admin and AAL2 protected in app and database", () => {
  assert.match(roles, /assertSuperAdmin/);
  assert.match(roles, /assertAdminWriteAssurance/);
  assert.match(roles, /You cannot remove your own Super Admin access/);
  assert.match(migration, /private\.has_role\(\(select auth\.uid\(\)\), 'super_admin'/);
  assert.match(migration, /auth\.jwt\(\)->>'aal'/);
  assert.match(migration, /super admins manage roles insert/);
  assert.match(migration, /super admins manage roles update/);
  assert.match(migration, /super admins manage roles delete/);
});
