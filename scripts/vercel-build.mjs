#!/usr/bin/env node
// Builds the project for Vercel using the Build Output API v3.
// Runs `vite build` (which produces dist/client + dist/server), then
// reshapes the output into .vercel/output/ that Vercel auto-detects.

import { execSync } from "node:child_process";
import { cpSync, mkdirSync, rmSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const outDir = path.join(root, ".vercel", "output");

process.env.VERCEL = process.env.VERCEL ?? "1";

console.log("→ vite build");
execSync("vite build", { stdio: "inherit", env: process.env });

console.log("→ assembling .vercel/output");
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

// Static assets
const staticDir = path.join(outDir, "static");
mkdirSync(staticDir, { recursive: true });
if (existsSync(path.join(root, "dist", "client"))) {
  cpSync(path.join(root, "dist", "client"), staticDir, { recursive: true });
}

// SSR function (Node.js runtime, Web Fetch handler)
const fnDir = path.join(outDir, "functions", "index.func");
mkdirSync(fnDir, { recursive: true });
cpSync(path.join(root, "dist", "server"), fnDir, { recursive: true });

// Wrapper that exports a Web Fetch handler (Vercel Node runtime supports this).
writeFileSync(
  path.join(fnDir, "_entry.mjs"),
  `import server from "./server.js";
export default async function handler(request) {
  return server.fetch(request, process.env, {});
}
`,
);

writeFileSync(
  path.join(fnDir, "package.json"),
  JSON.stringify({ type: "module" }, null, 2),
);

writeFileSync(
  path.join(fnDir, ".vc-config.json"),
  JSON.stringify(
    {
      runtime: "nodejs20.x",
      handler: "_entry.mjs",
      launcherType: "Nodejs",
      shouldAddHelpers: false,
      supportsResponseStreaming: true,
    },
    null,
    2,
  ),
);

// Top-level config: serve /assets/* statically, everything else through SSR.
writeFileSync(
  path.join(outDir, "config.json"),
  JSON.stringify(
    {
      version: 3,
      routes: [
        { handle: "filesystem" },
        { src: "/(.*)", dest: "/index" },
      ],
    },
    null,
    2,
  ),
);

console.log("✓ Vercel output ready at .vercel/output");