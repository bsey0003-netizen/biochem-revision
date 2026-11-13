/** Randomised Michaelis–Menten practice problems (Unit 12). Pure and seed-reproducible. */
import { createRng } from "../lib/rng.ts";
import type { Rng } from "../lib/rng.ts";

export type MMKind = "velocity" | "substrate" | "competitive";

export type MMGiven = {
  vmax: number; // µmol/min
  km: number; // mM
  s: number; // mM
  fraction: number; // target v0/Vmax
  inhibitor: number; // [I], µM
  ki: number; // µM
};

export type MMProblem = {
  seed: number;
  kind: MMKind;
  given: MMGiven;
  prompt: string;
  answer: number;
  answerUnit: string;
  steps: string[];
};

const RELATIVE_TOLERANCE = 0.02;

export const velocity = (vmax: number, km: number, s: number): number => (vmax * s) / (km + s);

export const substrateForFraction = (km: number, fraction: number): number => (fraction * km) / (1 - fraction);

export const competitiveVelocity = (vmax: number, km: number, s: number, inhibitor: number, ki: number): number =>
  velocity(vmax, km * (1 + inhibitor / ki), s);

const pick = <T>(rng: Rng, values: readonly T[]): T => values[Math.floor(rng() * values.length)];

const VMAX_VALUES = [20, 40, 50, 60, 80, 100, 120, 150, 200] as const;
const KM_VALUES = [0.2, 0.5, 1, 2, 2.5, 4, 5, 8, 10] as const;
const S_MULTIPLIERS = [0.25, 0.5, 1, 2, 3, 4, 9] as const;
const FRACTIONS = [0.2, 0.25, 0.75, 0.8, 0.9, 0.95] as const;
const KI_VALUES = [2, 5, 10, 20] as const;
const I_MULTIPLIERS = [0.5, 1, 2, 3, 4] as const;
const KINDS: readonly MMKind[] = ["velocity", "substrate", "competitive"];

const fmt = (n: number): string => Number(n.toPrecision(4)).toString();

export const generateMichaelisMenten = (seed: number): MMProblem => {
  const rng = createRng(seed);
  const kind = pick(rng, KINDS);
  const vmax = pick(rng, VMAX_VALUES);
  const km = pick(rng, KM_VALUES);
  const s = Number((km * pick(rng, S_MULTIPLIERS)).toPrecision(4));
  const fraction = pick(rng, FRACTIONS);
  const ki = pick(rng, KI_VALUES);
  const inhibitor = ki * pick(rng, I_MULTIPLIERS);
  const given: MMGiven = { vmax, km, s, fraction, inhibitor, ki };

  if (kind === "velocity") {
    const answer = velocity(vmax, km, s);
    return {
      seed, kind, given, answer, answerUnit: "µmol/min",
      prompt: `An enzyme has Vmax = ${vmax} µmol/min and Km = ${km} mM. Calculate the initial velocity v0 when [S] = ${s} mM.`,
      steps: [
        "Use the Michaelis–Menten equation: v0 = Vmax[S] / (Km + [S]).",
        `v0 = ${vmax} × ${s} / (${km} + ${s})`,
        `v0 = ${fmt(answer)} µmol/min (${fmt((answer / vmax) * 100)}% of Vmax).`,
      ],
    };
  }

  if (kind === "substrate") {
    const answer = substrateForFraction(km, fraction);
    const percent = Math.round(fraction * 100);
    return {
      seed, kind, given, answer, answerUnit: "mM",
      prompt: `An enzyme has Km = ${km} mM. What substrate concentration is needed for the enzyme to work at ${percent}% of Vmax?`,
      steps: [
        `Set v0/Vmax = ${fraction} in v0/Vmax = [S] / (Km + [S]).`,
        `Rearrange: [S] = f·Km / (1 − f) = ${fraction} × ${km} / (1 − ${fraction})`,
        `[S] = ${fmt(answer)} mM.`,
      ],
    };
  }

  const alpha = 1 + inhibitor / ki;
  const answer = competitiveVelocity(vmax, km, s, inhibitor, ki);
  return {
    seed, kind, given, answer, answerUnit: "µmol/min",
    prompt:
      `An enzyme has Vmax = ${vmax} µmol/min and Km = ${km} mM. A competitive inhibitor (Ki = ${ki} µM) is present at ${inhibitor} µM. ` +
      `Calculate v0 when [S] = ${s} mM.`,
    steps: [
      `A competitive inhibitor leaves Vmax unchanged and multiplies Km by α = 1 + [I]/Ki = 1 + ${inhibitor}/${ki} = ${fmt(alpha)}.`,
      `Apparent Km = ${fmt(alpha)} × ${km} = ${fmt(alpha * km)} mM.`,
      `v0 = ${vmax} × ${s} / (${fmt(alpha * km)} + ${s}) = ${fmt(answer)} µmol/min.`,
    ],
  };
};

export const checkAnswer = (problem: MMProblem, input: number): boolean =>
  Number.isFinite(input) && Math.abs(input - problem.answer) <= Math.abs(problem.answer) * RELATIVE_TOLERANCE;
