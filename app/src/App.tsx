import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AppContext, markNavigated, type AppState, type DrillRequest } from "./context.ts";
import type { Catalog } from "./lib/catalog.ts";
import type { Pathway } from "./lib/pathway.ts";
import { emptyProgress, loadProgress, recordAnswer, recordMock, saveProgress, type KeyValueStore, type Progress } from "./lib/progress.ts";
import { parseHash, toHash, type Route, type ViewName } from "./lib/route.ts";
import { createDeck, createDrill, createMock, finishMock, type Deck, type Drill, type Mock, type MockFormat } from "./lib/sessions.ts";
import { HomeView } from "./views/HomeView.tsx";
import { TopicView } from "./views/TopicView.tsx";
import { PracticeView } from "./views/PracticeView.tsx";
import { MockView } from "./views/MockView.tsx";
import { CardsView } from "./views/CardsView.tsx";
import { ExploreView } from "./views/ExploreView.tsx";

type Props = { catalog: Catalog; pathways: Pathway[]; store: KeyValueStore; updateBanner?: ReactNode };

const TABS: { view: ViewName; icon: string; label: string }[] = [
  { view: "home", icon: "🏠", label: "Topics" },
  { view: "practice", icon: "✏️", label: "Practice" },
  { view: "mock", icon: "⏱️", label: "Mock" },
  { view: "cards", icon: "🃏", label: "Cards" },
  { view: "explore", icon: "🔬", label: "Explore" },
];

const VIEW_COMPONENTS: Record<ViewName, () => ReactNode> = {
  home: HomeView,
  topic: TopicView,
  practice: PracticeView,
  mock: MockView,
  cards: CardsView,
  explore: ExploreView,
};

export const App = ({ catalog, pathways, store, updateBanner }: Props) => {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  const [progress, setProgress] = useState<Progress>(() => loadProgress(store));
  const [drill, setDrill] = useState<Drill | null>(null);
  const [mock, setMock] = useState<Mock | null>(null);
  const [deck, setDeck] = useState<Deck | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => saveProgress(store, progress), [store, progress]);
  useEffect(() => markNavigated(), []);

  // Browser back/forward and edited links.
  useEffect(() => {
    const sync = () => setRoute(parseHash(window.location.hash));
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, []);

  const go = useCallback((name: ViewName, arg: string | null = null) => {
    const next = { name, arg };
    if (window.location.hash !== toHash(next)) window.history.pushState(null, "", toHash(next));
    setRoute(next);
  }, []);

  const toast = useCallback((message: string) => {
    setToastMessage(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMessage(null), 2600);
  }, []);

  const updateProgress = useCallback((change: (p: Progress) => Progress) => setProgress(change), []);

  const startDrill = useCallback(({ topicId = null, unit = null, outcome = null, ids = null, from = null }: DrillRequest = {}) => {
    const topic = topicId ? catalog.topicById(topicId) : unit ? catalog.topicOf(unit) : undefined;
    const pool = catalog.questions.filter((q) =>
      ids ? ids.includes(q.id)
        : (!topicId || (topic !== undefined && catalog.unitsOf(topic).includes(q.unit))) && (!unit || q.unit === unit) && (!outcome || q.outcome === outcome));
    const label = outcome ?? (unit ? `Unit ${unit} · ${catalog.unitTitle(unit)}` : topic ? topic.title : ids ? "Retry missed" : "Mixed practice");
    setDrill(createDrill(pool, progress.q, { topicId: topic?.id ?? null, label, from }));
    go("practice");
  }, [catalog, progress.q, go]);

  const leaveDrill = useCallback(() => {
    const from = drill?.from ?? null;
    setDrill(null);
    go(from ? "topic" : "practice", from);
  }, [drill, go]);

  const startMock = useCallback((format: MockFormat) => {
    const seen = new Set(Object.keys(progress.q));
    const start = Date.now();
    setNow(start);
    setMock(createMock(catalog.questions, format, seen, start));
    go("mock");
  }, [catalog, progress.q, go]);

  const submitMock = useCallback((timeUp: boolean) => {
    if (!mock || mock.result) return;
    const done = finishMock(mock, Date.now(), timeUp);
    const result = done.result!;
    setMock(done);
    setProgress((p) => {
      let next = p;
      for (const q of mock.questions) {
        const chosen = mock.answers[q.id];
        if (chosen) next = recordAnswer(next, q.id, q.options.find((o) => o.id === chosen)?.correct === true);
      }
      return recordMock(next, { date: new Date().toISOString().slice(0, 10), mark: result.mark, correct: result.correct, total: result.total });
    });
    if (timeUp) toast("Time's up — your exam was submitted ⏰");
  }, [mock, toast]);

  // Mock clock: ticks while an exam is running, wherever the student is in the app.
  useEffect(() => {
    if (!mock || mock.result) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [mock]);
  useEffect(() => {
    if (mock && !mock.result && now >= mock.endsAt) submitMock(true);
  }, [now, mock, submitMock]);

  const startDeck = useCallback((topicId: string | null = null, unit: number | null = null, from: string | null = null) => {
    const topic = catalog.topicById(topicId);
    const ids = catalog.cardsOf(topic).filter((c) => !unit || c.unit === unit).map((c) => c.id);
    setDeck(createDeck(ids, progress.cards, { topicId: topic?.id ?? null, from }, Date.now()));
    go("cards");
  }, [catalog, progress.cards, go]);

  const leaveDeck = useCallback(() => {
    const from = deck?.from ?? null;
    setDeck(null);
    go(from ? "topic" : "cards", from);
  }, [deck, go]);

  const resetProgress = useCallback(() => {
    setProgress(emptyProgress());
    setDrill(null);
    setMock(null);
    setDeck(null);
  }, []);

  const value: AppState = useMemo(() => ({
    catalog, pathways, route, go, progress, updateProgress, resetProgress, toast, now,
    drill, setDrill, startDrill, leaveDrill, mock, setMock, startMock, submitMock, deck, setDeck, startDeck, leaveDeck,
  }), [catalog, pathways, route, go, progress, updateProgress, resetProgress, toast, now,
    drill, startDrill, leaveDrill, mock, startMock, submitMock, deck, startDeck, leaveDeck]);

  const View = VIEW_COMPONENTS[route.name];
  const currentTab = route.name === "topic" ? "home" : route.name;

  return (
    <AppContext.Provider value={value}>
      <a className="skip" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById("main")?.focus(); }}>Skip to content</a>
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand"><span className="brand-mark" aria-hidden="true">β</span><span>Biochem Revision</span></div>
          <span className="part-pill">Part 1</span>
        </div>
      </header>
      {updateBanner}
      <main id="main" tabIndex={-1}><View /></main>
      <nav className="tabbar" aria-label="Sections">
        {TABS.map((t) => (
          <button key={t.view} type="button" aria-current={currentTab === t.view ? "page" : undefined} onClick={() => go(t.view)}>
            <span className="tab-ico" aria-hidden="true">{t.icon}</span><span>{t.label}</span>
          </button>
        ))}
      </nav>
      <div className={`toast${toastMessage ? " show" : ""}`} aria-live="polite">{toastMessage}</div>
    </AppContext.Provider>
  );
};
