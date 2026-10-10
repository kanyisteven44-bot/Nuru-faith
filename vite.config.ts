// @lovable.dev/vite-tanstack-config already includes TanStack Start, React,
// Tailwind, TypeScript path resolution and Nitro. We only select the hosting
// target here so external hosts receive the correct server output.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { readFileSync } from "node:fs";

const isNetlify = !!process.env["NETLIFY"];
const isVercel = !!process.env["VERCEL"];
// Nitro emits Build Output API routes, which take precedence over vercel.json.
// Put host routing before Nitro's filesystem and SSR catch-all routes too.
const domainConfig = JSON.parse(readFileSync(new URL("./vercel.json", import.meta.url), "utf8"));
const domainRoutes = [
  ...domainConfig.redirects.map((rule: { source: string; destination: string; has: unknown[] }) => ({
    src: `^${rule.source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/?$`,
    has: rule.has,
    status: 307,
    headers: { Location: rule.destination },
  })),
  { src: "^/(.*)$", has: [{ type: "host", value: "nurufaith.co.ke" }], dest: "https://nuru-faith-ministry.vercel.app/$1" },
];
const vercelNitro = { preset: "vercel", vercel: { config: { routes: domainRoutes } } };

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    server: { entry: "server" },
  },
  // Lovable keeps its own preview target. External CI selects the matching
  // Nitro preset so SSR, server routes and server functions are deployable.
  nitro: isNetlify
    ? { preset: "netlify" }
    : isVercel
      ? vercelNitro
      : true,
});
