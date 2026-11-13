/** Validates every content file. Usage: npm run check — exits 1 if any error is found. */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { validateBank, validateUnitFile } from "../src/content/validate.ts";
import { validateSyllabus, topicForUnit } from "../src/content/syllabus.ts";
import { lengthCue, bankLengthBalance, absoluteWordCue } from "../src/content/cues.ts";
import type { Item, Question, Syllabus, UnitFile } from "../src/content/types.ts";

const CONTENT_DIR = join(import.meta.dirname, "..", "content");
const SYLLABUS_FILE = join(import.meta.dirname, "..", "syllabus", "part1.json");
const PART1_UNITS = Array.from({ length: 14 }, (_, i) => i + 1);

export const loadSyllabus = (path = SYLLABUS_FILE): Syllabus => JSON.parse(readFileSync(path, "utf8")) as Syllabus;

const listJson = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return listJson(path);
    return name.endsWith(".json") ? [path] : [];
  });

export const loadUnitFiles = (dir = CONTENT_DIR): { path: string; file: UnitFile }[] =>
  listJson(dir).map((path) => ({ path, file: JSON.parse(readFileSync(path, "utf8")) as UnitFile }));

const main = (): void => {
  const errors: string[] = [];
  const allItems: Item[] = [];
  let files: { path: string; file: UnitFile }[] = [];
  try {
    files = loadUnitFiles();
  } catch (error) {
    console.error(`Could not read content: ${(error as Error).message}`);
    process.exit(1);
  }

  for (const { path, file } of files) {
    const name = relative(CONTENT_DIR, path);
    errors.push(...validateUnitFile(file).map((e) => `${name}: ${e}`));
    allItems.push(...file.questions, ...file.flashcards);
    console.log(`${name}: unit ${file.unit} — ${file.questions.length} questions, ${file.flashcards.length} flashcards`);
  }
  errors.push(...validateBank(allItems));

  // Answer cues: a correct option that stands out by length gives the answer away.
  const questions = allItems.filter((i): i is Question => i.type === "mcq");
  for (const q of questions) {
    const cue = lengthCue(q);
    if (cue) errors.push(`${q.id}: ${cue}`);
  }
  errors.push(...bankLengthBalance(questions).map((e) => `question bank: ${e}`));
  const warnings = questions.flatMap((q) => {
    const cue = absoluteWordCue(q);
    return cue ? [`${q.id}: ${cue}`] : [];
  });
  if (warnings.length > 0) console.warn(`\n⚠ ${warnings.length} warning(s) (review, not blocking):\n  ${warnings.join("\n  ")}`);

  const syllabus = loadSyllabus();
  errors.push(...validateSyllabus(syllabus, PART1_UNITS).map((e) => `syllabus/part1.json: ${e}`));
  for (const { file } of files) {
    if (!topicForUnit(syllabus, file.unit)) errors.push(`unit ${file.unit} is not in any syllabus topic`);
  }

  if (errors.length > 0) {
    console.error(`\n✖ ${errors.length} problem(s):\n  ${errors.join("\n  ")}`);
    process.exit(1);
  }
  console.log(`\n✔ ${allItems.length} items in ${files.length} file(s) — all valid`);
};

if (import.meta.main) main();
