(() => {
"use strict";

// ---------- Data & constants ----------
const DATA = JSON.parse(document.getElementById("data").textContent);
const BR = globalThis.BR;
const STORE_KEY = "biochem-demo-v1";
/** Full = the real Part 1 partial's ~25 questions; its timing is a practice suggestion, not the official one. */
const MOCK_FORMATS = {
  quick: { size: 10, minutes: 15, title: "Quick mock" },
  full: { size: 25, minutes: 45, title: "Full partial" },
};
const LETTERS = ["A", "B", "C", "D", "E"];
const SVG_NS = "http://www.w3.org/2000/svg";
const CHEERS = ["Nice one! 🎉", "Spot on! ✨", "You've got it! 🧠", "Brilliant! 🌟", "Yes! Keep going 💪"];

const topics = DATA.syllabus.topics;
const unitContent = new Map(DATA.units.map((u) => [u.unit, u]));
const questions = DATA.units.flatMap((u) => u.questions);
const flashcards = DATA.units.flatMap((u) => u.flashcards);
const topicById = (id) => topics.find((t) => t.id === id);
const topicOf = (unit) => topics.find((t) => t.units.some((u) => u.unit === unit));
const unitTitle = (n) => topicOf(n)?.units.find((u) => u.unit === n)?.title ?? `Unit ${n}`;
const unitsOf = (topic) => topic.units.map((u) => u.unit);
const isReady = (topic) => topic.units.some((u) => unitContent.has(u.unit));
const unitRange = (topic) => {
  const n = unitsOf(topic);
  return n.length === 1 ? `Unit ${n[0]}` : `Units ${n[0]}–${n[n.length - 1]}`;
};
const questionsOf = (topic) => questions.filter((q) => unitsOf(topic).includes(q.unit));
const cardsOf = (topic) => flashcards.filter((c) => !topic || unitsOf(topic).includes(c.unit));
const themeClass = (topic) => (topic ? `t-${topic.color}` : "");

// ---------- Persistence (per device; works when storage is blocked) ----------
const emptyState = () => ({ q: {}, cards: {}, mocks: [] });
const loadState = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
    if (!parsed || typeof parsed !== "object") return emptyState();
    return {
      q: parsed.q && typeof parsed.q === "object" ? parsed.q : {},
      cards: parsed.cards && typeof parsed.cards === "object" ? parsed.cards : {},
      mocks: Array.isArray(parsed.mocks) ? parsed.mocks : [],
    };
  } catch {
    return emptyState();
  }
};
let state = loadState();
const saveState = () => {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch { /* storage blocked: keep progress for this visit only */ }
};

// ---------- DOM helpers (text only — content is never parsed as HTML) ----------
const append = (el, children) => {
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : String(child));
  }
  return el;
};
const h = (tag, props = {}, ...children) => {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value == null || value === false) continue;
    if (key === "class") el.className = value;
    else if (key.startsWith("on")) el.addEventListener(key.slice(2), value);
    else el.setAttribute(key, value === true ? "" : String(value));
  }
  return append(el, children);
};
const s = (tag, attrs = {}, ...children) => {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) if (value != null) el.setAttribute(key, String(value));
  return append(el, children);
};
const main = document.getElementById("main");
const render = (...nodes) => main.replaceChildren(...nodes.flat(Infinity).filter((n) => n != null && n !== false));
const toastEl = document.querySelector(".toast");
let toastTimer;
const toast = (message) => {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2600);
};
const percent = (correct, total) => (total ? Math.round((correct / total) * 100) : 0);
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const bar = (value) => h("div", { class: "bar", role: "presentation" }, h("i", { style: `width:${Math.max(0, Math.min(100, value))}%` }));
const difficultyDots = (d) => "●".repeat(d) + "○".repeat(3 - d);
const sourceChip = (source) =>
  source === "slides" ? h("span", { class: "chip" }, "📑 From the slides") : h("span", { class: "chip warn" }, "🔭 Beyond the slides");
const focusHeading = () => main.querySelector("[data-focus]")?.focus();
const heading = (level, text, props = {}) => h(level, { tabindex: -1, "data-focus": true, ...props }, text);

// ---------- Beta, the mascot (inline SVG, decorative) ----------
const mascot = (mood = "happy", size = 72) => {
  const ink = "#2a2438";
  const stroke = { stroke: ink, "stroke-width": 3, "stroke-linecap": "round", fill: "none" };
  const eyes = mood === "sleepy"
    ? [s("path", { d: "M29 44 q5 4 10 0", ...stroke }), s("path", { d: "M51 44 q5 4 10 0", ...stroke })]
    : [s("circle", { cx: 34, cy: 44, r: 4.5, fill: ink }), s("circle", { cx: 56, cy: 44, r: 4.5, fill: ink }),
       s("circle", { cx: 35.5, cy: 42.5, r: 1.4, fill: "#fff" }), s("circle", { cx: 57.5, cy: 42.5, r: 1.4, fill: "#fff" })];
  const mouth = mood === "cheer"
    ? s("path", { d: "M37 53 q8 11 16 0 z", fill: ink })
    : mood === "sleepy" ? s("path", { d: "M41 57 h8", ...stroke }) : s("path", { d: "M38 54 q7 7 14 0", ...stroke });
  return s("svg", { class: "mascot", width: size, height: size, viewBox: "0 0 90 90", "aria-hidden": "true" },
    s("g", { class: "bob" },
      s("line", { x1: 32, y1: 24, x2: 22, y2: 9, stroke: "#9a82ff", "stroke-width": 4, "stroke-linecap": "round" }),
      s("circle", { cx: 21, cy: 8, r: 6.5, fill: "#ff9ab6" }),
      s("line", { x1: 58, y1: 24, x2: 68, y2: 9, stroke: "#9a82ff", "stroke-width": 4, "stroke-linecap": "round" }),
      s("circle", { cx: 69, cy: 8, r: 6.5, fill: "#7dd8b5" }),
      s("circle", { cx: 45, cy: 50, r: 31, fill: "#b7a4ff" }),
      s("ellipse", { cx: 35, cy: 34, rx: 11, ry: 7, fill: "#fff", "fill-opacity": 0.35 }),
      s("circle", { cx: 26, cy: 54, r: 5, fill: "#ff9ab6", "fill-opacity": 0.75 }),
      s("circle", { cx: 64, cy: 54, r: 5, fill: "#ff9ab6", "fill-opacity": 0.75 }),
      eyes, mouth,
      mood === "cheer" ? [s("text", { x: 78, y: 34, "font-size": 13, fill: "#f0a038" }, "✦"), s("text", { x: 4, y: 40, "font-size": 10, fill: "#f0a038" }, "✦")] : null,
      mood === "sleepy" ? s("text", { x: 70, y: 30, "font-size": 12, fill: "#9a82ff", "font-weight": 900 }, "z") : null,
    ));
};

