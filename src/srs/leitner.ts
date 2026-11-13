/** Leitner-box spaced repetition for flashcards. Pure; time is injected as epoch ms. */

export type Rating = "again" | "good" | "easy";
export type CardState = { box: number; due: number };

export const DAY_MS = 24 * 60 * 60 * 1000;
/** Review interval in days for each box (index = box). */
const INTERVAL_DAYS = [0, 1, 3, 7, 14, 30] as const;
export const MAX_BOX = INTERVAL_DAYS.length - 1;

const BOX_STEP: Record<Rating, number> = { again: 0, good: 1, easy: 2 };

export const reviewCard = (state: CardState | undefined, rating: Rating, now: number): CardState => {
  const box = rating === "again" ? 0 : Math.min((state?.box ?? 0) + BOX_STEP[rating], MAX_BOX);
  return { box, due: now + INTERVAL_DAYS[box] * DAY_MS };
};

/** Cards due now: overdue reviewed cards (oldest due first), then never-seen cards in their given order. */
export const dueCards = (ids: readonly string[], states: Readonly<Record<string, CardState>>, now: number): string[] => {
  const reviewed = ids.filter((id) => states[id] && states[id].due <= now).sort((a, b) => states[a].due - states[b].due);
  const unseen = ids.filter((id) => !states[id]);
  return [...reviewed, ...unseen];
};
