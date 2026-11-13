import { useEffect } from "react";
import { useApp, useViewFocus } from "../context.ts";
import { Mascot } from "../components/Mascot.tsx";
import { Heading, themeClass } from "../components/ui.tsx";
import { advanceDeck, type Deck } from "../lib/sessions.ts";
import { reviewFlashcard } from "../lib/progress.ts";
import { DAY_MS, dueCards, reviewCard, type Rating } from "../../../src/srs/leitner.ts";

const RATINGS: { rating: Rating; label: string; primary?: boolean }[] = [
  { rating: "again", label: "😅 Again" },
  { rating: "good", label: "🙂 Good", primary: true },
  { rating: "easy", label: "😎 Easy" },
];

const Decks = () => {
  const { catalog, progress, startDeck } = useApp();
  useViewFocus("cards/decks");
  const due = (ids: string[]) => dueCards(ids, progress.cards, Date.now()).length;
  const allDue = due(catalog.flashcards.map((c) => c.id));
  return (
    <>
      <Heading>Flashcards 🃏</Heading>
      <p className="muted">Cards you know come back after longer gaps (1 → 3 → 7 → 14 → 30 days). Cards you miss come straight back.</p>
      <section className="card spread">
        <div><h2 className="m0">🎲 All topics</h2><div className="small muted">{`${catalog.flashcards.length} cards · ${allDue} due`}</div></div>
        <button className={`btn${allDue ? " primary" : ""}`} type="button" disabled={!allDue} onClick={() => startDeck()}>{allDue ? "Study" : "Done ✓"}</button>
      </section>
      {catalog.topics.filter(catalog.isReady).map((t) => {
        const cards = catalog.cardsOf(t);
        const n = due(cards.map((c) => c.id));
        return (
          <section key={t.id} className={`card spread ${themeClass(t)}`}>
            <div className="row">
              <span className="unit-badge lg">{t.emoji}</span>
              <div><h2 className="m0">{t.title}</h2><div className="small muted">{`${cards.length} cards · ${n} due`}</div></div>
            </div>
            <button className={`btn${n ? " primary" : ""}`} type="button" disabled={!n} onClick={() => startDeck(t.id)}>{n ? "Study" : "Done ✓"}</button>
          </section>
        );
      })}
    </>
  );
};

const Study = ({ deck }: { deck: Deck }) => {
  const { catalog, progress, setDeck, updateProgress, leaveDeck } = useApp();
  const card = catalog.flashcards.find((c) => c.id === deck.queue[0])!;
  useViewFocus(`cards/${deck.reviewed}/${deck.flipped}`);
  const topic = catalog.topicOf(card.unit);
  const back = deck.from ? catalog.topicById(deck.from)?.title ?? "Decks" : "Decks";

  const flip = () => setDeck({ ...deck, flipped: !deck.flipped });
  const rate = (rating: Rating) => {
    updateProgress((p) => reviewFlashcard(p, card.id, rating, Date.now()));
    setDeck(advanceDeck(deck, rating === "again"));
  };
  const nextIn = (rating: Rating) => {
    const now = Date.now();
    const days = Math.round((reviewCard(progress.cards[card.id], rating, now).due - now) / DAY_MS);
    return days === 0 ? "now" : days === 1 ? "1 day" : `${days} days`;
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === " " && !(event.target instanceof HTMLButtonElement)) {
        event.preventDefault();
        flip();
      } else if (deck.flipped && ["1", "2", "3"].includes(event.key)) {
        event.preventDefault();
        rate(RATINGS[Number(event.key) - 1].rating);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  return (
    <div className={themeClass(topic)}>
      <div className="spread mb-xs">
        <button className="btn ghost" type="button" onClick={leaveDeck}>{`‹ ${back}`}</button>
        <span className="small muted bold">{`${deck.queue.length} to go`}</span>
      </div>
      <div className="q-meta">
        <span className="chip topic">{`${topic?.emoji ?? ""} Unit ${card.unit}`}</span>
        <span className="chip">{card.outcome}</span>
      </div>
      <button className={`card flashcard pop${deck.flipped ? " back" : ""}`} type="button" onClick={flip}
        aria-label={deck.flipped ? "Answer side. Activate to show the question." : "Question side. Activate to show the answer."}>
        <span className="side">{deck.flipped ? "Answer" : "Question"}</span>
        <span tabIndex={-1} data-focus>{deck.flipped ? card.back : card.front}</span>
      </button>
      {deck.flipped ? (
        <div className="rate">
          {RATINGS.map((r) => (
            <button key={r.rating} className={`btn${r.primary ? " primary" : ""}`} type="button" onClick={() => rate(r.rating)}>
              {r.label}<span>{nextIn(r.rating)}</span>
            </button>
          ))}
        </div>
      ) : (
        <button className="btn primary block" type="button" onClick={flip}>Show answer</button>
      )}
      <p className="small muted mt-sm center-text">Keys: Space flips · 1 Again · 2 Good · 3 Easy</p>
    </div>
  );
};

const Done = ({ deck }: { deck: Deck }) => {
  const { catalog, leaveDeck } = useApp();
  useViewFocus("cards/done");
  const back = deck.from ? catalog.topicById(deck.from)?.title ?? "decks" : "decks";
  return (
    <>
      <section className="card empty">
        <Mascot mood="cheer" size={96} />
        <Heading>All caught up! 🎉</Heading>
        <p className="muted">{`You reviewed ${deck.reviewed} card${deck.reviewed === 1 ? "" : "s"}. Beta will bring them back right on schedule.`}</p>
      </section>
      <button className="btn block" type="button" onClick={leaveDeck}>{`Back to ${back}`}</button>
    </>
  );
};

export const CardsView = () => {
  const { deck } = useApp();
  if (!deck) return <Decks />;
  if (!deck.queue.length) return <Done deck={deck} />;
  return <Study deck={deck} />;
};
