import type { Question } from "./types.ts";

/** A correct option may be at most this much longer than the longest distractor… */
const MAX_LENGTH_RATIO = 1.2;
/** …unless the difference is this many characters or fewer (e.g. "20 mM" vs "2 mM"). */
const MIN_LENGTH_GAP = 8;
/** Across a bank, the correct option may be the strict longest/shortest in at most this share of questions (chance ≈ 25%). */
const MAX_EXTREME_SHARE = 0.35;
// "cannot"/"must" are left out: they usually appear in causal explanations, not as sweeping claims.
const ABSOLUTE_WORDS = /\b(always|never|all|none|every|completely|entirely|solely)\b/i;
const stripIdioms = (text: string): string => text.replace(/\bat all\b/gi, "");

const split = (q: Question): { correct: string; distractors: string[] } => ({
  correct: q.options.find((o) => o.correct)?.text ?? "",
  distractors: q.options.filter((o) => !o.correct).map((o) => o.text),
});

/** Returns a message when the correct option stands out by being much longer than every distractor. */
export const lengthCue = (q: Question): string | null => {
  const { correct, distractors } = split(q);
  const longest = Math.max(0, ...distractors.map((d) => d.length));
  const tooLong = correct.length > longest * MAX_LENGTH_RATIO && correct.length - longest > MIN_LENGTH_GAP;
  return tooLong ? `correct option is longer than every distractor (${correct.length} vs ≤ ${longest} chars)` : null;
};

/** Bank-level check: the correct option must not be the longest (or shortest) option far more often than chance. */
export const bankLengthBalance = (questions: Question[]): string[] => {
  if (questions.length === 0) return [];
  let longest = 0;
  let shortest = 0;
  for (const q of questions) {
    const { correct, distractors } = split(q);
    const lengths = distractors.map((d) => d.length);
    if (correct.length > Math.max(...lengths)) longest++;
    if (correct.length < Math.min(...lengths)) shortest++;
  }
  const pct = (n: number): number => Math.round((n / questions.length) * 100);
  const limit = Math.round(MAX_EXTREME_SHARE * 100);
  const errors: string[] = [];
  if (longest / questions.length > MAX_EXTREME_SHARE) errors.push(`correct option is the longest in ${pct(longest)}% of questions (limit ${limit}%)`);
  if (shortest / questions.length > MAX_EXTREME_SHARE) errors.push(`correct option is the shortest in ${pct(shortest)}% of questions (limit ${limit}%)`);
  return errors;
};

/** Warning: absolute words ("always", "never"…) that appear only in distractors teach students to skip them. */
export const absoluteWordCue = (q: Question): string | null => {
  const { correct, distractors } = split(q);
  if (ABSOLUTE_WORDS.test(stripIdioms(correct))) return null;
  const words = distractors.flatMap((d) => stripIdioms(d).match(ABSOLUTE_WORDS)?.[0]?.toLowerCase() ?? []);
  return words.length > 0 ? `absolute word(s) only in distractors: ${[...new Set(words)].join(", ")}` : null;
};
