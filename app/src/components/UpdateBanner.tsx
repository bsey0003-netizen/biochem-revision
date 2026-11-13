import { useEffect, useState } from "react";
import { registerServiceWorker } from "../lib/sw-register.ts";

/** Shown when new content has downloaded in the background. */
export const UpdateBanner = () => {
  const [apply, setApply] = useState<(() => void) | null>(null);
  useEffect(() => registerServiceWorker((fn) => setApply(() => fn)), []);
  if (!apply) return null;
  return (
    <div className="update-banner" role="status">
      <span>✨ New questions or fixes are ready.</span>
      <button className="btn primary sm" type="button" onClick={apply}>Update</button>
    </div>
  );
};
