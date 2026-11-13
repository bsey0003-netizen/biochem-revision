export type Bloom = "remember" | "understand" | "apply" | "analyse";
export type Source = "slides" | "general";
export type Difficulty = 1 | 2 | 3;

export type Option = {
  id: string;
  text: string;
  correct: boolean;
  /** Why this option is right or wrong — shown after answering. */
  why: string;
};

type ItemBase = {
  id: string;
  unit: number;
  part: number;
  /** Learning outcome from the syllabus / slides this item assesses. */
  outcome: string;
  source: Source;
};

export type Question = ItemBase & {
  type: "mcq";
  bloom: Bloom;
  difficulty: Difficulty;
  stem: string;
  options: Option[];
};

export type Flashcard = ItemBase & {
  type: "flashcard";
  front: string;
  back: string;
};

export type Item = Question | Flashcard;

/** Revision notes students read before practising a unit. */
export type UnitSummary = {
  overview: string;
  sections: { heading: string; points: string[] }[];
  keyTerms: { term: string; definition: string }[];
  /** Common traps and what examiners look for. */
  examTips: string[];
};

export type UnitFile = {
  unit: number;
  title: string;
  outcomes: string[];
  summary: UnitSummary;
  questions: Question[];
  flashcards: Flashcard[];
};

export const TOPIC_COLORS = ["mint", "lemon", "lilac", "peach", "rose", "sky", "apricot"] as const;
export type TopicColor = (typeof TOPIC_COLORS)[number];

/** A topic groups consecutive syllabus units, mirroring how the slide decks are organised. */
export type Topic = {
  id: string;
  title: string;
  emoji: string;
  color: TopicColor | string;
  units: { unit: number; title: string }[];
};

export type Syllabus = {
  part: number;
  title: string;
  topics: Topic[];
};
