import { createContext, useContext, useEffect } from "react";
import type { Catalog } from "./lib/catalog.ts";
import type { Pathway } from "./lib/pathway.ts";
import type { Progress } from "./lib/progress.ts";
import type { Route, ViewName } from "./lib/route.ts";
import type { Deck, Drill, Mock, MockFormat } from "./lib/sessions.ts";

export type DrillRequest = { topicId?: string | null; unit?: number | null; outcome?: string | null; ids?: string[] | null; from?: string | null };

export type AppState = {
  catalog: Catalog;
  pathways: Pathway[];
  route: Route;
  go: (name: ViewName, arg?: string | null) => void;
  progress: Progress;
  updateProgress: (change: (p: Progress) => Progress) => void;
  resetProgress: () => void;
  toast: (message: string) => void;
  now: number;
  drill: Drill | null;
  setDrill: (drill: Drill | null) => void;
  startDrill: (request?: DrillRequest) => void;
  leaveDrill: () => void;
  mock: Mock | null;
  setMock: (mock: Mock | null) => void;
  startMock: (format: MockFormat) => void;
  submitMock: (timeUp: boolean) => void;
  deck: Deck | null;
  setDeck: (deck: Deck | null) => void;
  startDeck: (topicId?: string | null, unit?: number | null, from?: string | null) => void;
  leaveDeck: () => void;
};

export const AppContext = createContext<AppState | null>(null);

export const useApp = (): AppState => {
  const app = useContext(AppContext);
  if (!app) throw new Error("useApp must be used inside <App>");
  return app;
};

let navigated = false;
/** After the first screen, every change of `key` moves focus to the view's heading and scrolls to the top. */
export const markNavigated = (): void => {
  navigated = true;
};
export const useViewFocus = (key: string): void => {
  useEffect(() => {
    if (!navigated) return;
    window.scrollTo(0, 0);
    document.querySelector<HTMLElement>("main [data-focus]")?.focus();
  }, [key]);
};
