import { useEffect } from "react";
import { useApp, useViewFocus } from "../context.ts";
import { Mascot } from "../components/Mascot.tsx";
import { DifficultyChip, Heading, LETTERS, ProgressLine, SourceChip, themeClass } from "../components/ui.tsx";
import { percent } from "../lib/stats.ts";
import { answerDrill, nextDrill, type Drill } from "../lib/sessions.ts";
import { recordAnswer } from "../lib/progress.ts";

const Picker = () => {
  const { catalog, startDrill } = useApp();
  useViewFocus("practice/picker");
  const ready = catalog.topics.filter(catalog.isReady);
  const later = catalog.topics.filter((t) => !catalog.isReady(t));
  return (
    <>
      <Heading>Practice ✏️</Heading>
      <p className="muted">Instant feedback with an explanation for every option. New and tricky questions come first.</p>
      <button className="btn primary block mb-md" type="button" onClick={() => startDrill()}>{`🎲 Mixed practice · ${catalog.questions.length} questions`}</button>
      {ready.map((t) => (
        <section key={t.id} className={`card stack ${themeClass(t)}`}>
          <div className="spread">
            <div className="row">
              <span className="unit-badge lg">{t.emoji}</span>
              <div><h2 className="m0">{t.title}</h2><div className="small muted">{catalog.unitRange(t)}</div></div>
            </div>
            <button className="btn soft sm" type="button" onClick={() => startDrill({ topicId: t.id })}>{`All (${catalog.questionsOf(t).length})`}</button>
          </div>
          {t.units.filter((u) => catalog.units.has(u.unit)).map(({ unit, title }) => {
            const content = catalog.units.get(unit)!;
            return (
              <div key={unit}>
                <div className="small bolder mb-xs">{`Unit ${unit} · ${title}`}</div>
                <div className="row">
                  <button className="chip topic" type="button" onClick={() => startDrill({ unit })}>Whole unit</button>
                  {content.outcomes.map((o) => {
                    const n = content.questions.filter((q) => q.outcome === o).length;
                    return n ? <button key={o} className="chip" type="button" onClick={() => startDrill({ unit, outcome: o })}>{`${o} · ${n}`}</button> : null;
                  })}
                </div>
              </div>
            );
          })}
        </section>
      ))}
      {later.length > 0 && (
        <section className="card">
          <h3>Coming soon 🔒</h3>
          <div className="row">{later.map((t) => <span key={t.id} className={`chip topic ${themeClass(t)}`}>{`${t.emoji} ${t.title}`}</span>)}</div>
        </section>
      )}
    </>
  );
};

