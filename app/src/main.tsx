import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { UpdateBanner } from "./components/UpdateBanner.tsx";
import { catalog, pathways } from "./data.ts";
import type { KeyValueStore } from "./lib/progress.ts";
import "./styles.css";

/** Reading window.localStorage itself can throw when storage is blocked; fall back to memory for this visit. */
const deviceStore = (): KeyValueStore => {
  try {
    return window.localStorage;
  } catch {
    const memory = new Map<string, string>();
    return { getItem: (k) => memory.get(k) ?? null, setItem: (k, v) => void memory.set(k, v) };
  }
};

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App catalog={catalog} pathways={pathways} store={deviceStore()} updateBanner={<UpdateBanner />} />
    </StrictMode>,
  );
}
