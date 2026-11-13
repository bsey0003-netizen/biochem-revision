/** Practice, mock-exam and flashcard sessions. Pure state transitions; the UI holds the current value. */
import type { Question } from "../../../src/content/types.ts";
import { buildMockExam, scoreExam, shuffle, shuffleOptions, type ExamScore } from "../../../src/quiz/quiz.ts";
import { dueCards, type CardState } from "../../../src/srs/leitner.ts";
import type { Attempts } from "./progress.ts";

export const CHEERS = ["Nice one! 🎉", "Spot on! ✨", "You've got it! 🧠", "Brilliant! 🌟", "Yes! Keep going 💪"];

// ---------- Practice ----------
export type DrillResult = { id: string; correct: boolean };
export type Drill = {
  topicId: string | null;
  label: string;
  /** Topic page the session was started from, so "back" returns to that summary. */
  from: string | null;
  queue: Question[];
  index: number;
  chosen: string | null;
  showAll: boolean;
  results: DrillResult[];
  streak: number;
  cheer: string | null;
};

/** Unseen questions first, then the weakest; ties in random order. Options are shuffled. */
export const orderForDrill = (pool: readonly Question[], attempts: Readonly<Record<string, Attempts>>, rng = Math.random): Question[] => {
  const score = (q: Question): number => {
    const a = attempts[q.id];
    return a ? a.correct / a.seen : -1;
  };
  return shuffle(pool, rng).sort((a, b) => score(a) - score(b)).map((q) => shuffleOptions(q, rng));
};

export const createDrill = (
  pool: readonly Question[],
  attempts: Readonly<Record<string, Attempts>>,
  meta: { topicId: string | null; label: string; from: string | null },
  rng = Math.random,
): Drill => ({ ...meta, queue: orderForDrill(pool, attempts, rng), index: 0, chosen: null, showAll: false, results: [], streak: 0, cheer: null });

export const answerDrill = (drill: Drill, optionId: string, rng = Math.random): Drill => {
  const q = drill.queue[drill.index];
  const option = q?.options.find((o) => o.id === optionId);
  if (!q || !option || drill.chosen) return drill;
  return {
    ...drill,
    chosen: optionId,
    streak: option.correct ? drill.streak + 1 : 0,
    cheer: option.correct ? CHEERS[Math.floor(rng() * CHEERS.length)] : null,
    results: [...drill.results, { id: q.id, correct: option.correct }],
  };
};

export const nextDrill = (drill: Drill): Drill => ({ ...drill, index: drill.index + 1, chosen: null, showAll: false });

// ---------- Mock exams ----------
/** Full = the real Part 1 partial's ~25 questions; its timing is a practice suggestion, not the official one. */
export const MOCK_FORMATS = {
  quick: { size: 10, minutes: 15, title: "Quick mock" },
  full: { size: 25, minutes: 45, title: "Full partial" },
} as const;
export type MockFormat = keyof typeof MOCK_FORMATS;

export type MockResult = ExamScore & { timeUp: boolean; usedMs: number };
export type Mock = {
  format: MockFormat;
  questions: Question[];
  answers: Record<string, string>;
  index: number;
  startedAt: number;
  endsAt: number;
  result: MockResult | null;
};

export const createMock = (bank: readonly Question[], format: MockFormat, seen: ReadonlySet<string>, now: number, rng = Math.random): Mock => {
  const f = MOCK_FORMATS[format];
  return { format, questions: buildMockExam(bank, f.size, rng, seen), answers: {}, index: 0, startedAt: now, endsAt: now + f.minutes * 60_000, result: null };
};

export const finishMock = (mock: Mock, now: number, timeUp: boolean): Mock => ({
  ...mock,
  result: { ...scoreExam(mock.questions, mock.answers), timeUp, usedMs: Math.min(now, mock.endsAt) - mock.startedAt },
});

export const formatClock = (ms: number): string => {
  const sec = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
};

// ---------- Flashcards ----------
export type Deck = { topicId: string | null; from: string | null; queue: string[]; flipped: boolean; reviewed: number };

export const createDeck = (cardIds: readonly string[], states: Readonly<Record<string, CardState>>, meta: { topicId: string | null; from: string | null }, now: number): Deck => ({
  ...meta,
  queue: dueCards(cardIds, states, now),
  flipped: false,
  reviewed: 0,
});

/** "Again" sends the card to the back of today's queue; other ratings remove it. */
export const advanceDeck = (deck: Deck, again: boolean): Deck => {
  const [current, ...rest] = deck.queue;
  return { ...deck, queue: again && current ? [...rest, current] : rest, flipped: false, reviewed: deck.reviewed + 1 };
};