const QuestionCard = ({ drill }: { drill: Drill }) => {
  const { catalog, setDrill, updateProgress, leaveDrill, toast } = useApp();
  const q = drill.queue[drill.index];
  useViewFocus(`practice/${drill.label}/${drill.index}/${drill.queue.length}`);
  const answered = drill.chosen !== null;
  const chosen = q.options.find((o) => o.id === drill.chosen);
  const correctIndex = q.options.findIndex((o) => o.correct);
  const topic = catalog.topicOf(q.unit);
  const back = drill.from ? catalog.topicById(drill.from)?.title ?? "Practice" : "Practice";

  const answer = (optionId: string) => {
    if (answered) return;
    const option = q.options.find((o) => o.id === optionId);
    if (!option) return;
    setDrill(answerDrill(drill, optionId));
    updateProgress((p) => recordAnswer(p, q.id, option.correct));
  };
  const next = () => setDrill(nextDrill(drill));

  useEffect(() => {
    if (answered) document.querySelector<HTMLElement>(".feedback")?.focus();
  }, [answered]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.metaKey || event.ctrlKey || event.altKey) return;
      const n = Number(event.key);
      if (!answered && n >= 1 && n <= q.options.length) {
        event.preventDefault();
        answer(q.options[n - 1].id);
      } else if (answered && event.key === "Enter" && !(event.target instanceof HTMLButtonElement)) {
        event.preventDefault();
        next();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  return (
    <div className={themeClass(catalog.topicById(drill.topicId) ?? topic)}>
      <div className="spread mb-xs">
        <button className="btn ghost" type="button" onClick={leaveDrill}>{`‹ ${back}`}</button>
        <div className="row tight">
          {drill.streak >= 2 && <span className="chip warn pop">{`🔥 ${drill.streak}`}</span>}
          <span className="small muted bold">{`${drill.index + 1} / ${drill.queue.length}`}</span>
        </div>
      </div>
      <ProgressLine value={((drill.index + (answered ? 1 : 0)) / drill.queue.length) * 100} />
      <article className={`card${answered && !chosen?.correct ? " wiggle" : ""}`}>
        <div className="q-meta">
          <span className="chip topic">{`${topic?.emoji ?? ""} Unit ${q.unit}`}</span>
          <span className="chip">{q.outcome}</span>
          <DifficultyChip level={q.difficulty} />
          <SourceChip source={q.source} />
        </div>
        <Heading level={2} className="q-stem">{q.stem}</Heading>
        <ul className="options" aria-label="Answer options">
          {q.options.map((o, i) => {
            const state = answered && o.correct ? " correct" : answered && o.id === drill.chosen ? " wrong" : "";
            const showWhy = answered && (drill.showAll || o.correct || o.id === drill.chosen);
            return (
              <li key={o.id}>
                <button className={`option${state}`} type="button" disabled={answered} onClick={() => answer(o.id)} aria-label={`${LETTERS[i]}: ${o.text}`}>
                  <span className="key">{answered && o.correct ? "✓" : answered && o.id === drill.chosen ? "✗" : LETTERS[i]}</span>
                  <span>{o.text}{showWhy && <div className="why">{o.why}</div>}</span>
                </button>
              </li>
            );
          })}
        </ul>
        {answered && (
          <div className={`feedback pop ${chosen?.correct ? "good" : "bad"}`} tabIndex={-1} role="status">
            <span className="fb-emoji" aria-hidden="true">{chosen?.correct ? "🎉" : "💡"}</span>
            <span>{chosen?.correct ? drill.cheer : `Almost! The answer is ${LETTERS[correctIndex]}. Read why above.`}</span>
          </div>
        )}
      </article>
      {answered ? (
        <div className="row">
          <button className="btn primary" type="button" onClick={next}>{drill.index + 1 < drill.queue.length ? "Next →" : "See results 🏁"}</button>
          {!drill.showAll && <button className="btn soft" type="button" onClick={() => setDrill({ ...drill, showAll: true })}>Explain all options</button>}
          <button className="btn ghost sm" type="button" onClick={() => toast(`Spotted a problem? Tell your lecturer the question ID: ${q.id}`)}>Report a problem</button>
        </div>
      ) : (
        <p className="small muted">Tip: press 1–4 to answer, Enter for the next question.</p>
      )}
    </div>
  );
};

const Summary = ({ drill }: { drill: Drill }) => {
  const { catalog, startDrill, leaveDrill } = useApp();
  useViewFocus(`practice/summary/${drill.label}`);
  const right = drill.results.filter((r) => r.correct).length;
  const pct = percent(right, drill.results.length);
  const missed = drill.results.filter((r) => !r.correct).map((r) => r.id);
  const back = drill.from ? catalog.topicById(drill.from)?.title ?? "practice" : "practice";
  return (
    <>
      <section className="card empty">
        <Mascot mood={pct >= 70 ? "cheer" : "happy"} size={96} />
        <Heading>{pct >= 70 ? "Amazing work! 🌟" : pct >= 40 ? "Good effort! 💪" : "Practice makes perfect 🌱"}</Heading>
        <div className="big-score">{`${right}/${drill.results.length}`}</div>
        <p className="muted">{`${pct}% correct · ${drill.label}`}</p>
        {missed.length ? (
          <button className="btn primary" type="button" onClick={() => startDrill({ ids: missed, from: drill.from })}>{`🔁 Retry the ${missed.length} you missed`}</button>
        ) : (
          <p className="bold">Clean sweep! Try a mock exam next. ⏱️</p>
        )}
      </section>
      <button className="btn block" type="button" onClick={leaveDrill}>{`Back to ${back}`}</button>
    </>
  );
};

export const PracticeView = () => {
  const { drill } = useApp();
  if (!drill) return <Picker />;
  if (drill.index >= drill.queue.length) return <Summary drill={drill} />;
  return <QuestionCard drill={drill} />;
};