const ring = (value, size = 46) => {
  const r = 18;
  const c = 2 * Math.PI * r;
  return s("svg", { class: "ring", width: size, height: size, viewBox: "0 0 44 44", "aria-hidden": "true" },
    s("circle", { cx: 22, cy: 22, r, fill: "none", stroke: "currentColor", "stroke-opacity": 0.15, "stroke-width": 5 }),
    s("circle", { cx: 22, cy: 22, r, fill: "none", style: "stroke: var(--t-strong)", "stroke-width": 5, "stroke-linecap": "round",
      "stroke-dasharray": `${(c * value) / 100} ${c}`, transform: "rotate(-90 22 22)" }),
    s("text", { x: 22, y: 25.5, "text-anchor": "middle", class: "ring-label" }, `${value}%`));
};

// ---------- Stats ----------
const recordAnswer = (id, correct) => {
  const prev = state.q[id] || { seen: 0, correct: 0 };
  state.q[id] = { seen: prev.seen + 1, correct: prev.correct + (correct ? 1 : 0) };
  saveState();
};
const statsFor = (items) =>
  items.reduce((acc, q) => {
    const st = state.q[q.id];
    if (st) { acc.answered += 1; acc.seen += st.seen; acc.correct += st.correct; }
    return acc;
  }, { answered: 0, seen: 0, correct: 0, total: items.length });
const weakOutcomes = () => {
  const groups = new Map();
  for (const q of questions) {
    const key = `${q.unit}|${q.outcome}`;
    groups.set(key, [...(groups.get(key) || []), q]);
  }
  return [...groups.values()]
    .map((items) => ({ unit: items[0].unit, outcome: items[0].outcome, ...statsFor(items) }))
    .filter((o) => o.seen >= 2)
    .sort((a, b) => a.correct / a.seen - b.correct / b.seen)
    .slice(0, 3);
};
const dueCount = (cards) => BR.dueCards(cards.map((c) => c.id), state.cards, Date.now()).length;

// ---------- Router (#home, #topic/<id>, #practice, #mock, #cards, #explore) ----------
const views = {};
const tabs = [...document.querySelectorAll(".tabbar button")];
let route = { name: "home", arg: null };
const parseHash = () => {
  const [name, arg] = location.hash.slice(1).split("/");
  if (!views[name]) return { name: "home", arg: null };
  try {
    return { name, arg: arg ? decodeURIComponent(arg) : null };
  } catch {
    return { name: "home", arg: null }; // malformed link: fall back to Home instead of a blank page
  }
};
const highlightTab = () => {
  const tab = route.name === "topic" ? "home" : route.name;
  for (const b of tabs) {
    if (b.dataset.tab === tab) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  }
};
const show = ({ focus = true } = {}) => {
  route = parseHash();
  highlightTab();
  views[route.name](route.arg);
  window.scrollTo(0, 0);
  if (focus) focusHeading();
};
const go = (name, arg = null) => {
  const hash = `#${name}${arg ? `/${encodeURIComponent(arg)}` : ""}`;
  if (location.hash === hash) show();
  else location.hash = hash;
};
for (const b of tabs) b.addEventListener("click", () => go(b.dataset.tab));
window.addEventListener("hashchange", () => show());

