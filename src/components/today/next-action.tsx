"use client";

import { ArrowRight, Check, Clock, MoreHorizontal, Play } from "lucide-react";
import Link from "next/link";
import { setBlockStatus } from "@/lib/actions";
import { CATEGORIES } from "@/lib/categories";
import { EGOS, pickLine } from "@/lib/egos";
import { useEgo } from "@/lib/hooks";
import { blocksFor } from "@/lib/logic";
import type { Block } from "@/lib/schema";
import { useData } from "@/lib/store";
import { fmtClock, fmtDur, toMin } from "@/lib/time";
import { useUi } from "@/lib/ui";
import { startBlock } from "../plan/block-sheet";
import { Button, IconButton } from "../ui/kit";

const HERO = "rounded-3xl border border-line bg-surface p-5 sm:p-7";
const EYEBROW = "text-[11px] font-medium uppercase tracking-[0.14em] text-accent";

/** The single thing to do right now. Everything else on Today is secondary to this card. */
export function NextAction({ date, now, onOpenBlock, onDebrief }: { date: string; now: Date; onOpenBlock: (b: Block) => void; onDebrief: () => void }) {
  const blocks = useData((d) => blocksFor(d, date));
  const logs = useData((d) => d.blockLogs);
  const timer = useData((d) => d.activeTimer);
  const game = useData((d) => d.activeGame);
  const messages = useData((d) => d.settings.egoMessages);
  const hasDebrief = useData((d) => Boolean(d.debriefs[date]));
  const { ego } = useEgo();

  const m = now.getHours() * 60 + now.getMinutes();
  const sec = m * 60 + now.getSeconds();
  const status = (b: Block) => logs[`${date}|${b.id}`]?.status;
  const current = blocks.find((b) => toMin(b.start) <= m && m < toMin(b.end));
  const upcoming = blocks.find((b) => toMin(b.start) > m);

  if (timer) {
    return (
      <div className={HERO}>
        <p className={EYEBROW}>Trwa sesja skupienia</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{timer.goal || CATEGORIES[timer.category].label}</h2>
        <Button variant="primary" size="lg" className="mt-6 w-full sm:w-auto" onClick={() => useUi.setState({ timerMinimized: false })}>
          Wróć do sesji <ArrowRight size={16} />
        </Button>
      </div>
    );
  }

  if (game) {
    return (
      <div className={HERO}>
        <p className={EYEBROW}>Trwa sesja gry</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          Koniec o {new Date(game.plannedEnd).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}
        </h2>
        <Link href="/gaming" className="mt-6 inline-flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-accent px-6 text-[15px] font-medium text-accent-fg sm:w-auto">
          Otwórz Gaming Control <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  if (current && !status(current)) {
    const cat = CATEGORIES[current.category];
    const left = toMin(current.end) * 60 - sec;
    const lateBy = m - toMin(current.start);
    const done = () => setBlockStatus(date, current, "done");
    return (
      <div className={HERO}>
        <div className="flex items-start justify-between gap-3">
          <p className={EYEBROW}>Teraz · {current.start}–{current.end}</p>
          <IconButton label="Więcej opcji bloku" className="-mr-2 -mt-2" onClick={() => onOpenBlock(current)}><MoreHorizontal size={18} /></IconButton>
        </div>
        <h2 className="mt-1 text-[28px] font-semibold leading-tight tracking-tight sm:text-4xl">{current.title}</h2>
        <p className="tabular mt-3 flex items-center gap-2 text-sm text-muted">
          <Clock size={14} /> Do końca bloku <span className="font-mono text-fg">{fmtClock(left)}</span>
        </p>
        {messages && cat.focus && <p className="mt-4 text-sm leading-relaxed text-muted">{pickLine(EGOS[ego].lines, date + current.id)}</p>}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          {cat.focus ? (
            <Button variant="primary" size="lg" className="sm:min-w-48" onClick={() => startBlock(date, current)}><Play size={16} /> Rozpocznij</Button>
          ) : current.category === "gaming" ? (
            <Link href="/gaming" className="inline-flex h-13 items-center justify-center gap-2 rounded-2xl bg-accent px-6 text-[15px] font-medium text-accent-fg sm:min-w-48">
              Rozpocznij <ArrowRight size={16} />
            </Link>
          ) : (
            <Button variant="primary" size="lg" className="sm:min-w-48" onClick={done}><Check size={16} /> Zrobione</Button>
          )}
          {cat.focus && lateBy >= 10 && (
            <Button size="lg" onClick={() => onOpenBlock(current)}>Blok trwa od {lateBy} min — opcje</Button>
          )}
          {current.category === "gym" && (
            <Link href="/training" className="inline-flex h-13 items-center justify-center rounded-2xl border border-line bg-surface-2 px-6 text-[15px] font-medium">Zapisz trening</Link>
          )}
        </div>
      </div>
    );
  }

  if (upcoming) {
    const wait = toMin(upcoming.start) * 60 - sec;
    return (
      <div className={HERO}>
        <p className={EYEBROW}>{current ? "Blok zamknięty · następne" : "Następne"} · {upcoming.start}</p>
        <h2 className="mt-1 text-[28px] font-semibold leading-tight tracking-tight sm:text-4xl">{upcoming.title}</h2>
        <p className="tabular mt-3 flex items-center gap-2 text-sm text-muted">
          <Clock size={14} /> Start za <span className="font-mono text-fg">{wait > 3600 ? fmtDur(wait / 60) : fmtClock(wait)}</span>
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          {CATEGORIES[upcoming.category].focus && (
            <Button variant="primary" size="lg" className="sm:min-w-48" onClick={() => startBlock(date, upcoming)}><Play size={16} /> Zacznij wcześniej</Button>
          )}
          <Button size="lg" onClick={() => onOpenBlock(upcoming)}>Szczegóły</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={HERO}>
      <p className={EYEBROW}>Plan na dziś zamknięty</p>
      <h2 className="mt-1 text-[28px] font-semibold leading-tight tracking-tight sm:text-4xl">{hasDebrief ? "Pora spać." : "Dwie minuty podsumowania i sen."}</h2>
      <p className="mt-3 text-sm text-muted">Jutro zaczynasz od porannej rutyny. Nic więcej dziś nie trzeba.</p>
      {!hasDebrief && <Button variant="primary" size="lg" className="mt-6 w-full sm:w-auto" onClick={onDebrief}>Evening Debrief</Button>}
    </div>
  );
}

export const dayProgress = (blocks: Block[], statusOf: (b: Block) => string | undefined) => {
  const counted = blocks.filter((b) => !["break", "free", "meal"].includes(b.category));
  const done = counted.reduce((a, b) => a + (statusOf(b) === "done" ? 1 : statusOf(b) === "partial" ? 0.5 : 0), 0);
  return { done, total: counted.length };
};
