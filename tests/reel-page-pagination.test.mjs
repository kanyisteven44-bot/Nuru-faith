import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { isPresentableReel } from "../src/lib/reelPresentation.ts";

// Exercise the actual service without credentials or database writes.
function service(rows, { viewed = [], fail = false } = {}) {
  const calls = [];
  const supabase = { from(table) {
    const call = { table, orders: [], filters: [], range: null };
    calls.push(call);
    const q = {
      select() { return q; },
      eq(key, value) { call.filters.push([key, value]); return q; },
      in(key, values) { call.filters.push([key, values]); return q; },
      order(key, options) { call.orders.push([key, options]); return q; },
      range(from, to) { call.range = [from, to]; return q; },
      then(resolve) {
        call.executed = true;
        let data = table === "reels" ? rows : viewed.map(reel_id => ({ reel_id }));
        if (table === "reels") {
          data = data.filter(row => call.filters.every(([key, value]) =>
            Array.isArray(value) ? value.includes(row[key]) : row[key] === value));
          data = [...data].sort((a, b) => {
            for (const [key, options] of call.orders) {
              if (a[key] !== b[key]) return (a[key] < b[key] ? -1 : 1) * (options.ascending ? 1 : -1);
            }
            return 0;
          });
          if (call.range) data = data.slice(call.range[0], call.range[1] + 1);
        }
        return Promise.resolve({ data, error: fail ? { message: "permission denied" } : null }).then(resolve);
      },
    };
    return q;
  }};
  const module = { exports: {} };
  const source = fs.readFileSync(new URL("../src/services/reels.ts", import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  }}).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require(name) {
    if (name === "@/integrations/supabase/client") return { supabase };
    if (name === "@/lib/reelPresentation") return { isPresentableReel };
    if (name === "@/lib/postMusic") return { POST_MUSIC_BY_ID: new Map() };
    if (name === "@/lib/reelWatchData") return { fetchWatchedVideoIds: async () => new Set() };
    throw Error(`Unexpected import: ${name}`);
  }});
  return { fetch: module.exports.fetchReelPage, calls };
}
const params = { feed: "For You", userId: null, interests: [], churchId: null, followingIds: [] };
const rows = Array.from({ length: 96 }, (_, i) => ({
  id: String(i).padStart(3, "0"), created_at: "2026-10-14T00:00:00Z",
  status: "published", creator_name: "Youth", source_type: "user_upload",
  external_id: null, video_url: `https://example.test/${i}.mp4`, topic: null,
}));

test("successive candidate windows preserve all 96 unseen reels, including timestamp ties", async () => {
  const s = service(rows);
  const first = await s.fetch({ ...params, page: 0 });
  // A different physical row order must not change page boundaries.
  rows.reverse();
  const second = await s.fetch({ ...params, page: 1 });
  rows.reverse();
  assert.equal(first.items.length, 48);
  assert.equal(second.items.length, 48);
  assert.equal(new Set([...first.items, ...second.items].map(row => row.id)).size, 96);
  assert.equal(first.hasMore, true);
  assert.deepEqual(s.calls.filter(c => c.table === "reels").map(c => c.range), [[0, 47], [48, 95]]);
});

test("an entirely watched window still advances to unseen content and stops after exhaustion", async () => {
  const s = service(rows, { viewed: rows.slice(48).map(row => row.id) });
  const first = await s.fetch({ ...params, userId: "qa", page: 0 });
  assert.equal(first.items.length, 0);
  assert.equal(first.hasMore, true);
  const second = await s.fetch({ ...params, userId: "qa", page: 1 });
  assert.equal(second.items.length, 48);
  const end = await s.fetch({ ...params, userId: "qa", page: 2 });
  assert.equal(end.items.length, 0);
  assert.equal(end.hasMore, false);
});

test("query failures reject and missing feed membership avoids a read", async () => {
  await assert.rejects(service(rows, { fail: true }).fetch({ ...params, page: 0 }), /permission denied/);
  const s = service(rows);
  assert.equal((await s.fetch({ ...params, feed: "Following", page: 0 })).hasMore, false);
  assert.equal((await s.fetch({ ...params, feed: "My Church", page: 0 })).hasMore, false);
  assert.equal(s.calls.some(c => c.executed), false);
});
