"use client";

import { ArrowRight, Gamepad2, Moon, Plus, Sunrise, Sunset } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { BlockRow } from "@/components/plan/block-row";
import { BlockSheet } from "@/components/plan/block-sheet";
import { EGO_ICON } from "@/components/shell/ego";
import { Habits } from "@/components/today/habits";
import { dayProgress, NextAction } from "@/components/today/next-action";
import { Priorities } from "@/components/today/priorities";
import { ReadinessCard } from "@/components/today/readiness";
import { Briefing, Debrief } from "@/components/today/rituals";
import { Bar, Button, Card, SectionTitle } from "@/components/ui/kit";
import { WROCLAW_DAYS } from "@/lib/defaults";
import { EGOS } from "@/lib/egos";
import { useEgo, useNow } from "@/lib/hooks";
import { blocksFor, focusMinutes, gamingMinutes, gamingWeekMinutes, isGamingDay, levelOf, totalXp, weekReport } from "@/lib/logic";
import type { Block } from "@/lib/schema";
import { useData } from "@/lib/store";
import { dateKey, DAY_NAMES, dow, fmtDate, fmtDur, greeting, toMin, weekDays } from "@/lib/time";
import { useUi } from "@/lib/ui";

export default function TodayPage() {
  const now = useNow(1000);
  const date = dateKey(now);
  const m = now.getHours() * 60 + now.getMinutes();
  const { ego } = useEgo();
  const EgoIcon = EGO_ICON[ego];

  const settings = useData((d) => d.settings);
  const blocks = useData((d) => blocksFor(d, date));
  const logs = useData((d) => d.blockLogs);
  const briefing = useData((d) => d.briefings[date]);
  const hasDebrief = useData((d) => Boolean(d.debriefs[date]));
  const gamingToday = useData((d) => gamingMinutes(d, date, now.getTime()));
  const gamingWeek = useData((d) => gamingWeekMinutes(d, date, now.getTime()));
  const gamingDay = useData((d) => isGamingDay(d, date));
  const week = useData((d) => {
    const r = weekReport(d, date);
    return { completion: r.completion, focus: focusMinutes(d, weekDays(date)), workouts: r.minutes.training / 120, level: levelOf(totalXp(d)) };
  });

  const [sheet, setSheet] = useState<Block | null>(null);
  const [briefOpen, setBriefOpen] = useState(false);
  const [debriefOpen, setDebriefOpen] = useState(false);

  const progress = dayProgress(blocks, (b) => logs[`${date}|${b.id}`]?.status);
  const bed = toMin(settings.sleep.bed);
  const toBed = m < toMin(settings.sleep.wake) - 60 ? 0 : bed - m;
  const dailyLimit = gamingDay ? settings.gaming.dailyLimitMin : 0;
  const morning = m < 12 * 60;
  const evening = m >= 20 * 60;

  return (
    <div className="space-y-4">
      <header className="mb-2">
        <p className="text-[13px] text-muted">
          {DAY_NAMES[dow(date)]}, {fmtDate(date)}
          {WROCLAW_DAYS.includes(dow(date)) && " · Wrocław"}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-[28px]">
          {greeting(now)}{settings.name ? `, ${settings.name}` : ""}.
        </h1>
        <button type="button" onClick={() => useUi.setState({ egoOpen: true })} className="mt-2 inline-flex items-center gap-2 text-[13px] text-muted hover:text-fg">
          <EgoIcon size={14} className="text-accent" /> Tryb: <span className="font-medium text-fg">{EGOS[ego].name}</span> · {EGOS[ego].tagline}
        </button>
      </header>

      {morning && !briefing && (
        <button type="button" onClick={() => setBriefOpen(true)} className="flex w-full items-center gap-3 rounded-2xl border border-accent/30 bg-accent/[0.06] px-4 py-3.5 text-left">
          <Sunrise size={18} className="shrink-0 text-accent" />
          <span className="flex-1 text-sm font-medium">Daily Briefing — minuta przed startem</span>
          <ArrowRight size={16} className="text-muted" />
        </button>
      )}
      {evening && !hasDebrief && (
        <button type="button" onClick={() => setDebriefOpen(true)} className="flex w-full items-center gap-3 rounded-2xl border border-accent/30 bg-accent/[0.06] px-4 py-3.5 text-left">
          <Sunset size={18} className="shrink-0 text-accent" />
          <span className="flex-1 text-sm font-medium">Evening Debrief — zamknij dzień w 2 minuty</span>
          <ArrowRight size={16} className="text-muted" />
        </button>
      )}

      <NextAction date={date} now={now} onOpenBlock={setSheet} onDebrief={() => setDebriefOpen(true)} />

      {briefing && (briefing.avoid || briefing.firstStep) && (
        <div className="grid gap-x-6 gap-y-1 rounded-2xl border border-line px-4 py-3 text-[13px] sm:grid-cols-2">
          {briefing.firstStep && <p><span className="text-muted">Pierwszy krok: </span>{briefing.firstStep}</p>}
          {briefing.avoid && <p><span className="text-muted">Dziś nie robię: </span>{briefing.avoid}</p>}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <Priorities date={date} />
          <Card>
            <SectionTitle action={<span className="tabular text-[12px] text-muted">{progress.done}/{progress.total} bloków</span>}>Plan dnia</SectionTitle>
            <div className="mb-3"><Bar value={progress.done} max={progress.total} label="Postęp planu dnia" /></div>
            <div className="-mx-2">
              {blocks.map((b) => (
                <BlockRow key={b.id} date={date} block={b} state={toMin(b.end) <= m ? "past" : toMin(b.start) <= m ? "now" : "future"} onOpen={() => setSheet(b)} />
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <ReadinessCard date={date} />
          <Card>
            <div className="flex items-center gap-3">
              <Moon size={18} className="shrink-0 text-muted" />
              <div className="flex-1">
                <p className="text-sm font-medium">{toBed > 0 ? `Do snu ${fmtDur(toBed)}` : "Pora spać"}</p>
                <p className="text-[12px] text-muted">Sen o {settings.sleep.bed} · rutyna wieczorna godzinę wcześniej</p>
              </div>
            </div>
          </Card>
          <Link href="/gaming" className="block">
            <Card className="transition-colors hover:border-muted/50">
              <div className="mb-3 flex items-center gap-3">
                <Gamepad2 size={18} className="shrink-0 text-muted" />
                <p className="flex-1 text-sm font-medium">Granie dziś</p>
                <span className="tabular text-[13px] text-muted">{fmtDur(gamingToday)} / {dailyLimit ? fmtDur(dailyLimit) : "bez planu"}</span>
              </div>
              <Bar value={gamingToday} max={dailyLimit || 1} over={gamingToday > dailyLimit} label="Wykorzystany dzienny limit grania" />
              <p className="tabular mt-2 text-[12px] text-muted">Tydzień: {fmtDur(gamingWeek)} z {fmtDur(settings.gaming.weeklyLimitMin)}</p>
            </Card>
          </Link>
          <Link href="/progress" className="block">
            <Card className="transition-colors hover:border-muted/50">
              <SectionTitle action={<span className="tabular text-[12px] text-muted">Poziom {week.level}</span>}>Ten tydzień</SectionTitle>
              <dl className="grid grid-cols-3 gap-2 text-center">
                {[
                  [`${week.completion}%`, "planu"],
                  [fmtDur(week.focus), "skupienia"],
                  [String(week.workouts), "treningi"],
                ].map(([v, l]) => (
                  <div key={l}>
                    <dt className="tabular text-lg font-semibold tracking-tight">{v}</dt>
                    <dd className="text-[11px] text-muted">{l}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          </Link>
          <Habits date={date} />
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => setBriefOpen(true)}><Sunrise size={15} /> Briefing</Button>
            <Button onClick={() => setDebriefOpen(true)}><Sunset size={15} /> Debrief</Button>
          </div>
        </div>
      </div>

      <button
        type="button"
        aria-label="Szybkie zadanie"
        onClick={() => useUi.setState({ quickAdd: true })}
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+5rem)] right-4 z-30 flex size-14 items-center justify-center rounded-full bg-accent text-accent-fg shadow-pop transition-transform active:scale-95 lg:bottom-8 lg:right-8"
      >
        <Plus size={22} />
      </button>

      {sheet && <BlockSheet date={date} block={sheet} onClose={() => setSheet(null)} />}
      <Briefing date={date} open={briefOpen} onClose={() => setBriefOpen(false)} />
      <Debrief date={date} open={debriefOpen} onClose={() => setDebriefOpen(false)} />
    </div>
  );
}
