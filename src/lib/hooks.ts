"use client";

import { useEffect, useState } from "react";
import { CATEGORIES } from "./categories";
import type { EgoId } from "./egos";
import { blocksFor } from "./logic";
import { useData } from "./store";
import { dateKey, nowMin, toMin } from "./time";

/** Re-renders on an interval and whenever the tab becomes visible again. */
export const useNow = (intervalMs = 15000): Date => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const id = setInterval(tick, intervalMs);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [intervalMs]);
  return now;
};

/** The ego in effect right now: suggested by the current block when auto mode is on, otherwise the manual choice. */
export const useEgo = (): { ego: EgoId; suggested: boolean } => {
  const now = useNow(30000);
  const manual = useData((d) => d.settings.activeEgo);
  const auto = useData((d) => {
    if (!d.settings.autoEgo) return undefined;
    const m = nowMin(now);
    const current = blocksFor(d, dateKey(now)).find((b) => toMin(b.start) <= m && m < toMin(b.end));
    return current && CATEGORIES[current.category].ego;
  });
  return auto && auto !== manual ? { ego: auto, suggested: true } : { ego: manual, suggested: false };
};
