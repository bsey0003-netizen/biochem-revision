import { TOPIC_COLORS } from "./types.ts";
import type { Syllabus, Topic } from "./types.ts";

const KNOWN_COLORS = new Set<string>(TOPIC_COLORS);
const isBlank = (value: unknown): boolean => typeof value !== "string" || value.trim() === "";

const validateTopic = (topic: Topic, index: number): string[] => {
  const label = `topic ${index + 1}${isBlank(topic.title) ? "" : ` (${topic.title})`}`;
  const errors: string[] = [];
  if (isBlank(topic.id)) errors.push(`${label}: missing id`);
  if (isBlank(topic.title)) errors.push(`${label}: missing title`);
  if (isBlank(topic.emoji)) errors.push(`${label}: missing emoji`);
  if (!KNOWN_COLORS.has(topic.color)) errors.push(`${label}: unknown colour "${topic.color}"`);
  if (!Array.isArray(topic.units) || topic.units.length === 0) errors.push(`${label}: has no units`);
  for (const u of topic.units ?? []) {
    if (isBlank(u.title)) errors.push(`${label}: unit ${u.unit} has no title`);
  }
  return errors;
};

/** Every expected unit must appear exactly once, in ascending order across topics; topic ids must be unique. */
export const validateSyllabus = (syllabus: Syllabus, expectedUnits: readonly number[]): string[] => {
  const errors = syllabus.topics.flatMap(validateTopic);

  const ids = syllabus.topics.map((t) => t.id).filter((id) => !isBlank(id));
  for (const id of new Set(ids)) {
    if (ids.filter((x) => x === id).length > 1) errors.push(`topic id "${id}" is used more than once`);
  }

  const order = syllabus.topics.flatMap((t) => (t.units ?? []).map((u) => u.unit));
  for (const unit of new Set(order)) {
    if (order.filter((u) => u === unit).length > 1) errors.push(`unit ${unit} appears more than once`);
  }
  for (const unit of expectedUnits) {
    if (!order.includes(unit)) errors.push(`unit ${unit} is missing`);
  }
  if (order.some((unit, i) => i > 0 && unit < order[i - 1])) errors.push("units are out of order");
  return errors;
};

export const topicForUnit = (syllabus: Syllabus, unit: number): Topic | undefined =>
  syllabus.topics.find((t) => t.units.some((u) => u.unit === unit));
