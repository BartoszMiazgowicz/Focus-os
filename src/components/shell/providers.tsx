"use client";

import { useEffect, type ReactNode } from "react";
import { useEgo } from "@/lib/hooks";
import { runReminders } from "@/lib/reminders";
import { hydrate, useData, useStore, useToasts } from "@/lib/store";
import { cx } from "../ui/kit";

function Toasts() {
  const toasts = useToasts((s) => s.toasts);
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[70] flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cx(
            "animate-rise pointer-events-auto max-w-sm rounded-2xl border bg-surface px-4 py-3 text-[13px] leading-snug shadow-pop",
            t.tone === "error" ? "border-danger/40 text-danger" : t.tone === "success" ? "border-accent/40" : "border-line",
          )}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  const hydrated = useStore((s) => s.hydrated);
  const theme = useData((d) => d.settings.theme);
  const { ego } = useEgo();

  useEffect(() => {
    void hydrate();
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production")
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.dataset.ego = ego;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#08080a" : "#f7f7f8");
  }, [hydrated, theme, ego]);

  useEffect(() => {
    if (!hydrated) return;
    runReminders();
    const id = setInterval(() => runReminders(), 20000);
    const onVisible = () => document.visibilityState === "visible" && runReminders();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [hydrated]);

  return (
    <>
      {hydrated ? (
        children
      ) : (
        <div className="flex min-h-dvh items-center justify-center" aria-busy="true" aria-label="Ładowanie">
          <span className="text-[11px] font-medium uppercase tracking-[0.3em] text-muted">Focus OS</span>
        </div>
      )}
      <Toasts />
    </>
  );
}
