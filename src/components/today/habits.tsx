"use client";

import { toggleHabit } from "@/lib/actions";
import { habitDone, HABITS } from "@/lib/logic";
import { useData } from "@/lib/store";
import { addDays } from "@/lib/time";
import { Card, cx, SectionTitle } from "../ui/kit";

export function Habits({ date }: { date: string }) {
  const state = useData((d) =>
    HABITS.map((h) => `${Number(habitDone(d, date, h))}${Number(Boolean(h.auto?.(d, date)))}${[1, 2, 3].some((n) => habitDone(d, addDays(date, -n), h)) ? 1 : 0}`).join(","),
  ).split(",");
  const missed = HABITS.filter((_, i) => state[i][0] === "0" && state[i][2] === "0");
  return (
    <Card>
      <SectionTitle>Nawyki</SectionTitle>
      <div className="flex flex-wrap gap-2">
        {HABITS.map((h, i) => {
          const done = state[i][0] === "1";
          const auto = state[i][1] === "1";
          return (
            <button
              key={h.id}
              type="button"
              aria-pressed={done}
              disabled={auto}
              title={auto ? "Zaliczone automatycznie na podstawie Twojej aktywności" : undefined}
              onClick={() => toggleHabit(date, h.id)}
              className={cx(
                "h-9 rounded-full border px-3.5 text-[13px] font-medium transition-colors disabled:cursor-default",
                done ? "border-accent/40 bg-accent/10 text-fg" : "border-line text-muted hover:text-fg",
              )}
            >
              {done && <span className="mr-1.5 text-accent">✓</span>}
              {h.label}
            </button>
          );
        })}
      </div>
      {missed.length > 0 && missed.length < HABITS.length && (
        <p className="mt-3 text-[12px] leading-relaxed text-muted">
          Przerwa w: {missed.slice(0, 2).map((h) => h.label.toLowerCase()).join(", ")}. Zdarza się — wróć dziś najmniejszą możliwą wersją, np. 10 minut.
        </p>
      )}
    </Card>
  );
}
