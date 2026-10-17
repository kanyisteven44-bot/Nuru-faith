import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function loadService(rows, error = null) {
  let requests = 0;
  const code = ts.transpileModule(fs.readFileSync("src/services/content.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  const supabase = {
    from(table) {
      assert.equal(table, "posts");
      requests++;
      const filters = [],
        orders = [];
      let range = [0, rows.length];
      const q = {
        select() {
          return q;
        },
        eq(key, value) {
          filters.push((row) => row[key] === value);
          return q;
        },
        in(key, values) {
          filters.push((row) => values.includes(row[key]));
          return q;
        },
        order(key, { ascending }) {
          orders.push({ key, ascending });
          return q;
        },
        range(from, to) {
          range = [from, to];
          return q;
        },
        then(resolve, reject) {
          const data = rows
            .filter((row) => filters.every((filter) => filter(row)))
            .sort((a, b) => {
              for (const { key, ascending } of orders) {
                const result = String(a[key]).localeCompare(String(b[key]));
                if (result) return ascending ? result : -result;
              }
              return 0;
            })
            .slice(range[0], range[1] + 1);
          return Promise.resolve({ data, error }).then(resolve, reject);
        },
      };
      return q;
    },
  };
  vm.runInNewContext(code, { module, exports: module.exports, require: () => ({ supabase }) });
  return { ...module.exports, requests: () => requests };
}
const row = (id, kind = "text", author_id = "a") => ({
  id: String(id).padStart(3, "0"),
  kind,
  author_id,
  created_at: "2026-10-17T10:00:00Z",
  profiles: { full_name: "Member", username: "member", avatar_url: null },
});

test("prayer filter finds posts beyond the first unfiltered page", async () => {
  const service = loadService([...Array.from({ length: 25 }, (_, i) => row(i)), row(30, "prayer")]);
  const results = await service.fetchPostPage(0, undefined, "prayer");
  assert.deepEqual(
    Array.from(results, (r) => r.id),
    ["030"],
  );
  assert.equal(results[0].author_name, "Member");
});
test("filtered pages use a stable tie breaker without repeats", async () => {
  const service = loadService(Array.from({ length: 45 }, (_, i) => row(i, "testimony")));
  const first = await service.fetchPostPage(0, undefined, "testimony");
  const second = await service.fetchPostPage(1, undefined, "testimony");
  assert.equal(first[0].id, "044");
  assert.equal(second[0].id, "024");
  assert.equal(new Set([...first, ...second].map((r) => r.id)).size, 40);
});
test("author and kind filters combine, and empty following never queries the global feed", async () => {
  const service = loadService([row(1, "prayer", "a"), row(2, "prayer", "b"), row(3, "text", "a")]);
  const result = await service.fetchPostPage(0, ["a"], "prayer");
  assert.deepEqual(
    Array.from(result, (r) => r.id),
    ["001"],
  );
  await service.fetchPostPage(0, [], "prayer");
  assert.equal(service.requests(), 1);
});
test("database failures remain errors rather than empty feeds", async () => {
  const service = loadService([], { message: "Connection unavailable" });
  await assert.rejects(service.fetchPostPage(0), /Connection unavailable/);
});

test("News uses the stored announcement kind", async () => {
  const { COMMUNITY_KIND_FOR_TAB } = await import("../src/lib/communityFeed.ts");
  assert.equal(COMMUNITY_KIND_FOR_TAB.News, "announcement");
  const service = loadService([row(1, "text"), row(2, "announcement")]);
  const results = await service.fetchPostPage(0, undefined, COMMUNITY_KIND_FOR_TAB.News);
  assert.deepEqual(
    Array.from(results, (r) => r.id),
    ["002"],
  );
});
