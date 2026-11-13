import type { Item, Question, Flashcard, UnitFile, UnitSummary } from "./types.ts";

const BLOOMS = new Set(["remember", "understand", "apply", "analyse"]);
const SOURCES = new Set(["slides", "general"]);
const FIRST_UNIT = 1;
const LAST_UNIT = 40;

/** Syllabus Parts: 1 = Units 1–14, 2 = Units 15–33, 3 = Units 34–40. */
export const partForUnit = (unit: number): number => {
  if (unit <= 14) return 1;
  if (unit <= 33) return 2;
  return 3;
};

const isBlank = (value: unknown): boolean => typeof value !== "string" || value.trim() === "";
const normalise = (text: string): string => text.trim().toLowerCase().replace(/\s+/g, " ");

const validateCommon = (item: Item): string[] => {
  const errors: string[] = [];
  const validUnit = Number.isInteger(item.unit) && item.unit >= FIRST_UNIT && item.unit <= LAST_UNIT;
  if (!validUnit) errors.push(`unit ${item.unit} is not a syllabus unit (1–40)`);
  if (validUnit && item.part !== partForUnit(item.unit)) {
    errors.push(`part ${item.part} does not match unit ${item.unit}`);
  }
  const letter = item.type === "mcq" ? "q" : "f";
  const idMatch = /^u(\d{1,2})-([qf])\d{3}$/.exec(String(item.id));
  const idOk = validUnit && idMatch !== null && Number(idMatch[1]) === item.unit && idMatch[2] === letter;
  if (!idOk) errors.push(`id ${item.id} should look like u${item.unit}-${letter}001`);
  if (!SOURCES.has(item.source)) errors.push(`source "${item.source}" must be slides or general`);
  if (isBlank(item.outcome)) errors.push("outcome is empty");
  return errors;
};

const validateQuestion = (q: Question): string[] => {
  const errors: string[] = [];
  if (!BLOOMS.has(q.bloom)) errors.push(`bloom "${q.bloom}" is not a known level`);
  if (![1, 2, 3].includes(q.difficulty)) errors.push(`difficulty ${q.difficulty} must be 1, 2 or 3`);
  if (isBlank(q.stem)) errors.push("stem is empty");

  const options = Array.isArray(q.options) ? q.options : [];
  if (options.length < 4 || options.length > 5) errors.push(`needs 4–5 options, has ${options.length}`);
  if (options.filter((o) => o.correct === true).length !== 1) errors.push("needs exactly one correct option");

  const seenIds = new Set<string>();
  const seenTexts = new Set<string>();
  for (const option of options) {
    if (seenIds.has(option.id)) errors.push(`duplicate option id ${option.id}`);
    seenIds.add(option.id);
    if (isBlank(option.text)) errors.push(`option ${option.id} has no text`);
    else {
      const text = normalise(option.text);
      if (seenTexts.has(text)) errors.push(`duplicate option text "${option.text}"`);
      seenTexts.add(text);
      if (/\b(all|none) of the above\b/.test(text)) {
        errors.push(`option ${option.id} uses "of the above" — options are shuffled`);
      }
    }
    if (isBlank(option.why)) errors.push(`option ${option.id} has no explanation`);
  }
  return errors;
};

const validateFlashcard = (f: Flashcard): string[] => {
  const errors: string[] = [];
  if (isBlank(f.front)) errors.push("front is empty");
  if (isBlank(f.back)) errors.push("back is empty");
  return errors;
};

export const validateItem = (item: Item): string[] => {
  const specific = item.type === "mcq" ? validateQuestion(item) : validateFlashcard(item);
  return [...validateCommon(item), ...specific];
};

const asList = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

/** Revision notes: an overview, sections with points, unique key terms, and exam tips — none blank. */
export const validateSummary = (summary: UnitSummary | undefined): string[] => {
  if (!summary || typeof summary !== "object") return ["missing"];
  const errors: string[] = [];
  if (isBlank(summary.overview)) errors.push("overview is empty");

  const sections = asList<UnitSummary["sections"][number]>(summary.sections);
  if (sections.length === 0) errors.push("needs at least one section");
  sections.forEach((section, i) => {
    if (isBlank(section.heading)) errors.push(`section ${i + 1} has no heading`);
    const points = asList<string>(section.points);
    if (points.length === 0) errors.push(`section ${i + 1} has no points`);
    if (points.some(isBlank)) errors.push(`section ${i + 1} has a blank point`);
  });

  const terms = asList<UnitSummary["keyTerms"][number]>(summary.keyTerms);
  if (terms.length === 0) errors.push("needs at least one key term");
  const seen = new Set<string>();
  for (const t of terms) {
    if (isBlank(t.term) || isBlank(t.definition)) errors.push("a key term is missing its term or definition");
    else if (seen.has(normalise(t.term))) errors.push(`duplicate key term "${t.term}"`);
    else seen.add(normalise(t.term));
  }

  const tips = asList<string>(summary.examTips);
  if (tips.length === 0 || tips.some(isBlank)) errors.push("needs at least one exam tip, none blank");
  return errors;
};

/** File-level rules: a valid summary, and every item belongs to this file's unit and one of its listed outcomes. */
export const validateUnitFile = (file: UnitFile): string[] => {
  const errors: string[] = validateSummary(file.summary).map((e) => `unit ${file.unit} summary: ${e}`);
  const outcomes = new Set(file.outcomes);
  for (const item of [...file.questions, ...file.flashcards]) {
    if (item.unit !== file.unit) errors.push(`${item.id}: belongs to unit ${item.unit}, file is unit ${file.unit}`);
    if (!outcomes.has(item.outcome)) errors.push(`${item.id}: outcome "${item.outcome}" is not listed for unit ${file.unit}`);
  }
  return errors;
};

/** Validates every item plus cross-item rules (unique ids, unique stems/fronts). */
export const validateBank = (items: Item[]): string[] => {
  const errors: string[] = [];
  const ids = new Set<string>();
  const prompts = new Set<string>();
  for (const item of items) {
    errors.push(...validateItem(item).map((e) => `${item.id}: ${e}`));
    if (ids.has(item.id)) errors.push(`duplicate id ${item.id}`);
    ids.add(item.id);
    const prompt = normalise(item.type === "mcq" ? item.stem : item.front);
    if (prompt && prompts.has(prompt)) errors.push(`${item.id}: duplicate stem`);
    prompts.add(prompt);
  }
  return errors;
};
