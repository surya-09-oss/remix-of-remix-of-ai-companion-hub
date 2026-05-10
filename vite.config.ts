// Vercel-compatible build. Cloudflare plugin disabled; TanStack Start targets Vercel.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const isVercel = !!process.env.VERCEL;

export default defineConfig({
  cloudflare: isVercel ? false : undefined,
  tanstackStart: isVercel
    ? { target: "vercel" }
    : { server: { entry: "server" } },
});
