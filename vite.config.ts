// @lovable.dev/vite-tanstack-config includes TanStack Start and Nitro.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const isNetlify = !!process.env["NETLIFY"];
const isVercel = !!process.env["VERCEL"];

// The apex domain serves the youth app directly. The ministry is independently
// deployed to ministry.nurufaith.co.ke; never proxy apex requests to it.
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  nitro: isNetlify ? { preset: "netlify" } : isVercel ? { preset: "vercel" } : true,
});
