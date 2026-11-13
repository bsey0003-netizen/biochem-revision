/**
 * Registers the offline worker (production builds only). When a new version has downloaded and is waiting,
 * `onUpdate` receives a function that switches to it and reloads the page.
 */
export const registerServiceWorker = (onUpdate: (apply: () => void) => void): void => {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;

  const offer = (worker: ServiceWorker) =>
    onUpdate(() => {
      navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload(), { once: true });
      worker.postMessage({ type: "SKIP_WAITING" });
    });

  const register = () =>
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .then((registration) => {
        if (registration.waiting && navigator.serviceWorker.controller) offer(registration.waiting);
        registration.addEventListener("updatefound", () => {
          const incoming = registration.installing;
          incoming?.addEventListener("statechange", () => {
            if (incoming.state === "installed" && navigator.serviceWorker.controller) offer(incoming);
          });
        });
        // Check for new content on every start (browsers don't always do it themselves), then hourly
        // because students may keep the app open for days.
        const check = () => void registration.update().catch(() => undefined);
        check();
        setInterval(check, 60 * 60 * 1000);
      })
      .catch(() => undefined); // offline support is a bonus; the app still works without it

  // Wait for the page to finish loading so caching doesn't compete with the first render.
  if (document.readyState === "complete") register();
  else window.addEventListener("load", register, { once: true });
};
