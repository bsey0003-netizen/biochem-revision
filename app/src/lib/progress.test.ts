import { describe, expect, test } from "vitest";
import { emptyProgress, parseProgress, recordAnswer, recordMock, reviewFlashcard, loadProgress, saveProgress, STORE_KEY } from "./progress.ts";

describe("parseProgress", () => {
  test("returns empty progress for missing or malformed data", () => {
    expect(parseProgress(null)).toEqual(emptyProgress());
    expect(parseProgress("nonsense")).toEqual(emptyProgress());
    expect(parseProgress({ q: [], cards: 5, mocks: "x" })).toEqual(emptyProgress());
  });

  test("keeps valid entries and drops invalid ones", () => {
    const parsed = parseProgress({
      q: { "u1-q001": { seen: 2, correct: 1 }, bad: { seen: "2", correct: 1 }, neg: { seen: -1, correct: 0 } },
      cards: { "u1-f001": { box: 2, due: 1000 }, bad: { box: 99, due: 1 } },
      mocks: [{ date: "2026-11-13", mark: 7.2, correct: 18, total: 25 }, { date: 1 }],
    });
    expect(parsed.q).toEqual({ "u1-q001": { seen: 2, correct: 1 } });
    expect(parsed.cards).toEqual({ "u1-f001": { box: 2, due: 1000 } });
    expect(parsed.mocks).toHaveLength(1);
  });

  test("rejects correct counts above seen counts", () => {
    expect(parseProgress({ q: { a: { seen: 1, correct: 3 } } }).q).toEqual({});
  });
});

describe("updates are immutable", () => {
  test("recordAnswer counts attempts and correct answers", () => {
    const start = emptyProgress();
    const once = recordAnswer(start, "u1-q001", true);
    const twice = recordAnswer(once, "u1-q001", false);
    expect(start.q).toEqual({});
    expect(twice.q["u1-q001"]).toEqual({ seen: 2, correct: 1 });
  });

  test("recordMock keeps only the most recent 50 mocks", () => {
    let p = emptyProgress();
    for (let i = 0; i < 55; i += 1) p = recordMock(p, { date: "2026-11-13", mark: i / 10, correct: i, total: 25 });
    expect(p.mocks).toHaveLength(50);
    expect(p.mocks.at(-1)?.correct).toBe(54);
  });

  test("reviewFlashcard schedules the card", () => {
    const p = reviewFlashcard(emptyProgress(), "u1-f001", "good", 0);
    expect(p.cards["u1-f001"]).toEqual({ box: 1, due: 24 * 60 * 60 * 1000 });
  });
});

describe("storage", () => {
  test("round-trips through localStorage", () => {
    const p = recordAnswer(emptyProgress(), "u1-q001", true);
    saveProgress(localStorage, p);
    expect(loadProgress(localStorage)).toEqual(p);
    expect(JSON.parse(localStorage.getItem(STORE_KEY) ?? "{}").version).toBe(1);
  });

  test("survives storage that throws", () => {
    const broken = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
    expect(loadProgress(broken)).toEqual(emptyProgress());
    expect(() => saveProgress(broken, emptyProgress())).not.toThrow();
  });
});
