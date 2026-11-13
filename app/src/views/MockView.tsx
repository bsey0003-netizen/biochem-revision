import { useApp, useViewFocus } from "../context.ts";
import { Mascot } from "../components/Mascot.tsx";
import { Bar, Heading, LETTERS, ProgressLine, themeClass } from "../components/ui.tsx";
import { percent } from "../lib/stats.ts";
import { formatClock, MOCK_FORMATS, type Mock, type MockFormat } from "../lib/sessions.ts";

const Intro = () => {
  const { startMock } = useApp();
  useViewFocus("mock/intro");
  return (
    <>
      <section className="card greet">
        <Mascot size={70} />
        <div className="bubble">Exam mode! No hints until you submit — you've got this. 💪</div>
      </section>
      <Heading>Mock exam ⏱️</Heading>
      <p className="muted">
        Questions are drawn at random and spread evenly across all Part 1 units, with questions you haven't tried yet first.
        Like the real partial, there's no feedback until you submit, and you can change answers before then.
      </p>
      {(Object.keys(MOCK_FORMATS) as MockFormat[]).map((key) => {
        const f = MOCK_FORMATS[key];
        const full = key === "full";
        return (
          <section key={key} className="card spread">
            <div>
              <h2 className="m0">{`${full ? "📝" : "⚡"} ${f.title}`}</h2>
              <div className="small muted">{`${f.size} questions · ${f.minutes} minutes${full ? " · same length as the real Part 1 partial" : ""}`}</div>
            </div>
            <button className={`btn ${full ? "primary" : "soft"}`} type="button" onClick={() => startMock(key)}>Start</button>
          </section>
        );
      })}
      <p className="small muted">Timings are for practice; check the official exam duration with your lecturer.</p>
    </>
  );
};

const Exam = ({ mock }: { mock: Mock }) => {
  const { setMock, submitMock, now } = useApp();
  useViewFocus(`mock/q/${mock.startedAt}/${mock.index}`);
  const q = mock.questions[mock.index];
  const answeredCount = Object.keys(mock.answers).length;
  const left = mock.endsAt - now;
  const move = (index: number) => setMock({ ...mock, index: Math.max(0, Math.min(mock.questions.length - 1, index)) });
  const confirmSubmit = () => {
    const unanswered = mock.questions.length - answeredCount;
    if (unanswered && !window.confirm(`${unanswered} question(s) unanswered. Submit anyway?`)) return;
    submitMock(false);
  };

  return (
    <>
      <div className="spread mb-sm">
        <span className="small muted bold">{`Question ${mock.index + 1} of ${mock.questions.length}`}</span>
        <span className={`timer${left < 60_000 ? " low" : ""}`} aria-label="Time remaining" role="timer">{`⏱️ ${formatClock(left)}`}</span>
      </div>
      <ProgressLine value={(answeredCount / mock.questions.length) * 100} />
      <article className="card">
        <div className="q-meta"><span className="chip accent">{`Unit ${q.unit}`}</span></div>
        <Heading level={2} className="q-stem">{q.stem}</Heading>
        <ul className="options" aria-label="Answer options">
          {q.options.map((o, i) => {
            const selected = mock.answers[q.id] === o.id;
            return (
              <li key={o.id}>
                <button className={`option${selected ? " selected" : ""}`} type="button" aria-pressed={selected}
                  onClick={() => setMock({ ...mock, answers: { ...mock.answers, [q.id]: o.id } })}>
                  <span className="key">{LETTERS[i]}</span><span>{o.text}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </article>
      <div className="spread mb-md">
        <button className="btn" type="button" disabled={mock.index === 0} onClick={() => move(mock.index - 1)}>← Back</button>
        {mock.index + 1 < mock.questions.length
          ? <button className="btn primary" type="button" onClick={() => move(mock.index + 1)}>Next →</button>
          : <button className="btn primary" type="button" onClick={confirmSubmit}>Submit</button>}
      </div>
      <section className="card">
        <div className="spread mb-sm"><h3 className="m0">Questions</h3><span className="small muted">{`${answeredCount} answered`}</span></div>
        <div className="qgrid">
          {mock.questions.map((mq, i) => (
            <button key={mq.id} type="button" className={mock.answers[mq.id] ? "answered" : ""} aria-current={i === mock.index ? "true" : undefined}
              aria-label={`Question ${i + 1}${mock.answers[mq.id] ? ", answered" : ""}`} onClick={() => move(i)}>{i + 1}</button>
          ))}
        </div>
        <button className="btn block mt-md" type="button" onClick={confirmSubmit}>Submit exam</button>
      </section>
    </>
  );
};

const Result = ({ mock }: { mock: Mock }) => {
  const { catalog, startMock, setMock } = useApp();
  useViewFocus(`mock/result/${mock.startedAt}`);
  const r = mock.result!;
  const passed = r.mark >= 5;
  return (
    <>
      <section className="card empty">
        <Mascot mood={passed ? "cheer" : "happy"} size={92} />
        <Heading>{passed ? "You passed this mock! 🎉" : "Keep going — you'll get there! 🌱"}</Heading>
        <div className="big-score">{`${r.mark}/10`}</div>
        <p className="muted">{`${r.correct} of ${r.total} correct · ${formatClock(r.usedMs)} used${r.timeUp ? " (time ran out)" : ""}`}</p>
        <div className="left">
          {Object.entries(r.byUnit).map(([unit, us]) => {
            const t = catalog.topicOf(Number(unit));
            return (
              <div key={unit} className={`${themeClass(t)} mt-sm`}>
                <div className="spread small bold"><span>{`${t?.emoji ?? ""} Unit ${unit} · ${catalog.unitTitle(Number(unit))}`}</span><span>{`${us.correct}/${us.total}`}</span></div>
                <Bar value={percent(us.correct, us.total)} />
              </div>
            );
          })}
        </div>
      </section>
      <div className="row mb-md">
        <button className="btn primary" type="button" onClick={() => startMock(mock.format)}>New mock exam</button>
        <button className="btn" type="button" onClick={() => setMock(null)}>Done</button>
      </div>
      <h2>Review 🔍</h2>
      {mock.questions.map((q, i) => {
        const chosen = q.options.find((o) => o.id === mock.answers[q.id]);
        const correct = q.options.find((o) => o.correct)!;
        return (
          <article key={q.id} className="card">
            <div className="q-meta">
              <span className="chip accent">{`Q${i + 1} · Unit ${q.unit}`}</span>
              {chosen ? <span className={`chip ${chosen.correct ? "good" : "bad"}`}>{chosen.correct ? "✓ Correct" : "✗ Incorrect"}</span> : <span className="chip bad">Not answered</span>}
            </div>
            <h3>{q.stem}</h3>
            {chosen && !chosen.correct && (
              <div className="feedback bad block">{`Your answer: ${chosen.text}`}<div className="why">{chosen.why}</div></div>
            )}
            <div className="feedback good block">{`Answer: ${correct.text}`}<div className="why">{correct.why}</div></div>
          </article>
        );
      })}
    </>
  );
};

export const MockView = () => {
  const { mock } = useApp();
  if (!mock) return <Intro />;
  if (mock.result) return <Result mock={mock} />;
  return <Exam mock={mock} />;
};
