/** Renders content into a Markdown review sheet for the lecturer. Usage: npm run review */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadUnitFiles } from "./check-content.ts";
import { generateMichaelisMenten } from "../src/calc/michaelisMenten.ts";
import type { Question, Flashcard, UnitFile } from "../src/content/types.ts";

const OUT_DIR = join(import.meta.dirname, "..", "review");
const OUT_FILE = join(OUT_DIR, "part1-review.md");
// Two of each kind except substrate: velocity (0, 7), substrate (11), competitive (2, 3).
const CALC_SAMPLE_SEEDS = [0, 7, 11, 2, 3];

const renderQuestion = (q: Question): string => {
  const options = q.options
    .map((o) => `- ${o.correct ? "✅" : "▫️"} **${o.id})** ${o.text}\n  - _${o.why}_`)
    .join("\n");
  return [
    `#### ${q.id} · ${q.outcome}`,
    `Bloom: ${q.bloom} · Difficulty: ${q.difficulty}/3 · Source: ${q.source}`,
    "",
    `**${q.stem}**`,
    "",
    options,
    "",
    "Review: ☐ OK ☐ Fix → ",
  ].join("\n");
};

const renderFlashcard = (f: Flashcard): string =>
  `| ${f.id} | ${f.front} | ${f.back} | ${f.source} | ☐ |`;

const renderSummary = (file: UnitFile): string => {
  const s = file.summary;
  return [
    "### Summary",
    "",
    `_${s.overview}_`,
    "",
    ...s.sections.flatMap((section) => [`**${section.heading}**`, ...section.points.map((p) => `- ${p}`), ""]),
    "**Key terms**",
    ...s.keyTerms.map((t) => `- **${t.term}**: ${t.definition}`),
    "",
    "**Exam tips**",
    ...s.examTips.map((tip) => `- ${tip}`),
    "",
    "Summary review: ☐ OK ☐ Fix → ",
    "",
  ].join("\n");
};

const renderUnit = (file: UnitFile): string =>
  [
    `## Unit ${file.unit} — ${file.title}`,
    `Outcomes: ${file.outcomes.join(" · ")}`,
    "",
    renderSummary(file),
    `### Questions (${file.questions.length})`,
    "",
    file.questions.map(renderQuestion).join("\n\n---\n\n"),
    "",
    `### Flashcards (${file.flashcards.length})`,
    "",
    "| ID | Front | Back | Source | OK |",
    "|---|---|---|---|---|",
    ...file.flashcards.map(renderFlashcard),
  ].join("\n");

const renderCalcSamples = (): string => {
  const problems = CALC_SAMPLE_SEEDS.map((seed) => {
    const p = generateMichaelisMenten(seed);
    return [`**Seed ${seed} (${p.kind})**: ${p.prompt}`, ...p.steps.map((s, i) => `${i + 1}. ${s}`)].join("\n");
  });
  return ["## Calculation practice — Michaelis–Menten samples", "", "Numbers are randomised per attempt; these are five fixed samples.", "", problems.join("\n\n")].join("\n");
};

const main = (): void => {
  const units = loadUnitFiles()
    .map(({ file }) => file)
    .sort((a, b) => a.unit - b.unit);
  const total = units.reduce((n, u) => n + u.questions.length + u.flashcards.length, 0);
  const doc = [
    "# Part 1 — content review",
    "",
    `${units.length} units · ${total} items. ✅ marks the correct option (options are shuffled in the app).`,
    "Tick OK or note a fix under each question. _Source: slides_ = based on your decks; _general_ = Lehninger-level knowledge or a veterinary link not in your slides.",
    "",
    ...units.map(renderUnit),
    "",
    renderCalcSamples(),
    "",
  ].join("\n");
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_FILE, doc);
  console.log(`Wrote ${OUT_FILE}`);
};

if (import.meta.main) main();
