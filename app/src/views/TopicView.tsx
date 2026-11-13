import { useEffect } from "react";
import { useApp, useViewFocus } from "../context.ts";
import { Mascot } from "../components/Mascot.tsx";
import { Heading, themeClass } from "../components/ui.tsx";
import { percent, statsFor } from "../lib/stats.ts";
import { dueCards } from "../../../src/srs/leitner.ts";
import type { Topic, UnitFile } from "../../../src/content/types.ts";

const UnitSummary = ({ content, topic }: { content: UnitFile; topic: Topic }) => {
  const { startDrill, startDeck } = useApp();
  const s = content.summary;
  return (
    <section className="card">
      <div className="overview">{s.overview}</div>
      {s.sections.map((sec) => (
        <div key={sec.heading} className="points-gap">
          <h3>{sec.heading}</h3>
          <ul className="points">{sec.points.map((p) => <li key={p}>{p}</li>)}</ul>
        </div>
      ))}
      <h3 className="mt-lg">Key terms 🔑</h3>
      <div className="terms">
        {s.keyTerms.map((t) => (
          <details key={t.term} className="term"><summary>{t.term}</summary><p>{t.definition}</p></details>
        ))}
      </div>
      <div className="tips mt-md">
        <h3>💡 Exam traps</h3>
        <ul>{s.examTips.map((tip) => <li key={tip}>{tip}</li>)}</ul>
      </div>
      <div className="row mt-md">
        <button className="btn soft sm" type="button" onClick={() => startDrill({ unit: content.unit, from: topic.id })}>{`✏️ Practise Unit ${content.unit}`}</button>
        <button className="btn ghost sm" type="button" onClick={() => startDeck(topic.id, content.unit, topic.id)}>🃏 Its flashcards</button>
      </div>
    </section>
  );
};

export const TopicView = () => {
  const { catalog, progress, route, go, startDrill, startDeck } = useApp();
  const topic = catalog.topicById(route.arg);
  const ready = topic !== undefined && catalog.isReady(topic);
  useViewFocus(`topic/${route.arg}`);
  useEffect(() => {
    if (!ready) go("home");
  }, [ready, go]);
  if (!topic || !ready) return null;

  const questions = catalog.questionsOf(topic);
  const st = statsFor(questions, progress.q);
  const due = dueCards(catalog.cardsOf(topic).map((c) => c.id), progress.cards, Date.now()).length;

  return (
    <div className={themeClass(topic)}>
      <button className="btn ghost" type="button" onClick={() => go("home")}>‹ All topics</button>
      <section className="banner">
        <span className="topic-emoji" aria-hidden="true">{topic.emoji}</span>
        <div>
          <Heading>{topic.title}</Heading>
          <div className="small bold">{`${catalog.unitRange(topic)} · ${st.answered}/${st.total} questions tried`}</div>
        </div>
      </section>
      <div className="actions">
        <button className="btn primary" type="button" onClick={() => startDrill({ topicId: topic.id, from: topic.id })}>{`✏️ Practise (${questions.length})`}</button>
        <button className="btn soft" type="button" disabled={!due} onClick={() => startDeck(topic.id, null, topic.id)}>{due ? `🃏 Cards (${due} due)` : "🃏 All caught up"}</button>
      </div>
      {topic.units.map(({ unit, title }) => {
        const content = catalog.units.get(unit);
        const us = statsFor(catalog.questions.filter((q) => q.unit === unit), progress.q);
        return (
          <div key={unit}>
            <div className="unit-head">
              <span className="unit-badge">{unit}</span>
              <div className="grow">
                <h2 className="m0">{title}</h2>
                {content && <div className="small muted">{`${us.answered}/${us.total} tried${us.seen ? ` · ${percent(us.correct, us.seen)}% correct` : ""}`}</div>}
              </div>
            </div>
            {content ? <UnitSummary content={content} topic={topic} /> : (
              <section className="card locked-unit">
                <Mascot mood="sleepy" size={54} />
                <div><strong>Summary coming soon</strong><div className="small">Beta is still writing this one.</div></div>
              </section>
            )}
          </div>
        );
      })}
    </div>
  );
};
