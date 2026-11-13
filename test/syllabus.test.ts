import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { validateSyllabus, topicForUnit } from "../src/content/syllabus.ts";
import type { Syllabus } from "../src/content/types.ts";

const PART1_UNITS = Array.from({ length: 14 }, (_, i) => i + 1);

const smallSyllabus = (): Syllabus => ({
  part: 1,
  title: "Part 1",
  topics: [
    { id: "a", title: "Topic A", emoji: "🧪", color: "mint", units: [{ unit: 1, title: "One" }, { unit: 2, title: "Two" }] },
    { id: "b", title: "Topic B", emoji: "⚙️", color: "sky", units: [{ unit: 3, title: "Three" }] },
  ],
});

test("a complete, ordered syllabus has no errors", () => {
  assert.deepEqual(validateSyllabus(smallSyllabus(), [1, 2, 3]), []);
});

test("reports a missing unit and a duplicated unit", () => {
  const s = smallSyllabus();
  s.topics[1].units = [{ unit: 2, title: "Two again" }];
  const errors = validateSyllabus(s, [1, 2, 3]).join("|");
  assert.match(errors, /unit 2 appears more than once/);
  assert.match(errors, /unit 3 is missing/);
});

test("units must run in syllabus order across topics", () => {
  const s = smallSyllabus();
  s.topics.reverse();
  assert.match(validateSyllabus(s, [1, 2, 3]).join("|"), /out of order/);
});

test("topics need an id, title, emoji, a known colour and at least one unit", () => {
  const s = smallSyllabus();
  s.topics[0] = { ...s.topics[0], id: "", title: " ", emoji: "", color: "neon" };
  s.topics[1] = { ...s.topics[1], id: "a", units: [] };
  const errors = validateSyllabus(s, [1, 2]).join("|");
  for (const word of ["id", "title", "emoji", "colour", "no units"]) assert.match(errors, new RegExp(word));
});

test("topicForUnit finds the topic containing a unit", () => {
  assert.equal(topicForUnit(smallSyllabus(), 2)?.id, "a");
  assert.equal(topicForUnit(smallSyllabus(), 9), undefined);
});

test("the real Part 1 syllabus covers Units 1–14 and groups them like the slide decks", () => {
  const syllabus: Syllabus = JSON.parse(readFileSync(join(import.meta.dirname, "..", "syllabus", "part1.json"), "utf8"));
  assert.deepEqual(validateSyllabus(syllabus, PART1_UNITS), []);
  assert.deepEqual(
    syllabus.topics.map((t) => t.units.map((u) => u.unit)),
    [[1, 2, 3], [4, 5], [6, 7, 8], [9], [10], [11, 12, 13], [14]],
  );
});
