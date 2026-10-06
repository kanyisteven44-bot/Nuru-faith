// @lovable.dev/vite-tanstack-config already includes TanStack Start, React,
// Tailwind, TypeScript path resolution and Nitro. We only select the hosting
// target here so external hosts receive the correct server output.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const isNetlify = !!process.env.NETLIFY;
const isVercel = !!process.env.VERCEL;

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
      ? { preset: "vercel" }
      : true,
});
