/** Per-device progress: what a student has answered, their flashcard schedule and mock history. */
import { reviewCard, MAX_BOX, type CardState, type Rating } from "../../../src/srs/leitner.ts";

export const STORE_KEY = "biochem-revision-v1";
const MAX_MOCKS = 50;

export type Attempts = { seen: number; correct: number };
export type MockRecord = { date: string; mark: number; correct: number; total: number };
export type Progress = {
  version: 1;
  q: Record<string, Attempts>;
  cards: Record<string, CardState>;
  mocks: MockRecord[];
};
/** The subset of Storage we use, so tests can pass a broken one. */
export type KeyValueStore = Pick<Storage, "getItem" | "setItem">;

export const emptyProgress = (): Progress => ({ version: 1, q: {}, cards: {}, mocks: [] });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isCount = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 0;

const isAttempts = (value: unknown): value is Attempts =>
  isRecord(value) && isCount(value.seen) && isCount(value.correct) && value.correct <= value.seen;
const isCardState = (value: unknown): value is CardState =>
  isRecord(value) && isCount(value.box) && value.box <= MAX_BOX && Number.isFinite(value.due);
const isMock = (value: unknown): value is MockRecord =>
  isRecord(value) && typeof value.date === "string" && Number.isFinite(value.mark) && isCount(value.correct) && isCount(value.total);

const keepValid = <T>(value: unknown, isValid: (v: unknown) => v is T): Record<string, T> =>
  isRecord(value) ? Object.fromEntries(Object.entries(value).filter((entry): entry is [string, T] => isValid(entry[1]))) : {};

/** Accepts anything (stored JSON may be stale or edited) and returns well-formed progress. */
export const parseProgress = (raw: unknown): Progress => {
  if (!isRecord(raw)) return emptyProgress();
  return {
    version: 1,
    q: keepValid(raw.q, isAttempts),
    cards: keepValid(raw.cards, isCardState),
    mocks: Array.isArray(raw.mocks) ? raw.mocks.filter(isMock).slice(-MAX_MOCKS) : [],
  };
};

export const loadProgress = (store: KeyValueStore): Progress => {
  try {
    return parseProgress(JSON.parse(store.getItem(STORE_KEY) ?? "null"));
  } catch {
    return emptyProgress(); // storage blocked or corrupt: start fresh rather than crash
  }
};

export const saveProgress = (store: KeyValueStore, progress: Progress): void => {
  try {
    store.setItem(STORE_KEY, JSON.stringify(progress));
  } catch {
    // Storage blocked (e.g. private mode): progress lasts for this visit only.
  }
};

export const recordAnswer = (progress: Progress, id: string, correct: boolean): Progress => {
  const prev = progress.q[id] ?? { seen: 0, correct: 0 };
  return { ...progress, q: { ...progress.q, [id]: { seen: prev.seen + 1, correct: prev.correct + (correct ? 1 : 0) } } };
};

export const recordMock = (progress: Progress, mock: MockRecord): Progress => ({
  ...progress,
  mocks: [...progress.mocks, mock].slice(-MAX_MOCKS),
});

export const reviewFlashcard = (progress: Progress, id: string, rating: Rating, now: number): Progress => ({
  ...progress,
  cards: { ...progress.cards, [id]: reviewCard(progress.cards[id], rating, now) },
});
