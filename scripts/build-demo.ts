/**
 * Builds the clickable demo as ONE self-contained file (demo/index.html) that opens by double-click.
 * The pure TS modules in src/ are type-stripped and inlined, so the demo runs the same tested logic.
 * Usage: npm run demo
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { stripTypeScriptTypes } from "node:module";
import { loadUnitFiles, loadSyllabus } from "./check-content.ts";

const ROOT = join(import.meta.dirname, "..");
/** Dependency order matters: later modules use names defined by earlier ones. */
const LIBRARY_FILES = ["src/lib/rng.ts", "src/calc/michaelisMenten.ts", "src/quiz/quiz.ts", "src/srs/leitner.ts"];

const RELATIVE_IMPORT = /^\s*import\s[^;]*?from\s+["']\.{1,2}\/[^"']+["'];?\s*$/gm;
const EXPORTED_CONST = /^export\s+const\s+(\w+)/gm;

/** Strips types, drops relative imports and `export`, and exposes exported names on globalThis.BR. */
export const bundleLibraries = (files: readonly string[] = LIBRARY_FILES): string => {
  const names: string[] = [];
  const bodies = files.map((file) => {
    const js = stripTypeScriptTypes(readFileSync(join(ROOT, file), "utf8"), { mode: "strip" });
    for (const match of js.matchAll(EXPORTED_CONST)) names.push(match[1]);
    return `// ${file}\n${js.replace(RELATIVE_IMPORT, "").replace(/^export\s+/gm, "")}`;
  });
  return `(() => {\n"use strict";\n${bodies.join("\n")}\nglobalThis.BR = Object.freeze({ ${names.join(", ")} });\n})();`;
};

/** JSON safe to embed inside <script>: no '<' (so no </script>), and JS line separators escaped. */
const LINE_SEPARATOR = String.fromCharCode(0x2028);
const PARAGRAPH_SEPARATOR = String.fromCharCode(0x2029);

export const jsonForScript = (value: unknown): string =>
  JSON.stringify(value)
    .replaceAll("<", "\\u003c")
    .replaceAll(LINE_SEPARATOR, "\\u2028")
    .replaceAll(PARAGRAPH_SEPARATOR, "\\u2029");

const fill = (template: string, slots: Record<string, string>): string =>
  Object.entries(slots).reduce((html, [slot, value]) => html.split(slot).join(value), template);

const buildDemo = (): void => {
  const units = loadUnitFiles()
    .map(({ file }) => file)
    .sort((a, b) => a.unit - b.unit);
  const pathwayDir = join(ROOT, "pathways");
  const pathways = readdirSync(pathwayDir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => JSON.parse(readFileSync(join(pathwayDir, name), "utf8")));
  const demoSrc = (name: string) => readFileSync(join(ROOT, "demo", "src", name), "utf8");

  const html = fill(demoSrc("template.html"), {
    "/*__STYLES__*/": demoSrc("styles.css"),
    "__DATA__": jsonForScript({ syllabus: loadSyllabus(), units, pathways, builtAt: new Date().toISOString().slice(0, 10) }),
    "/*__LIB__*/": bundleLibraries(),
    "/*__APP__*/": demoSrc("app.js"),
  });
  const out = join(ROOT, "demo", "index.html");
  writeFileSync(out, html);
  console.log(`Wrote ${out} (${(html.length / 1024).toFixed(0)} KB)`);
};

if (import.meta.main) buildDemo();
