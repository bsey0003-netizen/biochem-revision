import { describe, expect, test } from "vitest";
import { advanceDeck, answerDrill, createDeck, createDrill, createMock, finishMock, formatClock, nextDrill } from "./sessions.ts";
import { createRng } from "../../../src/lib/rng.ts";
import type { Question } from "../../../src/content/types.ts";

const q = (id: string, unit = 1): Question => ({
  id, type: "mcq", unit, part: 1, outcome: "o", bloom: "remember", difficulty: 1, source: "slides", stem: id,
  options: [{ id: "a", text: "right", correct: true, why: "" }, { id: "b", text: "wrong", correct: false, why: "" }],
});
const meta = { topicId: null, label: "Mixed", from: null };

describe("drill", () => {
  test("puts unseen questions first, then the weakest", () => {
    const attempts = { seenGood: { seen: 2, correct: 2 }, seenBad: { seen: 2, correct: 0 } };
    const drill = createDrill([q("seenGood"), q("seenBad"), q("new")], attempts, meta, createRng(3));
    expect(drill.queue.map((x) => x.id)).toEqual(["new", "seenBad", "seenGood"]);
  });

  test("answering records the result, builds a streak and locks the question", () => {
    let drill = createDrill([q("x"), q("y")], {}, meta, createRng(1));
    drill = answerDrill(drill, "a", createRng(1));
    expect(drill.results).toEqual([{ id: drill.queue[0].id, correct: true }]);
    expect(drill.streak).toBe(1);
    expect(answerDrill(drill, "b")).toBe(drill);
    drill = answerDrill(nextDrill(drill), "b");
    expect(drill.streak).toBe(0);
    expect(drill.cheer).toBeNull();
  });
});

describe("mock", () => {
  test("draws the format's size and scores on finish", () => {
    const bank = Array.from({ length: 30 }, (_, i) => q(`q${i}`, (i % 3) + 1));
    const mock = createMock(bank, "quick", new Set(), 0, createRng(2));
    expect(mock.questions).toHaveLength(10);
    expect(mock.endsAt).toBe(15 * 60_000);
    const answered = { ...mock, answers: Object.fromEntries(mock.questions.map((x) => [x.id, "a"])) };
    const done = finishMock(answered, 60_000, false);
    expect(done.result?.mark).toBe(10);
    expect(done.result?.usedMs).toBe(60_000);
  });

  test("used time is capped at the time limit", () => {
    const mock = createMock([q("a")], "quick", new Set(), 0);
    expect(finishMock(mock, 99 * 60_000, true).result?.usedMs).toBe(15 * 60_000);
  });

  test("formatClock shows minutes and seconds", () => {
    expect(formatClock(65_000)).toBe("1:05");
    expect(formatClock(-5)).toBe("0:00");
  });
});

describe("deck", () => {
  test("'again' requeues the card, other ratings remove it", () => {
    const deck = createDeck(["c1", "c2"], {}, { topicId: null, from: null }, 0);
    expect(advanceDeck(deck, true).queue).toEqual(["c2", "c1"]);
    expect(advanceDeck(deck, false)).toMatchObject({ queue: ["c2"], reviewed: 1, flipped: false });
  });
});
