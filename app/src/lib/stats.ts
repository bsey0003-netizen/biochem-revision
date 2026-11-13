import type { Question } from "../../../src/content/types.ts";
import type { Attempts } from "./progress.ts";

export type Stats = { answered: number; seen: number; correct: number; total: number };
export type OutcomeStats = Stats & { unit: number; outcome: string };

export const percent = (part: number, total: number): number => (total ? Math.round((part / total) * 100) : 0);

export const statsFor = (items: readonly Question[], attempts: Readonly<Record<string, Attempts>>): Stats =>
  items.reduce<Stats>(
    (acc, q) => {
      const a = attempts[q.id];
      return a ? { ...acc, answered: acc.answered + 1, seen: acc.seen + a.seen, correct: acc.correct + a.correct } : acc;
    },
    { answered: 0, seen: 0, correct: 0, total: items.length },
  );

/** The `limit` learning outcomes with the lowest accuracy, among those attempted at least twice. */
export const weakOutcomes = (
  questions: readonly Question[],
  attempts: Readonly<Record<string, Attempts>>,
  limit = 3,
): OutcomeStats[] => {
  const groups = new Map<string, Question[]>();
  for (const q of questions) {
    const key = `${q.unit}|${q.outcome}`;
    groups.set(key, [...(groups.get(key) ?? []), q]);
  }
  return [...groups.values()]
    .map((items) => ({ unit: items[0].unit, outcome: items[0].outcome, ...statsFor(items, attempts) }))
    .filter((o) => o.seen >= 2)
    .sort((a, b) => a.correct / a.seen - b.correct / b.seen)
    .slice(0, limit);
};
