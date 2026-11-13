import { describe, expect, test } from "vitest";
import { createCatalog } from "./catalog.ts";
import type { Syllabus, UnitFile, Question, Flashcard } from "../../../src/content/types.ts";

const q = (unit: number, n: number, outcome = "o1"): Question => ({
  id: `u${unit}-q00${n}`, type: "mcq", unit, part: 1, outcome, bloom: "remember", difficulty: 1, source: "slides", stem: `s${unit}${n}`,
  options: [{ id: "a", text: "x", correct: true, why: "w" }],
});
const f = (unit: number, n: number): Flashcard => ({ id: `u${unit}-f00${n}`, type: "flashcard", unit, part: 1, outcome: "o1", source: "slides", front: "f", back: "b" });
const unit = (n: number): UnitFile => ({
  unit: n, title: `Unit ${n} title`, outcomes: ["o1"],
  summary: { overview: "o", sections: [], keyTerms: [], examTips: [] },
  questions: [q(n, 1), q(n, 2)], flashcards: [f(n, 1)],
});
const syllabus: Syllabus = {
  part: 1, title: "Part 1",
  topics: [
    { id: "a", title: "Topic A", emoji: "🧪", color: "mint", units: [{ unit: 1, title: "One" }, { unit: 2, title: "Two" }, { unit: 3, title: "Three" }] },
    { id: "b", title: "Topic B", emoji: "⚡", color: "lemon", units: [{ unit: 4, title: "Four" }] },
    { id: "c", title: "Topic C", emoji: "🔒", color: "rose", units: [{ unit: 5, title: "Five" }] },
  ],
};
const catalog = createCatalog(syllabus, [unit(3), unit(1), unit(4)]);

describe("catalog", () => {
  test("indexes questions and flashcards in unit order", () => {
    expect(catalog.questions.map((x) => x.id)).toEqual(["u1-q001", "u1-q002", "u3-q001", "u3-q002", "u4-q001", "u4-q002"]);
    expect(catalog.flashcards).toHaveLength(3);
  });

  test("finds topics by id and by unit", () => {
    expect(catalog.topicById("b")?.title).toBe("Topic B");
    expect(catalog.topicById("zzz")).toBeUndefined();
    expect(catalog.topicOf(3)?.id).toBe("a");
  });

  test("describes unit ranges", () => {
    expect(catalog.unitRange(catalog.topicById("a")!)).toBe("Units 1–3");
    expect(catalog.unitRange(catalog.topicById("b")!)).toBe("Unit 4");
  });

  test("a topic is ready when at least one of its units has content", () => {
    expect(catalog.isReady(catalog.topicById("a")!)).toBe(true);
    expect(catalog.isReady(catalog.topicById("c")!)).toBe(false);
  });

  test("filters questions and cards by topic", () => {
    expect(catalog.questionsOf(catalog.topicById("b")!).map((x) => x.unit)).toEqual([4, 4]);
    expect(catalog.cardsOf(catalog.topicById("a")!)).toHaveLength(2);
    expect(catalog.cardsOf(null)).toHaveLength(3);
  });

  test("gives unit titles, with a fallback", () => {
    expect(catalog.unitTitle(2)).toBe("Two");
    expect(catalog.unitTitle(99)).toBe("Unit 99");
  });
});
