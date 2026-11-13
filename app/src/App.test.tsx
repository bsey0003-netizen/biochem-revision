import { describe, expect, test, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "./App.tsx";
import { catalog, pathways } from "./data.ts";
import { STORE_KEY } from "./lib/progress.ts";

const memoryStore = () => {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), data };
};
const setup = (hash = "#home") => {
  window.location.hash = hash;
  const store = memoryStore();
  const user = userEvent.setup();
  render(<App catalog={catalog} pathways={pathways} store={store} />);
  return { user, store };
};
const saved = (store: ReturnType<typeof memoryStore>) => JSON.parse(store.data.get(STORE_KEY) ?? "{}");
const firstTopic = catalog.topics[0];

describe("home", () => {
  test("shows a tile for every Part 1 topic", () => {
    setup();
    expect(screen.getByRole("heading", { level: 1, name: "Topics" })).toBeInTheDocument();
    for (const t of catalog.topics) expect(screen.getByRole("button", { name: new RegExp(t.title) })).toBeInTheDocument();
  });

  test("falls back to home for a malformed link", () => {
    setup("#topic/%E0%A4%A");
    expect(screen.getByRole("heading", { level: 1, name: "Topics" })).toBeInTheDocument();
  });
});

describe("topic page", () => {
  test("shows each unit's summary and exam traps", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: new RegExp(firstTopic.title) }));
    expect(screen.getByRole("heading", { level: 1, name: firstTopic.title })).toBeInTheDocument();
    for (const u of firstTopic.units) expect(screen.getByRole("heading", { level: 2, name: u.title })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { name: "💡 Exam traps" })).toHaveLength(firstTopic.units.length);
  });

  test("back from practice returns to the topic summary", async () => {
    const { user } = setup(`#topic/${firstTopic.id}`);
    await user.click(screen.getByRole("button", { name: /^✏️ Practise \(/ }));
    await user.click(screen.getByRole("button", { name: `‹ ${firstTopic.title}` }));
    expect(screen.getByRole("heading", { level: 1, name: firstTopic.title })).toBeInTheDocument();
  });

  test("back from flashcards returns to the topic summary", async () => {
    const { user } = setup(`#topic/${firstTopic.id}`);
    await user.click(screen.getByRole("button", { name: /🃏 Cards/ }));
    await user.click(screen.getByRole("button", { name: `‹ ${firstTopic.title}` }));
    expect(screen.getByRole("heading", { level: 1, name: firstTopic.title })).toBeInTheDocument();
  });
});

describe("practice", () => {
  test("answering shows feedback with explanations and saves progress", async () => {
    const { user, store } = setup("#practice");
    await user.click(screen.getByRole("button", { name: /Mixed practice/ }));
    const options = within(screen.getByRole("list", { name: "Answer options" })).getAllByRole("button");
    expect(options.length).toBeGreaterThanOrEqual(4);
    await user.click(options[0]);
    expect(screen.getByRole("status")).toHaveTextContent(/answer is|!/);
    expect(Object.keys(saved(store).q)).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "Explain all options" }));
    expect(document.querySelectorAll(".why").length).toBe(options.length);
  });

  test("number keys answer and Enter moves on", async () => {
    const { user } = setup("#practice");
    await user.click(screen.getByRole("button", { name: /Mixed practice/ }));
    expect(screen.getByText(/^1 \/ /)).toBeInTheDocument();
    await user.keyboard("2");
    expect(screen.getByRole("status")).toBeInTheDocument();
    document.body.focus();
    await user.keyboard("{Enter}");
    expect(screen.getByText(/^2 \/ /)).toBeInTheDocument();
  });
});

describe("mock exam", () => {
  test("a quick mock can be answered, submitted and is recorded", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const { user, store } = setup("#mock");
    await user.click(screen.getAllByRole("button", { name: "Start" })[0]);
    expect(screen.getByText("Question 1 of 10")).toBeInTheDocument();
    expect(screen.getByLabelText("Time remaining")).toHaveTextContent("15:00");
    const options = within(screen.getByRole("list", { name: "Answer options" })).getAllByRole("button");
    await user.click(options[0]);
    expect(options[0]).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Submit exam" }));
    expect(screen.getByText(/\/10$/)).toBeInTheDocument();
    expect(saved(store).mocks).toHaveLength(1);
    expect(screen.getAllByRole("article")).toHaveLength(10);
  });
});

describe("flashcards", () => {
  test("flip and rate a card, then the schedule is saved", async () => {
    const { user, store } = setup("#cards");
    await user.click(screen.getAllByRole("button", { name: "Study" })[0]);
    const before = screen.getByText(/to go$/).textContent;
    await user.click(screen.getByRole("button", { name: "Show answer" }));
    await user.click(screen.getByRole("button", { name: /Good/ }));
    expect(screen.getByText(/to go$/).textContent).not.toBe(before);
    expect(Object.keys(saved(store).cards)).toHaveLength(1);
  });
});

describe("explore", () => {
  test("a wrong calculation shows the working; pathways list glycolysis", async () => {
    const { user } = setup("#explore");
    await user.type(screen.getByLabelText(/Your answer/), "-1");
    await user.click(screen.getByRole("button", { name: "Check" }));
    expect(screen.getByRole("heading", { name: "Working" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "🗺️ Pathways" }));
    expect(screen.getByRole("heading", { name: /Glycolysis/ })).toBeInTheDocument();
  });
});

describe("tab bar", () => {
  test("marks the current section", async () => {
    const { user } = setup();
    const nav = screen.getByRole("navigation", { name: "Sections" });
    await user.click(within(nav).getByRole("button", { name: /Mock/ }));
    expect(within(nav).getByRole("button", { name: /Mock/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("heading", { level: 1, name: /Mock exam/ })).toBeInTheDocument();
  });
});