// ---------- Home: greeting + topic grid ----------
views.home = () => {
  const all = statsFor(questions);
  const weak = weakOutcomes();
  const message = all.answered === 0
    ? "Hi, I'm Beta! 👋 Pick a topic and let's get ready for your Part 1 test."
    : all.seen && percent(all.correct, all.seen) >= 70
      ? `You're on fire — ${percent(all.correct, all.seen)}% correct so far! 🔥`
      : `${all.answered} questions tried. Every mistake is a step forward! 🌱`;
  render(
    h("section", { class: "card greet" }, mascot(all.answered ? "cheer" : "happy", 76), h("div", { class: "bubble" }, message)),
    h("div", { class: "stats" },
      h("div", { class: "stat" }, h("b", {}, `${all.answered}/${all.total}`), h("span", {}, "tried")),
      h("div", { class: "stat" }, h("b", {}, all.seen ? `${percent(all.correct, all.seen)}%` : "–"), h("span", {}, "accuracy")),
      h("div", { class: "stat" }, h("b", {}, dueCount(flashcards)), h("span", {}, "cards due"))),
    h("div", { class: "section-title" }, heading("h1", "Topics"), h("span", { class: "small muted" }, DATA.syllabus.title)),
    h("div", { class: "topic-grid" }, topics.map((t) => {
      const body = [
        h("span", { class: "topic-emoji", "aria-hidden": "true" }, t.emoji),
        h("span", { class: "t-title" }, t.title),
        h("span", { class: "t-units" }, unitRange(t)),
      ];
      if (!isReady(t)) {
        return h("div", { class: `topic-tile locked ${themeClass(t)}`, role: "group", "aria-label": `${t.title}, ${unitRange(t)}, coming soon` },
          body, h("span", { class: "chip" }, "🔒 Coming soon"));
      }
      const st = statsFor(questionsOf(t));
      return h("button", { class: `topic-tile ${themeClass(t)}`, type: "button", onclick: () => go("topic", t.id),
        "aria-label": `${t.title}, ${unitRange(t)}, ${percent(st.answered, st.total)}% tried` },
        body, ring(percent(st.answered, st.total)), h("span", { class: "chip topic" }, `${st.total} questions`));
    })),
    h("div", { class: "section-title" }, h("h2", {}, "Focus next 🎯")),
    h("section", { class: "card" },
      weak.length
        ? h("ul", { class: "list" }, weak.map((o) => {
            const t = topicOf(o.unit);
            return h("li", { class: `list-row ${themeClass(t)}` },
              h("span", { class: "unit-badge" }, t.emoji),
              h("div", {}, h("div", { style: "font-weight:700" }, o.outcome), bar(percent(o.correct, o.seen)),
                h("div", { class: "small muted" }, `Unit ${o.unit} · ${percent(o.correct, o.seen)}% correct`)),
              h("button", { class: "btn soft sm", type: "button", onclick: () => startDrill({ unit: o.unit, outcome: o.outcome }) }, "Practise"));
          }))
        : h("p", { class: "muted small", style: "margin:0" }, "Answer a few questions and your trickiest topics will show up here.")),
    state.mocks.length
      ? [h("div", { class: "section-title" }, h("h2", {}, "Mock exams ⏱️")),
         h("section", { class: "card" }, h("ul", { class: "list" }, state.mocks.slice(-5).reverse().map((m) =>
           h("li", { class: "list-row" }, h("span", { class: `chip ${m.mark >= 5 ? "good" : "bad"}` }, `${m.mark}/10`),
             h("span", {}, `${m.correct} of ${m.total} correct`), h("span", { class: "small muted" }, m.date)))))]
      : null,
    h("div", { class: "row", style: "justify-content:center;margin-top:8px" },
      h("button", { class: "btn ghost sm", type: "button", onclick: () => {
        if (confirm("Reset all progress on this device?")) { state = emptyState(); saveState(); go("home"); toast("Progress reset 🧹"); }
      } }, "Reset progress")),
    h("p", { class: "small muted", style: "text-align:center" }, `Progress is saved on this device only · content ${DATA.builtAt}`),
  );
};

// ---------- Topic page: summary + actions ----------
const renderSummary = (content, topic) => {
  const sm = content.summary;
  return h("section", { class: "card" },
    h("div", { class: "overview" }, sm.overview),
    sm.sections.map((sec) => h("div", { style: "margin-top:14px" },
      h("h3", {}, sec.heading),
      h("ul", { class: "points" }, sec.points.map((p) => h("li", {}, p))))),
    h("h3", { style: "margin-top:18px" }, "Key terms 🔑"),
    h("div", { class: "terms" }, sm.keyTerms.map((t) => h("details", { class: "term" }, h("summary", {}, t.term), h("p", {}, t.definition)))),
    h("div", { class: "tips", style: "margin-top:16px" },
      h("h3", {}, "💡 Exam traps"),
      h("ul", {}, sm.examTips.map((tip) => h("li", {}, tip)))),
    h("div", { class: "row", style: "margin-top:16px" },
      h("button", { class: "btn soft sm", type: "button", onclick: () => startDrill({ unit: content.unit, from: topic.id }) }, `✏️ Practise Unit ${content.unit}`),
      h("button", { class: "btn ghost sm", type: "button", onclick: () => startDeck(topic.id, content.unit, topic.id) }, "🃏 Its flashcards")));
};
views.topic = (id) => {
  const topic = topicById(id);
  if (!topic || !isReady(topic)) return go("home");
  const tq = questionsOf(topic);
  const st = statsFor(tq);
  const due = dueCount(cardsOf(topic));
  render(h("div", { class: themeClass(topic) },
    h("button", { class: "btn ghost", type: "button", onclick: () => go("home") }, "‹ All topics"),
    h("section", { class: "banner" },
      h("span", { class: "topic-emoji", "aria-hidden": "true" }, topic.emoji),
      h("div", {}, heading("h1", topic.title), h("div", { class: "small", style: "font-weight:700" }, `${unitRange(topic)} · ${st.answered}/${st.total} questions tried`))),
    h("div", { class: "actions" },
      h("button", { class: "btn primary", type: "button", onclick: () => startDrill({ topicId: topic.id, from: topic.id }) }, `✏️ Practise (${tq.length})`),
      h("button", { class: "btn soft", type: "button", disabled: !due, onclick: () => startDeck(topic.id, null, topic.id) }, due ? `🃏 Cards (${due} due)` : "🃏 All caught up")),
    topic.units.map(({ unit, title }) => {
      const content = unitContent.get(unit);
      const us = statsFor(questions.filter((q) => q.unit === unit));
      return h("div", {},
        h("div", { class: "unit-head" },
          h("span", { class: "unit-badge" }, unit),
          h("div", { style: "flex:1" }, h("h2", { style: "margin:0" }, title),
            content ? h("div", { class: "small muted" }, `${us.answered}/${us.total} tried${us.seen ? ` · ${percent(us.correct, us.seen)}% correct` : ""}`) : null)),
        content
          ? renderSummary(content, topic)
          : h("section", { class: "card locked-unit" }, mascot("sleepy", 54), h("div", {}, h("strong", {}, "Summary coming soon"), h("div", { class: "small" }, "Beta is still writing this one."))));
    }),
  ));
};

