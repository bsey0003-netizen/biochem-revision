import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { bundleLibraries, jsonForScript } from "../scripts/build-demo.ts";

const runBundle = (): Record<string, any> => {
  const context: Record<string, any> = {};
  vm.runInNewContext(bundleLibraries(), context);
  return context.BR;
};

test("bundled libraries run without imports and expose their functions on BR", () => {
  const BR = runBundle();
  assert.equal(BR.velocity(100, 2, 2), 50);
  assert.equal(typeof BR.generateMichaelisMenten(1).prompt, "string");
  assert.equal(BR.shuffle([1, 2, 3], BR.createRng(1)).length, 3);
  // Objects from the vm context have a different prototype, so compare by value.
  assert.equal(JSON.stringify(BR.reviewCard(undefined, "good", 0)), JSON.stringify({ box: 1, due: BR.DAY_MS }));
  assert.equal(BR.scoreExam([], {}).mark, 0);
});

test("bundle contains no leftover import/export statements or TypeScript types", () => {
  const code = bundleLibraries();
  assert.doesNotMatch(code, /^\s*(import|export)\s/m);
  assert.doesNotMatch(code, /:\s*Rng\b/);
});

test("jsonForScript escapes characters that could close the script tag", () => {
  const out = jsonForScript({ text: "</script><img src=x onerror=alert(1)> &  " });
  assert.doesNotMatch(out, /<\/script>/i);
  assert.doesNotMatch(out, /</);
  assert.deepEqual(JSON.parse(out), { text: "</script><img src=x onerror=alert(1)> &  " });
});
