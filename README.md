# Biochem Revision

A free revision app for veterinary biochemistry students (Part 1: Units 1–14): topic summaries, practice questions with explanations, timed mock exams and spaced-repetition flashcards. It works offline and needs no account; progress stays on the student's device.

**Open the app:** https://bsey0003-netizen.github.io/biochem-revision/

## Development

Requires Node 24.

```bash
npm ci --ignore-scripts
npm run dev        # local app
npm test           # logic tests (node:test) + app tests (Vitest)
npm run check      # validates all content files
npm run build      # check + production build into dist/
```

Content lives in `content/part1/unit-NN.json` (one file per syllabus unit) and `syllabus/part1.json` (topics). Every push to `main` is tested and, if everything passes, published to GitHub Pages.