// ---------- Practice ----------
let drill = null;
const orderForDrill = (items) => {
  const score = (q) => { const st = state.q[q.id]; return st ? st.correct / st.seen : -1; }; // unseen first, then weakest
  return BR.shuffle(items).sort((a, b) => score(a) - score(b)).map((q) => BR.shuffleOptions(q));
};
/** `from` = id of the topic page a session was started from, so "back" returns to that summary. */
const startDrill = ({ topicId = null, unit = null, outcome = null, ids = null, from = null } = {}) => {
  const topic = topicId ? topicById(topicId) : unit ? topicOf(unit) : null;
  const pool = questions.filter((q) => ids ? ids.includes(q.id)
    : (!topicId || unitsOf(topic).includes(q.unit)) && (!unit || q.unit === unit) && (!outcome || q.outcome === outcome));
  const label = outcome || (unit ? `Unit ${unit} · ${unitTitle(unit)}` : topic ? topic.title : ids ? "Retry missed" : "Mixed practice");
  drill = { topic, label, from, queue: orderForDrill(pool), index: 0, chosen: null, showAll: false, results: [], streak: 0, cheer: null };
  go("practice");
};
const backLabel = (session, fallback) => (session?.from ? topicById(session.from).title : fallback);
const leaveDrill = () => {
  const from = drill?.from;
  drill = null;
  if (from) go("topic", from);
  else go("practice");
};
views.practice = () => {
  if (!drill) return renderDrillPicker();
  if (drill.index >= drill.queue.length) return renderDrillSummary();
  return renderDrillQuestion();
};
const renderDrillPicker = () => {
  const ready = topics.filter(isReady);
  const later = topics.filter((t) => !isReady(t));
  render(
    heading("h1", "Practice ✏️"),
    h("p", { class: "muted" }, "Instant feedback with an explanation for every option. New and tricky questions come first."),
    h("button", { class: "btn primary block", type: "button", style: "margin-bottom:16px", onclick: () => startDrill() }, `🎲 Mixed practice · ${questions.length} questions`),
    ready.map((t) => h("section", { class: `card stack ${themeClass(t)}` },
      h("div", { class: "spread" },
        h("div", { class: "row" }, h("span", { class: "unit-badge", style: "font-size:1.2rem" }, t.emoji),
          h("div", {}, h("h2", { style: "margin:0" }, t.title), h("div", { class: "small muted" }, unitRange(t)))),
        h("button", { class: "btn soft sm", type: "button", onclick: () => startDrill({ topicId: t.id }) }, `All (${questionsOf(t).length})`)),
      t.units.filter((u) => unitContent.has(u.unit)).map(({ unit, title }) => {
        const content = unitContent.get(unit);
        return h("div", {},
          h("div", { class: "small", style: "font-weight:800;margin-bottom:6px" }, `Unit ${unit} · ${title}`),
          h("div", { class: "row" },
            h("button", { class: "chip topic", type: "button", style: "border:0;padding:6px 12px", onclick: () => startDrill({ unit }) }, "Whole unit"),
            content.outcomes.map((o) => {
              const n = content.questions.filter((q) => q.outcome === o).length;
              return n ? h("button", { class: "chip", type: "button", style: "border:0;padding:6px 12px", onclick: () => startDrill({ unit, outcome: o }) }, `${o} · ${n}`) : null;
            })));
      }))),
    later.length
      ? h("section", { class: "card" }, h("h3", {}, "Coming soon 🔒"),
          h("div", { class: "row" }, later.map((t) => h("span", { class: `chip topic ${themeClass(t)}` }, `${t.emoji} ${t.title}`))))
      : null,
  );
};
const answerDrill = (optionId) => {
  if (drill.chosen) return;
  const q = drill.queue[drill.index];
  const option = q.options.find((o) => o.id === optionId);
  drill.chosen = optionId;
  drill.streak = option.correct ? drill.streak + 1 : 0;
  drill.cheer = option.correct ? pick(CHEERS) : null;
  drill.results.push({ id: q.id, correct: option.correct });
  recordAnswer(q.id, option.correct);
  renderDrillQuestion();
  if (!option.correct) main.querySelector("article.card")?.classList.add("wiggle");
  main.querySelector(".feedback")?.focus();
};
const nextDrill = () => {
  drill.index += 1;
  drill.chosen = null;
  drill.showAll = false;
  views.practice();
  window.scrollTo(0, 0);
  focusHeading();
};
const renderDrillQuestion = () => {
  const q = drill.queue[drill.index];
  const answered = Boolean(drill.chosen);
  const chosen = q.options.find((o) => o.id === drill.chosen);
  const correct = q.options.find((o) => o.correct);
  const topic = topicOf(q.unit);
  render(h("div", { class: themeClass(drill.topic || topic) },
    h("div", { class: "spread", style: "margin-bottom:8px" },
      h("button", { class: "btn ghost", type: "button", onclick: leaveDrill }, `‹ ${backLabel(drill, "Practice")}`),
      h("div", { class: "row", style: "gap:6px" },
        drill.streak >= 2 ? h("span", { class: "chip warn pop" }, `🔥 ${drill.streak}`) : null,
        h("span", { class: "small muted", style: "font-weight:700" }, `${drill.index + 1} / ${drill.queue.length}`))),
    h("div", { class: "progress-line" }, h("i", { style: `width:${((drill.index + (answered ? 1 : 0)) / drill.queue.length) * 100}%` })),
    h("article", { class: "card" },
      h("div", { class: "q-meta" },
        h("span", { class: "chip topic" }, `${topic.emoji} Unit ${q.unit}`),
        h("span", { class: "chip" }, q.outcome),
        h("span", { class: "chip", "aria-label": `Difficulty ${q.difficulty} of 3` }, difficultyDots(q.difficulty)),
        sourceChip(q.source)),
      heading("h2", q.stem, { class: "q-stem" }),
      h("ul", { class: "options" }, q.options.map((o, i) => {
        let cls = "option";
        if (answered && o.correct) cls += " correct";
        else if (answered && o.id === drill.chosen) cls += " wrong";
        return h("li", {}, h("button", { class: cls, type: "button", disabled: answered, onclick: () => answerDrill(o.id), "aria-label": `${LETTERS[i]}: ${o.text}` },
          h("span", { class: "key" }, answered && o.correct ? "✓" : answered && o.id === drill.chosen ? "✗" : LETTERS[i]),
          h("span", {}, o.text, answered && (drill.showAll || o.correct || o.id === drill.chosen) ? h("div", { class: "why" }, o.why) : null)));
      })),
      answered
        ? h("div", { class: `feedback pop ${chosen.correct ? "good" : "bad"}`, tabindex: -1, role: "status" },
            h("span", { class: "fb-emoji", "aria-hidden": "true" }, chosen.correct ? "🎉" : "💡"),
            h("span", {}, chosen.correct ? drill.cheer : `Almost! The answer is ${LETTERS[q.options.indexOf(correct)]}. Read why above.`))
        : null),
    answered
      ? h("div", { class: "row" },
          h("button", { class: "btn primary", type: "button", onclick: nextDrill }, drill.index + 1 < drill.queue.length ? "Next →" : "See results 🏁"),
          drill.showAll ? null : h("button", { class: "btn soft", type: "button", onclick: () => { drill.showAll = true; renderDrillQuestion(); } }, "Explain all options"),
          h("button", { class: "btn ghost sm", type: "button", onclick: () => toast(`In the full app this reports ${q.id} to your lecturer.`) }, "Report a problem"))
      : h("p", { class: "small muted" }, "Tip: press 1–4 to answer, Enter for the next question."),
  ));
};
const renderDrillSummary = () => {
  const right = drill.results.filter((r) => r.correct).length;
  const pct = percent(right, drill.results.length);
  const missed = drill.results.filter((r) => !r.correct).map((r) => r.id);
  render(
    h("section", { class: "card empty" },
      mascot(pct >= 70 ? "cheer" : "happy", 96),
      heading("h1", pct >= 70 ? "Amazing work! 🌟" : pct >= 40 ? "Good effort! 💪" : "Practice makes perfect 🌱"),
      h("div", { class: "big-score" }, `${right}/${drill.results.length}`),
      h("p", { class: "muted" }, `${pct}% correct · ${drill.label}`),
      missed.length
        ? h("button", { class: "btn primary", type: "button", onclick: () => startDrill({ ids: missed, from: drill.from }) }, `🔁 Retry the ${missed.length} you missed`)
        : h("p", { style: "font-weight:700" }, "Clean sweep! Try a mock exam next. ⏱️")),
    h("button", { class: "btn block", type: "button", onclick: leaveDrill }, `Back to ${backLabel(drill, "practice")}`),
  );
};

