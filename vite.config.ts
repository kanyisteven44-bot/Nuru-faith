// @lovable.dev/vite-tanstack-config already includes TanStack Start, React,
// Tailwind, TypeScript path resolution and Nitro. We only select the hosting
// target here so external hosts receive the correct server output.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const isNetlify = !!process.env["NETLIFY"];
const isVercel = !!process.env["VERCEL"];
// Keep the youth app on its own domains. Do not add host-based ministry
// rewrites to Nitro's generated Vercel routes: those override vercel.json.
const vercelNitro = { preset: "vercel" };

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    server: { entry: "server" },
  },
  // Lovable keeps its own preview target. External CI selects the matching
  // Nitro preset so SSR, server routes and server functions are deployable.
  nitro: isNetlify ? { preset: "netlify" } : isVercel ? vercelNitro : true,
});
