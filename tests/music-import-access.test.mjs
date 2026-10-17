import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { z } from "zod";
import { assertAdminWriteAssurance } from "../src/lib/adminDirectoryAccess.ts";
import { processCatalogPage } from "../src/lib/musicCatalogEngine.ts";
import { catalogueTarget } from "../src/lib/catalogTargets.ts";
function load(db) {
  let privilegedLoads = 0;
  const module = { exports: {} };
  const code = ts.transpileModule(readFileSync("src/lib/musicCatalog.functions.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    crypto,
    URL,
    URLSearchParams,
    AbortSignal,
    process,
    fetch,
    require: (name) => {
      if (name === "@tanstack/react-start")
        return {
          createServerFn: () => ({
            middleware() {
              return this;
            },
            validator() {
              return this;
            },
            handler(fn) {
              return fn;
            },
          }),
        };
      if (name === "zod") return { z };
      if (name === "@/integrations/supabase/auth-middleware") return { requireSupabaseAuth: {} };
      if (name === "./adminDirectoryAccess") return { assertAdminWriteAssurance };
      if (name === "./catalogTargets") return { catalogueTarget };
      if (name === "./musicCatalogEngine") return { processCatalogPage };
      if (name === "@/integrations/supabase/client.server") {
        privilegedLoads++;
        return { supabaseAdmin: db };
      }
      throw new Error("Unexpected dependency " + name);
    },
  });
  return { api: module.exports, loads: () => privilegedLoads };
}
const data = { kind: "music", restart: false, refreshTotal: false, channelIds: [] };
const context = (roles, aal) => ({
  userId: "staff",
  claims: { aal },
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ in: async () => ({ data: roles, error: null }) }) }),
    }),
  },
});

test("ordinary members cannot load privileged importer credentials", async () => {
  const loaded = load({});
  await assert.rejects(
    () =>
      loaded.api.importReviewedCatalogPage({
        data,
        context: context(
          [{ role: "member" }].filter((r) => ["super_admin", "moderator"].includes(r.role)),
          "aal2",
        ),
      }),
    /Only Nuru administrators/,
  );
  assert.equal(loaded.loads(), 0);
});
test("AAL1 staff cannot import and invalid global resets do not load the privileged client", async () => {
  const loaded = load({});
  await assert.rejects(
    () =>
      loaded.api.importReviewedCatalogPage({
        data,
        context: context([{ role: "super_admin" }], "aal1"),
      }),
    /authenticator/,
  );
  await assert.rejects(
    () =>
      loaded.api.importReviewedCatalogPage({
        data: { ...data, restart: true },
        context: context([{ role: "super_admin" }], "aal2"),
      }),
    /Select specific creators/,
  );
  assert.equal(loaded.loads(), 0);
});
test("a competing worker lease stops a batch before any provider or checkpoint calls", async () => {
  const loaded = load({
    from: () => ({
      update: () => ({
        eq: () => ({
          or: () => ({
            select: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
          }),
        }),
      }),
    }),
    rpc: () => assert.fail("No checkpoint calls allowed"),
  });
  const old = process.env.YOUTUBE_API_KEY;
  process.env.YOUTUBE_API_KEY = "test-only";
  try {
    await assert.rejects(
      () =>
        loaded.api.importReviewedCatalogPage({
          data,
          context: context([{ role: "moderator" }], "aal2"),
        }),
      /Another import batch/,
    );
    assert.equal(loaded.loads(), 1);
  } finally {
    old === undefined ? delete process.env.YOUTUBE_API_KEY : (process.env.YOUTUBE_API_KEY = old);
  }
});
