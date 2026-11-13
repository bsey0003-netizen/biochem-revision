import { useApp, useViewFocus } from "../context.ts";
import { Mascot } from "../components/Mascot.tsx";
import { Bar, Heading, Ring, themeClass } from "../components/ui.tsx";
import { percent, statsFor, weakOutcomes } from "../lib/stats.ts";
import { dueCards } from "../../../src/srs/leitner.ts";

export const HomeView = () => {
  const { catalog, progress, go, startDrill, resetProgress, toast } = useApp();
  useViewFocus("home");
  const all = statsFor(catalog.questions, progress.q);
  const weak = weakOutcomes(catalog.questions, progress.q);
  const accuracy = percent(all.correct, all.seen);
  const due = dueCards(catalog.flashcards.map((c) => c.id), progress.cards, Date.now()).length;
  const message = all.answered === 0
    ? "Hi, I'm Beta! 👋 Pick a topic and let's get ready for your Part 1 test."
    : all.seen && accuracy >= 70
      ? `You're on fire — ${accuracy}% correct so far! 🔥`
      : `${all.answered} questions tried. Every mistake is a step forward! 🌱`;

  const reset = () => {
    if (!window.confirm("Reset all progress on this device?")) return;
    resetProgress();
    toast("Progress reset 🧹");
  };

  return (
    <>
      <section className="card greet">
        <Mascot mood={all.answered ? "cheer" : "happy"} size={76} />
        <div className="bubble">{message}</div>
      </section>
      <div className="stats">
        <div className="stat"><b>{`${all.answered}/${all.total}`}</b><span>tried</span></div>
        <div className="stat"><b>{all.seen ? `${accuracy}%` : "–"}</b><span>accuracy</span></div>
        <div className="stat"><b>{due}</b><span>cards due</span></div>
      </div>

      <div className="section-title">
        <Heading>Topics</Heading>
        <span className="small muted">{catalog.syllabus.title}</span>
      </div>
      <div className="topic-grid">
        {catalog.topics.map((t) => {
          const body = (
            <>
              <span className="topic-emoji" aria-hidden="true">{t.emoji}</span>
              <span className="t-title">{t.title}</span>
              <span className="t-units">{catalog.unitRange(t)}</span>
            </>
          );
          if (!catalog.isReady(t)) {
            return (
              <div key={t.id} className={`topic-tile locked ${themeClass(t)}`} role="group" aria-label={`${t.title}, ${catalog.unitRange(t)}, coming soon`}>
                {body}<span className="chip">🔒 Coming soon</span>
              </div>
            );
          }
          const st = statsFor(catalog.questionsOf(t), progress.q);
          const tried = percent(st.answered, st.total);
          return (
            <button key={t.id} type="button" className={`topic-tile ${themeClass(t)}`} onClick={() => go("topic", t.id)}
              aria-label={`${t.title}, ${catalog.unitRange(t)}, ${tried}% tried`}>
              {body}<Ring value={tried} /><span className="chip topic">{`${st.total} questions`}</span>
            </button>
          );
        })}
      </div>

      <div className="section-title"><h2>Focus next 🎯</h2></div>
      <section className="card">
        {weak.length ? (
          <ul className="list">
            {weak.map((o) => {
              const t = catalog.topicOf(o.unit);
              return (
                <li key={`${o.unit}|${o.outcome}`} className={`list-row ${themeClass(t)}`}>
                  <span className="unit-badge">{t?.emoji}</span>
                  <div>
                    <div className="bold">{o.outcome}</div>
                    <Bar value={percent(o.correct, o.seen)} />
                    <div className="small muted">{`Unit ${o.unit} · ${percent(o.correct, o.seen)}% correct`}</div>
                  </div>
                  <button className="btn soft sm" type="button" onClick={() => startDrill({ unit: o.unit, outcome: o.outcome })}>Practise</button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="muted small m0">Answer a few questions and your trickiest topics will show up here.</p>
        )}
      </section>

      {progress.mocks.length > 0 && (
        <>
          <div className="section-title"><h2>Mock exams ⏱️</h2></div>
          <section className="card">
            <ul className="list">
              {progress.mocks.slice(-5).reverse().map((m, i) => (
                <li key={`${m.date}-${i}`} className="list-row">
                  <span className={`chip ${m.mark >= 5 ? "good" : "bad"}`}>{`${m.mark}/10`}</span>
                  <span>{`${m.correct} of ${m.total} correct`}</span>
                  <span className="small muted">{m.date}</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      <div className="row center mt-xs">
        <button className="btn ghost sm" type="button" onClick={reset}>Reset progress</button>
      </div>
      <p className="small muted center-text">{`Progress is saved on this device only · content ${__BUILD_DATE__}`}</p>
    </>
  );
};
