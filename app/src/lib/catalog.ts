/** Read-only lookups over the syllabus and unit content. */
import type { Flashcard, Question, Syllabus, Topic, UnitFile } from "../../../src/content/types.ts";

export type Catalog = {
  syllabus: Syllabus;
  topics: Topic[];
  units: Map<number, UnitFile>;
  questions: Question[];
  flashcards: Flashcard[];
  topicById: (id: string | null | undefined) => Topic | undefined;
  topicOf: (unit: number) => Topic | undefined;
  unitTitle: (unit: number) => string;
  unitsOf: (topic: Topic) => number[];
  unitRange: (topic: Topic) => string;
  isReady: (topic: Topic) => boolean;
  questionsOf: (topic: Topic) => Question[];
  cardsOf: (topic: Topic | null | undefined) => Flashcard[];
};

export const createCatalog = (syllabus: Syllabus, unitFiles: readonly UnitFile[]): Catalog => {
  const sorted = [...unitFiles].sort((a, b) => a.unit - b.unit);
  const units = new Map(sorted.map((u) => [u.unit, u]));
  const questions = sorted.flatMap((u) => u.questions);
  const flashcards = sorted.flatMap((u) => u.flashcards);
  const topics = syllabus.topics;

  const unitsOf = (topic: Topic): number[] => topic.units.map((u) => u.unit);
  const topicOf = (unit: number): Topic | undefined => topics.find((t) => t.units.some((u) => u.unit === unit));
  const inTopic = (topic: Topic) => (item: { unit: number }) => unitsOf(topic).includes(item.unit);

  return {
    syllabus,
    topics,
    units,
    questions,
    flashcards,
    topicById: (id) => topics.find((t) => t.id === id),
    topicOf,
    unitTitle: (unit) => topicOf(unit)?.units.find((u) => u.unit === unit)?.title ?? `Unit ${unit}`,
    unitsOf,
    unitRange: (topic) => {
      const n = unitsOf(topic);
      return n.length === 1 ? `Unit ${n[0]}` : `Units ${n[0]}–${n[n.length - 1]}`;
    },
    isReady: (topic) => unitsOf(topic).some((u) => units.has(u)),
    questionsOf: (topic) => questions.filter(inTopic(topic)),
    cardsOf: (topic) => (topic ? flashcards.filter(inTopic(topic)) : flashcards),
  };
};
