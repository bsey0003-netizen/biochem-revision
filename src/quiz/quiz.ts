/** Quiz logic shared by drills and mock exams. Pure functions; randomness is injected. */
import type { Question } from "../content/types.ts";
import type { Rng } from "../lib/rng.ts";

export type UnitScore = { correct: number; total: number };
export type ExamScore = {
  correct: number;
  total: number;
  /** Mark out of 10, as on the partial exams. */
  mark: number;
  byUnit: Record<number, UnitScore>;
};

/** Fisher–Yates shuffle; returns a new array. */
export const shuffle = <T>(items: readonly T[], rng: Rng = Math.random): T[] => {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

/** Content stores the correct option first, so options must be shuffled before display. */
export const shuffleOptions = (question: Question, rng: Rng = Math.random): Question => ({
  ...question,
  options: shuffle(question.options, rng),
});

const groupByUnit = (questions: readonly Question[]): Map<number, Question[]> => {
  const groups = new Map<number, Question[]>();
  for (const q of questions) groups.set(q.unit, [...(groups.get(q.unit) ?? []), q]);
  return groups;
};

/**
 * Picks `count` questions spread evenly across units (round-robin), then shuffles order and options.
 * With `seen`, each unit offers its unseen questions first, so repeated mocks show new questions.
 */
export const buildMockExam = (
  questions: readonly Question[],
  count: number,
  rng: Rng = Math.random,
  seen: ReadonlySet<string> = new Set(),
): Question[] => {
  const unseenFirst = (pool: Question[]): Question[] => [
    ...shuffle(pool.filter((q) => !seen.has(q.id)), rng),
    ...shuffle(pool.filter((q) => seen.has(q.id)), rng),
  ];
  const pools = [...groupByUnit(questions).values()].map(unseenFirst);
  const picked: Question[] = [];
  while (picked.length < count && pools.some((pool) => pool.length > 0)) {
    for (const pool of shuffle(pools, rng)) {
      const next = pool.shift();
      if (next && picked.length < count) picked.push(next);
    }
  }
  return shuffle(picked, rng).map((q) => shuffleOptions(q, rng));
};

/** answers maps question id → chosen option id; unanswered questions count as wrong. */
export const scoreExam = (questions: readonly Question[], answers: Readonly<Record<string, string>>): ExamScore => {
  const byUnit: Record<number, UnitScore> = {};
  let correct = 0;
  for (const q of questions) {
    const unit = (byUnit[q.unit] ??= { correct: 0, total: 0 });
    unit.total += 1;
    const chosen = q.options.find((o) => o.id === answers[q.id]);
    if (chosen?.correct) {
      unit.correct += 1;
      correct += 1;
    }
  }
  const total = questions.length;
  const mark = total === 0 ? 0 : Math.round((correct / total) * 100) / 10;
  return { correct, total, mark, byUnit };
};
