import { test } from "node:test";
import assert from "node:assert/strict";
import { reviewCard, dueCards, DAY_MS, MAX_BOX } from "../src/srs/leitner.ts";

const NOW = Date.UTC(2026, 10, 12, 9, 0);

test("a new card rated good moves to box 1, due in 1 day", () => {
  assert.deepEqual(reviewCard(undefined, "good", NOW), { box: 1, due: NOW + DAY_MS });
});

test("good moves up one box; easy moves up two", () => {
  assert.deepEqual(reviewCard({ box: 1, due: NOW }, "good", NOW), { box: 2, due: NOW + 3 * DAY_MS });
  assert.deepEqual(reviewCard({ box: 1, due: NOW }, "easy", NOW), { box: 3, due: NOW + 7 * DAY_MS });
});

test("boxes cap at the top box (30-day interval)", () => {
  assert.deepEqual(reviewCard({ box: MAX_BOX, due: NOW }, "easy", NOW), { box: MAX_BOX, due: NOW + 30 * DAY_MS });
});

test("again sends a card back to box 0, due immediately", () => {
  assert.deepEqual(reviewCard({ box: 4, due: NOW }, "again", NOW), { box: 0, due: NOW });
});

test("dueCards lists overdue cards (oldest first) before new cards, and skips cards not yet due", () => {
  const states = {
    a: { box: 2, due: NOW - 2 * DAY_MS },
    b: { box: 1, due: NOW + DAY_MS },
    c: { box: 3, due: NOW - 5 * DAY_MS },
  };
  assert.deepEqual(dueCards(["a", "b", "c", "d", "e"], states, NOW), ["c", "a", "d", "e"]);
});
