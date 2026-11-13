import { test } from "node:test";
import assert from "node:assert/strict";
import {
  velocity,
  substrateForFraction,
  competitiveVelocity,
  generateMichaelisMenten,
  checkAnswer,
} from "../src/calc/michaelisMenten.ts";

const close = (actual: number, expected: number, rel = 1e-9) =>
  assert.ok(Math.abs(actual - expected) <= Math.abs(expected) * rel, `${actual} ≉ ${expected}`);

test("velocity follows v0 = Vmax[S]/(Km + [S])", () => {
  close(velocity(100, 2, 2), 50);
  close(velocity(100, 2, 18), 90);
  close(velocity(60, 0.5, 0.5), 30);
});

test("substrateForFraction inverts the equation", () => {
  close(substrateForFraction(2, 0.5), 2);
  close(substrateForFraction(2, 0.9), 18);
  close(substrateForFraction(4, 0.25), 4 / 3);
});

test("competitive inhibition raises apparent Km by alpha = 1 + [I]/Ki, Vmax unchanged", () => {
  close(competitiveVelocity(100, 2, 2, 1, 1), (100 * 2) / (2 * 2 + 2));
  close(competitiveVelocity(100, 2, 2, 0, 1), velocity(100, 2, 2));
});

test("the same seed always gives the same problem", () => {
  assert.deepEqual(generateMichaelisMenten(42), generateMichaelisMenten(42));
});

test("different seeds cover every problem kind", () => {
  const kinds = new Set(Array.from({ length: 60 }, (_, seed) => generateMichaelisMenten(seed).kind));
  assert.deepEqual([...kinds].sort(), ["competitive", "substrate", "velocity"]);
});

test("every generated answer matches a recomputation from the given values", () => {
  for (let seed = 0; seed < 300; seed += 1) {
    const p = generateMichaelisMenten(seed);
    const g = p.given;
    const expected =
      p.kind === "velocity"
        ? velocity(g.vmax, g.km, g.s)
        : p.kind === "substrate"
          ? substrateForFraction(g.km, g.fraction)
          : competitiveVelocity(g.vmax, g.km, g.s, g.inhibitor, g.ki);
    close(p.answer, expected);
    assert.ok(Number.isFinite(p.answer) && p.answer > 0, `seed ${seed} answer ${p.answer}`);
    assert.ok(p.prompt.length > 20 && p.steps.length >= 2, `seed ${seed} prompt/steps`);
  }
});

test("checkAnswer accepts answers within 2% and rejects ones 10% off", () => {
  const p = generateMichaelisMenten(7);
  assert.equal(checkAnswer(p, p.answer), true);
  assert.equal(checkAnswer(p, p.answer * 1.015), true);
  assert.equal(checkAnswer(p, p.answer * 1.1), false);
  assert.equal(checkAnswer(p, Number.NaN), false);
});
