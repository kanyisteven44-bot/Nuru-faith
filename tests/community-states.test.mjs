import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as jsx from "react/jsx-runtime";
import { COMMUNITY_KIND_FOR_TAB } from "../src/lib/communityFeed.ts";

const success = (data = []) => ({
  data,
  isLoading: false,
  isPending: false,
  isSuccess: true,
  isError: false,
});
const pending = { isLoading: true, isPending: true, isSuccess: false, isError: false };
const failed = { isLoading: false, isPending: false, isSuccess: false, isError: true };
function renderCommunity({
  tab = "All",
  feed = success({ pages: [[]] }),
  following = success(),
  groups = success(),
  mine = success(),
  updating = false,
} = {}) {
  const code = ts.transpileModule(
    fs.readFileSync("src/routes/_authenticated/community.tsx", "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
    },
  ).outputText;
  const module = { exports: {} };
  const box = ({ children }) => React.createElement("div", null, children);
  const noOp = () => null;
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    require(name) {
      if (name === "react") return { ...React, useState: () => [tab, () => {}] };
      if (name === "react/jsx-runtime") return jsx;
      if (name === "@tanstack/react-router")
        return {
          createFileRoute: () => (config) => config,
          Link: ({ children, to, ...props }) =>
            React.createElement("a", { href: to, ...props }, children),
        };
      if (name === "@tanstack/react-query")
        return {
          useQuery: ({ queryKey }) =>
            queryKey[0] === "following"
              ? following
              : queryKey[0] === "groups"
                ? groups
                : queryKey[0] === "my-group-ids"
                  ? mine
                  : success(),
          useInfiniteQuery: () => feed,
          useQueryClient: () => ({ invalidateQueries: async () => {} }),
          useMutation: () => ({
            isPending: updating,
            variables: { groupId: "group-1" },
            mutate: () => {},
          }),
        };
      if (name === "@/hooks/useAuth") return { useAuth: () => ({ userId: "member-1" }) };
      if (name === "@/lib/communityFeed") return { COMMUNITY_KIND_FOR_TAB };
      if (name === "@/components/nuru/AppShell")
        return { AppShell: box, BrandBar: noOp, Avatar: noOp };
      if (name === "@/components/nuru/Primitives")
        return {
          PillTabs: noOp,
          CardSkeleton: () => React.createElement("div", { role: "status" }, "Loading"),
          ErrorState: ({ message }) => React.createElement("div", { role: "alert" }, message),
          EmptyState: ({ title }) => React.createElement("div", null, title),
        };
      if (name === "lucide-react") return new Proxy({}, { get: () => noOp });
      if (name === "sonner") return { toast: { error: () => {} } };
      if (name.includes("PostCard")) return { PostCard: noOp };
      if (name.includes("PersonRow")) return { PersonRow: noOp };
      if (name.includes("/services/")) return { COMMUNITY_PAGE_SIZE: 20, PEOPLE_PAGE_SIZE: 20 };
      throw new Error(`Unexpected dependency ${name}`);
    },
  });
  return renderToStaticMarkup(React.createElement(module.exports.Route.component));
}

test("failed feed shows a retry error without falsely claiming there are no posts", () => {
  const html = renderCommunity({ feed: failed });
  assert.match(html, /role="alert"/);
  assert.doesNotMatch(html, /No posts yet/);
});
test("Following waits for the follow list and reports follow-list failures", () => {
  const loading = renderCommunity({
    tab: "Following",
    following: pending,
    feed: { ...pending, isLoading: false },
  });
  assert.match(loading, /role="status"/);
  assert.doesNotMatch(loading, /Nothing from people/);
  const error = renderCommunity({
    tab: "Following",
    following: failed,
    feed: { ...pending, isLoading: false },
  });
  assert.match(error, /role="alert"/);
  assert.doesNotMatch(error, /Nothing from people/);
});
test("successful empty feeds still show the appropriate empty state", () => {
  assert.match(renderCommunity(), /No posts yet/);
  assert.match(renderCommunity({ tab: "Following" }), /Nothing from people you follow/);
});
test("failed group listing shows an error instead of no groups", () => {
  const html = renderCommunity({ tab: "Groups", groups: failed });
  assert.match(html, /role="alert"/);
  assert.doesNotMatch(html, /No groups yet/);
});
test("membership buttons wait for membership data and block repeats while updating", () => {
  const groups = success([{ id: "group-1", name: "Youth", member_count: 10 }]);
  const waiting = renderCommunity({ tab: "Groups", groups, mine: pending });
  assert.match(waiting, /<button[^>]*disabled=""/);
  const updating = renderCommunity({ tab: "Groups", groups, updating: true });
  assert.match(updating, /<button[^>]*disabled=""[^>]*aria-busy="true"/);
  assert.match(updating, /Updating…/);
  assert.doesNotMatch(renderCommunity({ tab: "Groups", groups }), /<button[^>]*disabled=/);
});
