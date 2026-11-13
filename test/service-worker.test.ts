import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { buildServiceWorker, precacheList } from "../scripts/service-worker.ts";

test("precacheList keeps app files and drops source maps and the worker itself", () => {
  const list = precacheList(["index.html", "assets/a.js", "assets/a.js.map", "sw.js", "icon.svg"]);
  assert.deepEqual(list, ["./", "./assets/a.js", "./icon.svg", "./index.html"]);
});

test("the cache name changes whenever the file list changes", () => {
  const a = buildServiceWorker(["./", "./assets/a.js"]);
  const b = buildServiceWorker(["./", "./assets/b.js"]);
  const cacheName = (sw: string) => /const CACHE = "([^"]+)"/.exec(sw)?.[1];
  assert.ok(cacheName(a));
  assert.notEqual(cacheName(a), cacheName(b));
  assert.equal(cacheName(a), cacheName(buildServiceWorker(["./", "./assets/a.js"])));
});

test("the generated worker is valid JavaScript that registers its handlers", () => {
  const events: string[] = [];
  const self = { addEventListener: (type: string) => events.push(type), location: { origin: "https://x.test" } };
  vm.runInNewContext(buildServiceWorker(["./"]), { self, caches: {}, fetch: () => {}, URL });
  assert.deepEqual(events.sort(), ["activate", "fetch", "install", "message"]);
});

test("the worker only handles same-origin GET requests", () => {
  const sw = buildServiceWorker(["./"]);
  assert.match(sw, /request\.method !== "GET"/);
  assert.match(sw, /url\.origin !== self\.location\.origin/);
});

test("a content fingerprint changes the cache name even when file names are unchanged", () => {
  const name = (sw: string) => /const CACHE = "([^"]+)"/.exec(sw)?.[1];
  assert.notEqual(name(buildServiceWorker(["./"], "v1")), name(buildServiceWorker(["./"], "v2")));
});
