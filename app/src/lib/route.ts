/** Hash routes: #home, #topic/<id>, #practice, #mock, #cards, #explore, #about. */
export const VIEWS = ["home", "topic", "practice", "mock", "cards", "explore", "about"] as const;
export type ViewName = (typeof VIEWS)[number];
export type Route = { name: ViewName; arg: string | null };

const HOME: Route = { name: "home", arg: null };
const isView = (name: string): name is ViewName => (VIEWS as readonly string[]).includes(name);

export const parseHash = (hash: string): Route => {
  const [name = "", arg] = hash.replace(/^#/, "").split("/");
  if (!isView(name)) return HOME;
  try {
    return { name, arg: arg ? decodeURIComponent(arg) : null };
  } catch {
    return HOME; // malformed link: show Home rather than a blank page
  }
};

export const toHash = ({ name, arg }: Route): string => `#${name}${arg ? `/${encodeURIComponent(arg)}` : ""}`;