// ---------- Mock exam ----------
let mock = null;
let mockTimer = null;
const startMock = (formatKey = "quick") => {
  const format = MOCK_FORMATS[formatKey] || MOCK_FORMATS.quick;
  mock = { formatKey, questions: BR.buildMockExam(questions, format.size), answers: {}, index: 0, startedAt: Date.now(), endsAt: Date.now() + format.minutes * 60000, result: null };
  clearInterval(mockTimer);
  mockTimer = setInterval(tickMock, 1000);
  go("mock");
};
const formatClock = (ms) => {
  const sec = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
};
const tickMock = () => {
  if (!mock || mock.result) return clearInterval(mockTimer);
  const left = mock.endsAt - Date.now();
  if (left <= 0) { submitMock(true); return; }
  const el = document.querySelector(".timer");
  if (el) { el.textContent = `⏱️ ${formatClock(left)}`; el.classList.toggle("low", left < 60000); }
};
const submitMock = (timeUp = false) => {
  clearInterval(mockTimer);
  const score = BR.scoreExam(mock.questions, mock.answers);
  for (const q of mock.questions) {
    if (mock.answers[q.id]) recordAnswer(q.id, q.options.find((o) => o.id === mock.answers[q.id])?.correct === true);
  }
  mock.result = { ...score, timeUp, usedMs: Math.min(Date.now(), mock.endsAt) - mock.startedAt };
  state.mocks.push({ date: new Date().toISOString().slice(0, 10), mark: score.mark, correct: score.correct, total: score.total });
  saveState();
  if (route.name === "mock") show();
  if (timeUp) toast("Time's up — your exam was submitted ⏰");
};
views.mock = () => {
  if (!mock) return renderMockIntro();
  if (mock.result) return renderMockResult();
  return renderMockQuestion();
};
const renderMockIntro = () => {
  render(
    h("section", { class: "card greet" }, mascot("happy", 70), h("div", { class: "bubble" }, "Exam mode! No hints until you submit — you've got this. 💪")),
    heading("h1", "Mock exam ⏱️"),
    h("p", { class: "muted" }, "Questions are drawn at random and spread evenly across all Part 1 units. Like the real partial, there's no feedback until you submit, and you can change answers before then."),
    Object.entries(MOCK_FORMATS).map(([key, f]) =>
      h("section", { class: "card spread" },
        h("div", {}, h("h2", { style: "margin:0" }, key === "full" ? `📝 ${f.title}` : `⚡ ${f.title}`),
          h("div", { class: "small muted" }, `${f.size} questions · ${f.minutes} minutes${key === "full" ? " · same length as the real Part 1 partial" : ""}`)),
        h("button", { class: `btn ${key === "full" ? "primary" : "soft"}`, type: "button", onclick: () => startMock(key) }, "Start"))),
    h("p", { class: "small muted" }, "Timings are for practice; check the official exam duration with your lecturer."),
  );
};
const renderMockQuestion = () => {
  const q = mock.questions[mock.index];
  const answeredCount = Object.keys(mock.answers).length;
  render(
    h("div", { class: "spread", style: "margin-bottom:10px" },
      h("span", { class: "small muted", style: "font-weight:700" }, `Question ${mock.index + 1} of ${mock.questions.length}`),
      h("span", { class: "timer", "aria-label": "Time remaining" }, `⏱️ ${formatClock(mock.endsAt - Date.now())}`)),
    h("div", { class: "progress-line" }, h("i", { style: `width:${(answeredCount / mock.questions.length) * 100}%` })),
    h("article", { class: "card" },
      h("div", { class: "q-meta" }, h("span", { class: "chip accent" }, `Unit ${q.unit}`)),
      heading("h2", q.stem, { class: "q-stem" }),
      h("ul", { class: "options" }, q.options.map((o, i) =>
        h("li", {}, h("button", {
          class: `option${mock.answers[q.id] === o.id ? " selected" : ""}`, type: "button",
          "aria-pressed": mock.answers[q.id] === o.id ? "true" : "false",
          onclick: () => { mock.answers[q.id] = o.id; renderMockQuestion(); },
        }, h("span", { class: "key" }, LETTERS[i]), h("span", {}, o.text)))))),
    h("div", { class: "spread", style: "margin-bottom:16px" },
      h("button", { class: "btn", type: "button", disabled: mock.index === 0, onclick: () => moveMock(-1) }, "← Back"),
      mock.index + 1 < mock.questions.length
        ? h("button", { class: "btn primary", type: "button", onclick: () => moveMock(1) }, "Next →")
        : h("button", { class: "btn primary", type: "button", onclick: confirmSubmit }, "Submit")),
    h("section", { class: "card" },
      h("div", { class: "spread", style: "margin-bottom:10px" }, h("h3", { style: "margin:0" }, "Questions"), h("span", { class: "small muted" }, `${answeredCount} answered`)),
      h("div", { class: "qgrid" }, mock.questions.map((mq, i) =>
        h("button", { type: "button", class: mock.answers[mq.id] ? "answered" : "", "aria-current": i === mock.index ? "true" : null,
          "aria-label": `Question ${i + 1}${mock.answers[mq.id] ? ", answered" : ""}`, onclick: () => { mock.index = i; renderMockQuestion(); focusHeading(); } }, i + 1))),
      h("button", { class: "btn block", type: "button", style: "margin-top:14px", onclick: confirmSubmit }, "Submit exam")),
  );
};
const moveMock = (step) => {
  mock.index = Math.max(0, Math.min(mock.questions.length - 1, mock.index + step));
  renderMockQuestion();
  window.scrollTo(0, 0);
  focusHeading();
};
const confirmSubmit = () => {
  const unanswered = mock.questions.length - Object.keys(mock.answers).length;
  if (unanswered && !confirm(`${unanswered} question(s) unanswered. Submit anyway?`)) return;
  submitMock(false);
};
const renderMockResult = () => {
  const r = mock.result;
  const passed = r.mark >= 5;
  render(
    h("section", { class: "card empty" },
      mascot(passed ? "cheer" : "happy", 92),
      heading("h1", passed ? "You passed this mock! 🎉" : "Keep going — you'll get there! 🌱"),
      h("div", { class: "big-score" }, `${r.mark}/10`),
      h("p", { class: "muted" }, `${r.correct} of ${r.total} correct · ${formatClock(r.usedMs)} used${r.timeUp ? " (time ran out)" : ""}`),
      h("div", { style: "text-align:left" }, Object.entries(r.byUnit).map(([unit, us]) => {
        const t = topicOf(Number(unit));
        return h("div", { class: themeClass(t), style: "margin-top:10px" },
          h("div", { class: "spread small", style: "font-weight:700" }, h("span", {}, `${t.emoji} Unit ${unit} · ${unitTitle(Number(unit))}`), h("span", {}, `${us.correct}/${us.total}`)),
          bar(percent(us.correct, us.total)));
      }))),
    h("div", { class: "row", style: "margin-bottom:16px" },
      h("button", { class: "btn primary", type: "button", onclick: () => startMock(mock.formatKey) }, "New mock exam"),
      h("button", { class: "btn", type: "button", onclick: () => { mock = null; go("mock"); } }, "Done")),
    h("h2", {}, "Review 🔍"),
    mock.questions.map((q, i) => {
      const chosen = q.options.find((o) => o.id === mock.answers[q.id]);
      const correct = q.options.find((o) => o.correct);
      return h("article", { class: "card" },
        h("div", { class: "q-meta" },
          h("span", { class: "chip accent" }, `Q${i + 1} · Unit ${q.unit}`),
          chosen ? h("span", { class: `chip ${chosen.correct ? "good" : "bad"}` }, chosen.correct ? "✓ Correct" : "✗ Incorrect") : h("span", { class: "chip bad" }, "Not answered")),
        h("h3", {}, q.stem),
        chosen && !chosen.correct ? h("div", { class: "feedback bad", style: "display:block" }, `Your answer: ${chosen.text}`, h("div", { class: "why" }, chosen.why)) : null,
        h("div", { class: "feedback good", style: "display:block" }, `Answer: ${correct.text}`, h("div", { class: "why" }, correct.why)));
    }),
  );
};

