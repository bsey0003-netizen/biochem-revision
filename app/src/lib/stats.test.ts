import { describe, expect, test } from "vitest";
import { percent, statsFor, weakOutcomes } from "./stats.ts";
import type { Question } from "../../../src/content/types.ts";

const q = (id: string, unit: number, outcome: string): Question => ({
  id, type: "mcq", unit, part: 1, outcome, bloom: "remember", difficulty: 1, source: "slides", stem: id, options: [],
});
const items = [q("a", 1, "o1"), q("b", 1, "o1"), q("c", 2, "o2"), q("d", 3, "o3")];

describe("stats", () => {
  test("percent rounds and handles zero totals", () => {
    expect(percent(1, 3)).toBe(33);
    expect(percent(0, 0)).toBe(0);
  });

  test("statsFor sums attempts over the given questions", () => {
    const progress = { a: { seen: 2, correct: 1 }, c: { seen: 1, correct: 1 } };
    expect(statsFor(items, progress)).toEqual({ answered: 2, seen: 3, correct: 2, total: 4 });
  });

  test("weakOutcomes lists outcomes with ≥2 attempts, weakest first", () => {
    const progress = { a: { seen: 2, correct: 2 }, c: { seen: 3, correct: 0 }, d: { seen: 1, correct: 0 } };
    expect(weakOutcomes(items, progress).map((o) => o.outcome)).toEqual(["o2", "o1"]);
  });
});
