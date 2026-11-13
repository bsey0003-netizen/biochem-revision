import { test } from "node:test";
import assert from "node:assert/strict";
import { validateItem, validateBank, validateUnitFile, validateSummary, partForUnit } from "../src/content/validate.ts";
import type { Question, Flashcard, UnitFile, UnitSummary } from "../src/content/types.ts";

const validQuestion = (): Question => ({
  id: "u12-q001",
  type: "mcq",
  unit: 12,
  part: 1,
  outcome: "Enzyme kinetics – Michaelis–Menten equation",
  bloom: "apply",
  difficulty: 2,
  source: "slides",
  stem: "An enzyme has Km = 2 mM. At what [S] is v0 equal to half of Vmax?",
  options: [
    { id: "a", text: "1 mM", correct: false, why: "That would give v0 = Vmax/3." },
    { id: "b", text: "2 mM", correct: true, why: "By definition v0 = Vmax/2 when [S] = Km." },
    { id: "c", text: "4 mM", correct: false, why: "That would give v0 = 2/3 Vmax." },
    { id: "d", text: "20 mM", correct: false, why: "At 10 × Km, v0 is about 91% of Vmax." },
  ],
});

const validFlashcard = (): Flashcard => ({
  id: "u12-f001",
  type: "flashcard",
  unit: 12,
  part: 1,
  outcome: "Enzymatic inhibition",
  front: "Competitive inhibitor: effect on apparent Km and Vmax?",
  back: "Apparent Km increases; Vmax unchanged.",
  source: "slides",
});

test("partForUnit maps syllabus units to exam parts", () => {
  assert.equal(partForUnit(1), 1);
  assert.equal(partForUnit(14), 1);
  assert.equal(partForUnit(15), 2);
  assert.equal(partForUnit(33), 2);
  assert.equal(partForUnit(34), 3);
  assert.equal(partForUnit(40), 3);
});

test("a well-formed question has no errors", () => {
  assert.deepEqual(validateItem(validQuestion()), []);
});

test("a well-formed flashcard has no errors", () => {
  assert.deepEqual(validateItem(validFlashcard()), []);
});

test("rejects a question with no correct option", () => {
  const q = validQuestion();
  q.options = q.options.map((o) => ({ ...o, correct: false }));
  assert.match(validateItem(q).join("|"), /exactly one correct/);
});

test("rejects a question with two correct options", () => {
  const q = validQuestion();
  q.options[0].correct = true;
  assert.match(validateItem(q).join("|"), /exactly one correct/);
});

test("rejects fewer than 4 or more than 5 options", () => {
  const few = validQuestion();
  few.options = few.options.slice(0, 3);
  assert.match(validateItem(few).join("|"), /4–5 options/);
  const many = validQuestion();
  many.options = [...many.options, ...many.options.map((o, i) => ({ ...o, id: `x${i}`, text: `${o.text}!`, correct: false }))];
  assert.match(validateItem(many).join("|"), /4–5 options/);
});

test("every option needs an explanation", () => {
  const q = validQuestion();
  q.options[2].why = "  ";
  assert.match(validateItem(q).join("|"), /option c.*explanation/);
});

test("rejects duplicate option text", () => {
  const q = validQuestion();
  q.options[3].text = "2 MM";
  assert.match(validateItem(q).join("|"), /duplicate option text/);
});

test("rejects 'all/none of the above' because options are shuffled", () => {
  const q = validQuestion();
  q.options[3].text = "None of the above";
  assert.match(validateItem(q).join("|"), /of the above/);
});

test("part must match the unit", () => {
  const q = validQuestion();
  q.part = 2;
  assert.match(validateItem(q).join("|"), /part 2 does not match unit 12/);
});

test("id prefix must match the unit and the item type", () => {
  const q = validQuestion();
  q.id = "u10-q001";
  assert.match(validateItem(q).join("|"), /id/);
  const f = validFlashcard();
  f.id = "u12-q009";
  assert.match(validateItem(f).join("|"), /id/);
});