// ---------- Flashcards ----------
let deck = null;
const startDeck = (topicId = null, unit = null, from = null) => {
  const topic = topicId ? topicById(topicId) : null;
  const cards = cardsOf(topic).filter((c) => !unit || c.unit === unit);
  deck = { topic, from, queue: BR.dueCards(cards.map((c) => c.id), state.cards, Date.now()), flipped: false, reviewed: 0 };
  go("cards");
};
const leaveDeck = () => {
  const from = deck?.from;
  deck = null;
  if (from) go("topic", from);
  else go("cards");
};
const intervalLabel = (id, rating) => {
  const next = BR.reviewCard(state.cards[id], rating, Date.now());
  const days = Math.round((next.due - Date.now()) / BR.DAY_MS);
  return days === 0 ? "now" : days === 1 ? "1 day" : `${days} days`;
};
const rateCard = (rating) => {
  const id = deck.queue.shift();
  state.cards[id] = BR.reviewCard(state.cards[id], rating, Date.now());
  saveState();
  if (rating === "again") deck.queue.push(id);
  deck.reviewed += 1;
  deck.flipped = false;
  views.cards();
  focusHeading();
};
views.cards = () => {
  if (!deck) {
    const allDue = dueCount(flashcards);
    return render(
      heading("h1", "Flashcards 🃏"),
      h("p", { class: "muted" }, "Cards you know come back after longer gaps (1 → 3 → 7 → 14 → 30 days). Cards you miss come straight back."),
      h("section", { class: "card spread" },
        h("div", {}, h("h2", { style: "margin:0" }, "🎲 All topics"), h("div", { class: "small muted" }, `${flashcards.length} cards · ${allDue} due`)),
        h("button", { class: `btn ${allDue ? "primary" : ""}`, type: "button", disabled: !allDue, onclick: () => startDeck() }, allDue ? "Study" : "Done ✓")),
      topics.filter(isReady).map((t) => {
        const due = dueCount(cardsOf(t));
        return h("section", { class: `card spread ${themeClass(t)}` },
          h("div", { class: "row" }, h("span", { class: "unit-badge", style: "font-size:1.2rem" }, t.emoji),
            h("div", {}, h("h2", { style: "margin:0" }, t.title), h("div", { class: "small muted" }, `${cardsOf(t).length} cards · ${due} due`))),
          h("button", { class: `btn ${due ? "primary" : ""}`, type: "button", disabled: !due, onclick: () => startDeck(t.id) }, due ? "Study" : "Done ✓"));
      }),
    );
  }
  if (!deck.queue.length) {
    return render(
      h("section", { class: "card empty" }, mascot("cheer", 96), heading("h1", "All caught up! 🎉"),
        h("p", { class: "muted" }, `You reviewed ${deck.reviewed} card${deck.reviewed === 1 ? "" : "s"}. Beta will bring them back right on schedule.`)),
      h("button", { class: "btn block", type: "button", onclick: leaveDeck }, `Back to ${backLabel(deck, "decks")}`),
    );
  }
  const card = flashcards.find((c) => c.id === deck.queue[0]);
  const topic = topicOf(card.unit);
  const flip = () => { deck.flipped = !deck.flipped; views.cards(); main.querySelector(".flashcard")?.focus(); };
  render(h("div", { class: themeClass(topic) },
    h("div", { class: "spread", style: "margin-bottom:8px" },
      h("button", { class: "btn ghost", type: "button", onclick: leaveDeck }, `‹ ${backLabel(deck, "Decks")}`),
      h("span", { class: "small muted", style: "font-weight:700" }, `${deck.queue.length} to go`)),
    h("div", { class: "q-meta" }, h("span", { class: "chip topic" }, `${topic.emoji} Unit ${card.unit}`), h("span", { class: "chip" }, card.outcome)),
    h("button", { class: `card flashcard pop${deck.flipped ? " back" : ""}`, type: "button", onclick: flip,
      "aria-label": deck.flipped ? "Answer side. Activate to show the question." : "Question side. Activate to show the answer." },
      h("span", { class: "side" }, deck.flipped ? "Answer" : "Question"),
      h("span", { tabindex: -1, "data-focus": true }, deck.flipped ? card.back : card.front)),
    deck.flipped
      ? h("div", { class: "rate" },
          h("button", { class: "btn", type: "button", onclick: () => rateCard("again") }, "😅 Again", h("span", {}, intervalLabel(card.id, "again"))),
          h("button", { class: "btn primary", type: "button", onclick: () => rateCard("good") }, "🙂 Good", h("span", {}, intervalLabel(card.id, "good"))),
          h("button", { class: "btn", type: "button", onclick: () => rateCard("easy") }, "😎 Easy", h("span", {}, intervalLabel(card.id, "easy"))))
      : h("button", { class: "btn primary block", type: "button", onclick: flip }, "Show answer"),
    h("p", { class: "small muted", style: "margin-top:12px;text-align:center" }, "Keys: Space flips · 1 Again · 2 Good · 3 Easy"),
  ));
};

