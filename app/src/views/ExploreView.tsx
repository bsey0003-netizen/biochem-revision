import { useEffect, useState, type FormEvent } from "react";
import { useApp, useViewFocus } from "../context.ts";
import { Heading } from "../components/ui.tsx";
import { checkAnswer, generateMichaelisMenten, type MMProblem } from "../../../src/calc/michaelisMenten.ts";
import type { Pathway } from "../lib/pathway.ts";

type CalcState = { problem: MMProblem; input: string; result: "right" | "wrong" | "invalid" | null; showSteps: boolean; streak: number };
const newCalc = (streak = 0): CalcState => ({
  problem: generateMichaelisMenten(Math.floor(Math.random() * 1e9)),
  input: "",
  result: null,
  showSteps: false,
  streak,
});

const Calculator = () => {
  const [calc, setCalc] = useState(newCalc);
  const p = calc.problem;
  const answerText = `${Number(p.answer.toPrecision(4))} ${p.answerUnit}`;

  useEffect(() => {
    if (calc.result) document.querySelector<HTMLElement>(".feedback")?.focus();
  }, [calc.result]);

  const check = (event: FormEvent) => {
    event.preventDefault();
    const value = Number.parseFloat(calc.input.replace(",", "."));
    const ok = Number.isFinite(value) && checkAnswer(p, value);
    setCalc({ ...calc, result: Number.isFinite(value) ? (ok ? "right" : "wrong") : "invalid", streak: ok ? calc.streak + 1 : 0, showSteps: calc.showSteps || !ok });
  };

  return (
    <div className="t-sky">
      <section className="card stack">
        <div className="spread">
          <span className="chip topic">⚙️ Unit 12 · Michaelis–Menten</span>
          {calc.streak > 0 && <span className="chip warn pop">{`🔥 ${calc.streak}`}</span>}
        </div>
        <p className="bold">{p.prompt}</p>
        <form className="stack" onSubmit={check}>
          <label htmlFor="calc-answer" className="small muted">{`Your answer (${p.answerUnit}) · within 2% counts`}</label>
          <div className="row nowrap">
            <input id="calc-answer" className="input" inputMode="decimal" autoComplete="off" value={calc.input}
              onChange={(e) => setCalc({ ...calc, input: e.target.value })} />
            <button className="btn primary" type="submit">Check</button>
          </div>
        </form>
        {calc.result === "right" && <div className="feedback good pop" tabIndex={-1} role="status"><span className="fb-emoji" aria-hidden="true">🎉</span>{`Correct: ${answerText}`}</div>}
        {calc.result === "wrong" && <div className="feedback bad pop" tabIndex={-1} role="status"><span className="fb-emoji" aria-hidden="true">💡</span>{`Not quite — it's ${answerText}`}</div>}
        {calc.result === "invalid" && <div className="feedback bad" tabIndex={-1} role="status">Enter a number, e.g. 33.3</div>}
        {calc.showSteps ? (
          <div>
            <h3>Working</h3>
            <ol className="steps">{p.steps.map((s) => <li key={s}>{s}</li>)}</ol>
          </div>
        ) : (
          <button className="btn ghost" type="button" onClick={() => setCalc({ ...calc, showSteps: true })}>Show working</button>
        )}
      </section>
      <button className="btn block" type="button" onClick={() => { setCalc(newCalc(calc.streak)); document.getElementById("calc-answer")?.focus(); }}>🎲 New problem</button>
    </div>
  );
};

const PathwayCard = ({ pathway }: { pathway: Pathway }) => {
  const [open, setOpen] = useState<ReadonlySet<number>>(new Set());
  const toggle = (n: number) => {
    const next = new Set(open);
    if (next.has(n)) next.delete(n);
    else next.add(n);
    setOpen(next);
  };
  const items = pathway.steps.flatMap((step, i) => {
    const phaseChanged = i === 0 || pathway.steps[i - 1].phase !== step.phase;
    const isOpen = open.has(step.n);
    return [
      phaseChanged && (
        <li key={`phase-${step.n}`} className="phase-head">
          {step.phase === "preparatory" ? "Preparatory phase (×1 per glucose)" : "Payoff phase (×2 per glucose)"}
        </li>
      ),
      <li key={`from-${step.n}`} className="metabolite">{step.from}</li>,
      <li key={`step-${step.n}`}>
        <button className="step-btn" type="button" aria-expanded={isOpen} onClick={() => toggle(step.n)}>
          <span className="arrow" aria-hidden="true">{step.reversible ? "⇅" : "↓"}</span>
          <span><span className="small muted">{`Step ${step.n} · `}</span><span className="enz">{step.enzyme}</span></span>
          {step.energy ? <span className={`chip ${step.energy.startsWith("−") ? "bad" : "good"}`}>{step.energy}</span> : <span />}
        </button>
        {isOpen && (
          <div className="step-detail">
            <div className="row mb-xs">
              <span className={`chip${step.reversible ? "" : " warn"}`}>{step.reversible ? "Near-equilibrium (reversible)" : "Irreversible · regulated"}</span>
              <span className="chip">{`${step.from} → ${step.to}`}</span>
            </div>
            {step.regulation && <p><strong>Regulation: </strong>{step.regulation}</p>}
            <p className="m0">{step.note}</p>
          </div>
        )}
      </li>,
    ];
  });
  const last = pathway.steps[pathway.steps.length - 1];

  return (
    <div>
      <section className="card">
        <div className="spread"><h2>{`🍬 ${pathway.name}`}</h2><span className="chip warn">{`Unit ${pathway.unit} · Part ${pathway.part} preview`}</span></div>
        <p>{pathway.summary}</p>
        <p className="small muted m0">Tap a step for its enzyme, regulation and key facts. ⇅ = reversible, ↓ = irreversible.</p>
      </section>
      <section className="card">
        <ul className="pathway">{items}{last && <li className="metabolite">{last.to}</li>}</ul>
      </section>
      <section className="card"><h3>Net reaction</h3><p className="m0">{pathway.net}</p></section>
      <h2>What if…? 🤔</h2>
      {pathway.whatIf.map((w) => (
        <details key={w.q} className="card"><summary>{w.q}</summary><p>{w.a}</p></details>
      ))}
    </div>
  );
};

export const ExploreView = () => {
  const { pathways } = useApp();
  const [mode, setMode] = useState<"calc" | "pathways">("calc");
  useViewFocus("explore");
  return (
    <>
      <Heading>Explore 🔬</Heading>
      <div className="seg" role="group" aria-label="Explore mode">
        <button type="button" aria-pressed={mode === "calc"} onClick={() => setMode("calc")}>🧮 Calculations</button>
        <button type="button" aria-pressed={mode === "pathways"} onClick={() => setMode("pathways")}>🗺️ Pathways</button>
      </div>
      {mode === "calc" ? <Calculator /> : pathways.map((pw) => <PathwayCard key={pw.id} pathway={pw} />)}
    </>
  );
};