test("rejects out-of-range unit, difficulty, bloom and source", () => {
  const q = validQuestion() as unknown as Record<string, unknown>;
  q.unit = 41;
  q.difficulty = 4;
  q.bloom = "memorise";
  q.source = "lehninger";
  const errors = validateItem(q as unknown as Question).join("|");
  assert.match(errors, /unit/);
  assert.match(errors, /difficulty/);
  assert.match(errors, /bloom/);
  assert.match(errors, /source/);
});

test("a malformed unit cannot inject into the id check", () => {
  const q = validQuestion() as unknown as Record<string, unknown>;
  q.unit = ".*";
  q.id = "u99-q001"; // would match an injected pattern ^u.*-q\d{3}$
  assert.match(validateItem(q as unknown as Question).join("|"), /id u99-q001/);
});

test("rejects empty stem and empty flashcard sides", () => {
  const q = validQuestion();
  q.stem = "";
  assert.match(validateItem(q).join("|"), /stem/);
  const f = validFlashcard();
  f.back = "";
  assert.match(validateItem(f).join("|"), /back/);
});

test("validateBank flags duplicate ids and duplicate stems across items", () => {
  const a = validQuestion();
  const b = { ...validQuestion(), options: validQuestion().options };
  const errors = validateBank([a, b]).join("|");
  assert.match(errors, /duplicate id u12-q001/);
  assert.match(errors, /duplicate stem/);
});

const validSummary = (): UnitSummary => ({
  overview: "Enzymes speed reactions by lowering the activation energy.",
  sections: [{ heading: "Michaelis–Menten", points: ["v0 = Vmax[S]/(Km + [S])"] }],
  keyTerms: [{ term: "Km", definition: "[S] at which v0 = ½Vmax" }],
  examTips: ["Enzymes never change ΔG°′ or K′eq."],
});

test("a complete summary has no errors", () => {
  assert.deepEqual(validateSummary(validSummary()), []);
});

test("a summary needs an overview, sections with points, key terms and exam tips", () => {
  assert.match(validateSummary(undefined).join("|"), /missing/);
  const s = validSummary();
  s.overview = " ";
  s.sections = [{ heading: "", points: [] }];
  s.keyTerms = [];
  s.examTips = [""];
  const errors = validateSummary(s).join("|");
  for (const word of ["overview", "heading", "no points", "key term", "exam tip"]) assert.match(errors, new RegExp(word));
});

test("summary key terms must be unique", () => {
  const s = validSummary();
  s.keyTerms.push({ term: "KM", definition: "duplicate" });
  assert.match(validateSummary(s).join("|"), /duplicate key term/);
});

test("validateUnitFile rejects a unit without a summary", () => {
  const file = { unit: 12, title: "t", outcomes: ["o"], questions: [], flashcards: [] } as unknown as UnitFile;
  assert.match(validateUnitFile(file).join("|"), /unit 12 summary: missing/);
});

test("validateUnitFile requires items to belong to the file's unit and listed outcomes", () => {
  const file = {
    unit: 12,
    title: "Enzyme kinetics",
    outcomes: ["Enzyme kinetics – Michaelis–Menten equation"],
    summary: validSummary(),
    questions: [validQuestion()],
    flashcards: [validFlashcard()],
  };
  const errors = validateUnitFile(file).join("|");
  assert.match(errors, /u12-f001: outcome "Enzymatic inhibition" is not listed/);
  file.outcomes.push("Enzymatic inhibition");
  assert.deepEqual(validateUnitFile(file), []);
  file.questions[0] = { ...validQuestion(), unit: 10, part: 1, id: "u10-q001" };
  assert.match(validateUnitFile(file).join("|"), /u10-q001: belongs to unit 10, file is unit 12/);
});

test("validateBank passes a clean bank", () => {
  const b = validQuestion();
  b.id = "u12-q002";
  b.stem = "Which change is produced by a competitive inhibitor?";
  assert.deepEqual(validateBank([validQuestion(), b, validFlashcard()]), []);
});
