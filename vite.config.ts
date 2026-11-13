/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { buildServiceWorker, precacheList } from "./scripts/service-worker.ts";

const repoRoot = fileURLToPath(new URL(".", import.meta.url));
const publicDir = join(repoRoot, "app", "public");

const listFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? listFiles(path) : [path];
  });

/** Emits sw.js listing every built file, versioned by a hash of their contents. */
const serviceWorker = (): Plugin => ({
  name: "biochem-service-worker",
  enforce: "post",
  apply: "build",
  generateBundle(_options, bundle) {
    const hash = createHash("sha256");
    const files: string[] = [];
    for (const [fileName, output] of Object.entries(bundle)) {
      files.push(fileName);
      hash.update(fileName).update(output.type === "chunk" ? output.code : output.source);
    }
    for (const path of listFiles(publicDir)) {
      const fileName = relative(publicDir, path).split("\\").join("/");
      files.push(fileName);
      hash.update(fileName).update(readFileSync(path));
    }
    this.emitFile({ type: "asset", fileName: "sw.js", source: buildServiceWorker(precacheList(files), hash.digest("hex")) });
  },
});

/** The app lives in app/; shared logic (src/) and content (content/, syllabus/, pathways/) live at the repo root. */
export default defineConfig({
  root: "app",
  base: "/biochem-revision/",
  plugins: [react(), serviceWorker()],
  define: { __BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)) },
  server: { fs: { allow: [repoRoot] } },
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    assetsInlineLimit: 0,
    // All course content is bundled on purpose so the app works offline (~160 kB gzipped).
    chunkSizeWarningLimit: 800,
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["src/test-setup.ts"],
  },
});
