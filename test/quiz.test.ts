import { test } from "node:test";
import assert from "node:assert/strict";
import { shuffle, shuffleOptions, buildMockExam, scoreExam } from "../src/quiz/quiz.ts";
import { createRng } from "../src/lib/rng.ts";
import type { Question } from "../src/content/types.ts";

const makeQuestion = (unit: number, n: number): Question => ({
  id: `u${unit}-q${String(n).padStart(3, "0")}`,
  type: "mcq",
  unit,
  part: 1,
  outcome: "o",
  bloom: "understand",
  difficulty: 2,
  source: "slides",
  stem: `Question ${n} of unit ${unit}`,
  options: ["a", "b", "c", "d"].map((id, i) => ({ id, text: `${id}${n}`, correct: i === 0, why: "w" })),
});

const bank = [
  ...Array.from({ length: 16 }, (_, i) => makeQuestion(10, i + 1)),
  ...Array.from({ length: 18 }, (_, i) => makeQuestion(12, i + 1)),
];

test("createRng is deterministic per seed", () => {
  const a = createRng(5);
  const b = createRng(5);
  assert.deepEqual([a(), a(), a()], [b(), b(), b()]);
});

test("shuffle returns a permutation without mutating the input", () => {
  const input = [1, 2, 3, 4, 5, 6, 7, 8];
  const copy = [...input];
  const out = shuffle(input, createRng(1));
  assert.deepEqual(input, copy);
  assert.deepEqual([...out].sort((x, y) => x - y), copy);
  assert.notDeepEqual(out, copy);
});

test("shuffleOptions keeps exactly one correct option with its explanation", () => {
  const q = makeQuestion(10, 1);
  const positions = new Set<number>();
  for (let seed = 0; seed < 40; seed += 1) {
    const s = shuffleOptions(q, createRng(seed));
    const correct = s.options.filter((o) => o.correct);
    assert.equal(correct.length, 1);
    assert.equal(correct[0].text, "a1");
    positions.add(s.options.findIndex((o) => o.correct));
  }
  assert.equal(positions.size, 4, "correct answer should land in every position across seeds");
  assert.equal(q.options[0].correct, true, "original question is not mutated");
});

test("buildMockExam picks the requested number of distinct questions, spread across units", () => {
  const exam = buildMockExam(bank, 10, createRng(3));
  assert.equal(exam.length, 10);
  assert.equal(new Set(exam.map((q) => q.id)).size, 10);
  const perUnit = (u: number) => exam.filter((q) => q.unit === u).length;
  assert.ok(Math.abs(perUnit(10) - perUnit(12)) <= 1, `unbalanced: ${perUnit(10)} vs ${perUnit(12)}`);
});

test("buildMockExam returns the whole bank when asked for more than exists", () => {
  assert.equal(buildMockExam(bank.slice(0, 5), 25, createRng(1)).length, 5);
});

test("scoreExam counts correct answers overall and per unit, as a mark out of 10", () => {
  const exam = [makeQuestion(10, 1), makeQuestion(10, 2), makeQuestion(12, 1), makeQuestion(12, 2)];
  const answers = { "u10-q001": "a", "u10-q002": "b", "u12-q001": "a" }; // u12-q002 unanswered
  const score = scoreExam(exam, answers);
  assert.equal(score.correct, 2);
  assert.equal(score.total, 4);
  assert.equal(score.mark, 5);
  assert.deepEqual(score.byUnit, { 10: { correct: 1, total: 2 }, 12: { correct: 1, total: 2 } });
});