// ---------- Explore: calculations & pathways ----------
let exploreMode = "calc";
let calc = null;
const newProblem = () => {
  calc = { problem: BR.generateMichaelisMenten(Math.floor(Math.random() * 1e9)), input: "", result: null, showSteps: false, streak: calc?.streak || 0 };
};
views.explore = () => {
  render(
    heading("h1", "Explore 🔬"),
    h("div", { class: "seg", role: "group", "aria-label": "Explore mode" },
      h("button", { type: "button", "aria-pressed": String(exploreMode === "calc"), onclick: () => { exploreMode = "calc"; views.explore(); } }, "🧮 Calculations"),
      h("button", { type: "button", "aria-pressed": String(exploreMode === "pathways"), onclick: () => { exploreMode = "pathways"; views.explore(); } }, "🗺️ Pathways")),
    exploreMode === "calc" ? renderCalc() : renderPathways(),
  );
};
const renderCalc = () => {
  if (!calc) newProblem();
  const p = calc.problem;
  const check = (event) => {
    event.preventDefault();
    const value = Number.parseFloat(String(calc.input).replace(",", "."));
    const ok = BR.checkAnswer(p, value);
    calc.result = Number.isFinite(value) ? (ok ? "right" : "wrong") : "invalid";
    calc.streak = ok ? calc.streak + 1 : 0;
    calc.showSteps = calc.showSteps || !ok;
    views.explore();
    main.querySelector(".feedback")?.focus();
  };
  const answerText = `${Number(p.answer.toPrecision(4))} ${p.answerUnit}`;
  return h("div", { class: "t-sky" },
    h("section", { class: "card stack" },
      h("div", { class: "spread" }, h("span", { class: "chip topic" }, "⚙️ Unit 12 · Michaelis–Menten"), calc.streak ? h("span", { class: "chip warn pop" }, `🔥 ${calc.streak}`) : null),
      h("p", { style: "font-weight:700" }, p.prompt),
      h("form", { class: "stack", onsubmit: check },
        h("label", { for: "calc-answer", class: "small muted" }, `Your answer (${p.answerUnit}) · within 2% counts`),
        h("div", { class: "row", style: "flex-wrap:nowrap" },
          (() => {
            const input = h("input", { id: "calc-answer", class: "input", inputmode: "decimal", autocomplete: "off", value: calc.input });
            input.addEventListener("input", () => { calc.input = input.value; });
            return input;
          })(),
          h("button", { class: "btn primary", type: "submit" }, "Check"))),
      calc.result === "right" ? h("div", { class: "feedback good pop", tabindex: -1, role: "status" }, h("span", { class: "fb-emoji" }, "🎉"), `Correct: ${answerText}`) : null,
      calc.result === "wrong" ? h("div", { class: "feedback bad pop", tabindex: -1, role: "status" }, h("span", { class: "fb-emoji" }, "💡"), `Not quite — it's ${answerText}`) : null,
      calc.result === "invalid" ? h("div", { class: "feedback bad", tabindex: -1, role: "status" }, "Enter a number, e.g. 33.3") : null,
      calc.showSteps
        ? h("div", {}, h("h3", {}, "Working"), h("ol", { class: "steps" }, p.steps.map((st) => h("li", {}, st))))
        : h("button", { class: "btn ghost", type: "button", onclick: () => { calc.showSteps = true; views.explore(); } }, "Show working")),
    h("button", { class: "btn block", type: "button", onclick: () => { newProblem(); views.explore(); document.getElementById("calc-answer")?.focus(); } }, "🎲 New problem"),
    h("p", { class: "small muted", style: "margin-top:10px" }, "Full app: Henderson–Hasselbalch, ΔG°′ ↔ K′eq, Nernst and Lineweaver–Burk generators."),
  );
};
const openSteps = new Set();
const renderPathways = () =>
  DATA.pathways.map((pw) => {
    let lastPhase = null;
    const items = [];
    for (const step of pw.steps) {
      if (step.phase !== lastPhase) {
        items.push(h("li", { class: "phase-head" }, step.phase === "preparatory" ? "Preparatory phase (×1 per glucose)" : "Payoff phase (×2 per glucose)"));
        lastPhase = step.phase;
      }
      const key = `${pw.id}-${step.n}`;
      const open = openSteps.has(key);
      items.push(h("li", { class: "metabolite" }, step.from));
      items.push(h("li", {},
        h("button", { class: "step-btn", type: "button", "aria-expanded": String(open), "data-step": key,
          onclick: () => { open ? openSteps.delete(key) : openSteps.add(key); views.explore(); main.querySelector(`[data-step="${key}"]`)?.focus(); } },
          h("span", { class: "arrow", "aria-hidden": "true" }, step.reversible ? "⇅" : "↓"),
          h("span", {}, h("span", { class: "small muted" }, `Step ${step.n} · `), h("span", { class: "enz" }, step.enzyme)),
          step.energy ? h("span", { class: `chip ${step.energy.startsWith("−") ? "bad" : "good"}` }, step.energy) : h("span", {})),
        open
          ? h("div", { class: "step-detail" },
              h("div", { class: "row", style: "margin-bottom:6px" },
                h("span", { class: `chip ${step.reversible ? "" : "warn"}` }, step.reversible ? "Near-equilibrium (reversible)" : "Irreversible · regulated"),
                h("span", { class: "chip" }, `${step.from} → ${step.to}`)),
              step.regulation ? h("p", {}, h("strong", {}, "Regulation: "), step.regulation) : null,
              h("p", { style: "margin:0" }, step.note))
          : null));
    }
    items.push(h("li", { class: "metabolite" }, pw.steps[pw.steps.length - 1].to));
    return h("div", {},
      h("section", { class: "card" },
        h("div", { class: "spread" }, h("h2", {}, `🍬 ${pw.name}`), h("span", { class: "chip warn" }, `Unit ${pw.unit} · Part ${pw.part} preview`)),
        h("p", {}, pw.summary),
        h("p", { class: "small muted", style: "margin:0" }, "Tap a step for its enzyme, regulation and key facts. ⇅ = reversible, ↓ = irreversible.")),
      h("section", { class: "card" }, h("ul", { class: "pathway" }, items)),
      h("section", { class: "card" }, h("h3", {}, "Net reaction"), h("p", { style: "margin:0" }, pw.net)),
      h("h2", {}, "What if…? 🤔"),
      pw.whatIf.map((w) => h("details", { class: "card" }, h("summary", {}, w.q), h("p", {}, w.a))));
  });

// ---------- Keyboard shortcuts ----------
document.addEventListener("keydown", (event) => {
  if (event.target instanceof HTMLInputElement || event.metaKey || event.ctrlKey || event.altKey) return;
  if (route.name === "practice" && drill && drill.index < drill.queue.length) {
    const q = drill.queue[drill.index];
    const n = Number(event.key);
    if (!drill.chosen && n >= 1 && n <= q.options.length) { event.preventDefault(); answerDrill(q.options[n - 1].id); }
    else if (drill.chosen && event.key === "Enter" && !(event.target instanceof HTMLButtonElement)) { event.preventDefault(); nextDrill(); }
  }
  if (route.name === "cards" && deck && deck.queue.length) {
    if (event.key === " " && !(event.target instanceof HTMLButtonElement)) { event.preventDefault(); deck.flipped = !deck.flipped; views.cards(); }
    else if (deck.flipped && ["1", "2", "3"].includes(event.key)) { event.preventDefault(); rateCard(["again", "good", "easy"][Number(event.key) - 1]); }
  }
});

show({ focus: false });
})();
