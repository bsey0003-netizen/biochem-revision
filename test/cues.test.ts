import { test } from "node:test";
import assert from "node:assert/strict";
import { lengthCue, bankLengthBalance, absoluteWordCue } from "../src/content/cues.ts";
import type { Question } from "../src/content/types.ts";

const question = (correct: string, ...distractors: string[]): Question => ({
  id: "u1-q001",
  type: "mcq",
  unit: 1,
  part: 1,
  outcome: "o",
  bloom: "remember",
  difficulty: 1,
  source: "slides",
  stem: "s",
  options: [
    { id: "a", text: correct, correct: true, why: "w" },
    ...distractors.map((text, i) => ({ id: String.fromCharCode(98 + i), text, correct: false, why: "w" })),
  ],
});

test("lengthCue passes when the correct option is no longer than the others", () => {
  assert.equal(lengthCue(question("Hydrogen bonds between water", "Covalent bonds between atoms", "Ionic bonds in a crystal", "Van der Waals forces only")), null);
});

test("lengthCue flags a correct option much longer than every distractor", () => {
  const q = question("Hydrogen bonds between the polar side chains of the folded protein", "Covalent bonds", "Ionic bonds", "Disulfide bridges");
  assert.match(lengthCue(q) ?? "", /longer/);
});

test("lengthCue allows a small margin (≤ 20%)", () => {
  assert.equal(lengthCue(question("abcdefghijkl", "abcdefghij", "abc", "abcd")), null);
});

test("lengthCue ignores tiny absolute differences between short answers", () => {
  assert.equal(lengthCue(question("20 mM", "2 mM", "4 mM", "1 mM")), null);
});

test("bankLengthBalance passes a bank where the correct option is rarely the longest", () => {
  const balanced = [
    question("long correct answer!", "short", "tiny", "mini"),
    question("x", "longer distractor", "another long one", "medium one"),
    question("medium length", "longest distractor text", "a", "b"),
    question("medium length", "a", "b", "longest distractor text"),
  ];
  assert.deepEqual(bankLengthBalance(balanced), []);
});

test("bankLengthBalance flags a bank where the correct option is usually the longest", () => {
  const skewed = Array.from({ length: 4 }, () => question("the longest option here", "short", "tiny", "mini"));
  assert.match(bankLengthBalance(skewed).join("|"), /longest in 100%/);
});

test("bankLengthBalance flags a bank where the correct option is usually the shortest", () => {
  const skewed = Array.from({ length: 4 }, () => question("a", "longer one", "longer two", "longer three"));
  assert.match(bankLengthBalance(skewed).join("|"), /shortest in 100%/);
});

test("absoluteWordCue flags absolutes that appear only in distractors", () => {
  const q = question("Usually raises the rate", "Always raises the rate", "Never changes the rate", "Lowers the rate");
  assert.match(absoluteWordCue(q) ?? "", /always|never/i);
});

test("absoluteWordCue passes when the correct option also uses an absolute word", () => {
  const q = question("Never changes ΔG′°", "Always raises the rate", "Lowers Ea", "Shifts K′eq");
  assert.equal(absoluteWordCue(q), null);
});

test("absoluteWordCue ignores causal 'cannot' and the idiom 'at all'", () => {
  const q = question("It binds tightly", "So the enzyme cannot bind it", "It does not bind at all", "It binds weakly");
  assert.equal(absoluteWordCue(q), null);
});
