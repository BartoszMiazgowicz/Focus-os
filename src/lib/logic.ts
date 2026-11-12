import { CATEGORIES, type CategoryId } from "./categories";
import type { EgoId } from "./egos";
import type { Block, BlockStatus, Data, DayLog, Task } from "./schema";
import { addDays, dateKey, dow, fromMin, toMin, weekDays } from "./time";

/** Pure selectors and domain rules. No React, no storage. */

export const blockKey = (date: string, id: string) => `${date}|${id}`;

export const blocksFor = (data: Data, date: string): Block[] =>
  [...(data.dayPlans[date] ?? data.template[String(dow(date))] ?? [])].sort((a, b) => toMin(a.start) - toMin(b.start));

export const blockStatus = (data: Data, date: string, id: string): BlockStatus | undefined =>
  data.blockLogs[blockKey(date, id)]?.status;

export const blockLen = (b: Block) => toMin(b.end) - toMin(b.start);

/** Validation shared by the template editor. Returns an error message or null. */
export const validateBlock = (block: Block, others: Block[]): string | null => {
  if (!block.title.trim()) return "Podaj nazwę bloku.";
  if (toMin(block.end) <= toMin(block.start)) return "Koniec musi być później niż początek.";
  const clash = others.find((o) => o.id !== block.id && toMin(o.start) < toMin(block.end) && toMin(block.start) < toMin(o.end));
  return clash ? `Nakłada się na „${clash.title}” (${clash.start}–${clash.end}).` : null;
};

export interface ShiftProposal {
  blocks: Block[];
  changes: string[];
  /** Minutes that could not be absorbed and were cut from the delayed block itself. */
  cut: number;
}

/**
 * Starts block `id` at `now` and pushes later blocks. The delay is absorbed by flexible blocks
 * (breaks, free time, meals, recovery) so that nothing overlaps. Gaming and the evening routine
 * never move later — if the delay cannot be absorbed, the delayed block is shortened instead.
 */
export const proposeShift = (blocks: Block[], id: string, now: number): ShiftProposal | null => {
  const idx = blocks.findIndex((b) => b.id === id);
  if (idx < 0) return null;
  const delay = now - toMin(blocks[idx].start);
  if (delay <= 0) return null;

  const tail = blocks.slice(idx);
  const anchorAt = tail.findIndex((b, i) => i > 0 && (b.category === "gaming" || b.category === "routine"));
  const movable = anchorAt < 0 ? tail : tail.slice(0, anchorAt);
  const slack = movable.slice(1).reduce((sum, b) => {
    const min = CATEGORIES[b.category].flexMin;
    return min === undefined ? sum : sum + Math.max(0, blockLen(b) - min);
  }, 0);

  const cut = Math.max(0, delay - slack);
  let toAbsorb = delay - cut;
  const changes: string[] = [];
  let cursor = now;
  const shifted = movable.map((b, i) => {
    let len = blockLen(b);
    if (i === 0 && cut > 0) {
      len = Math.max(5, len - cut);
      changes.push(`„${b.title}” skrócone o ${blockLen(b) - len} min — nie ma już czego przesunąć.`);
    } else if (i > 0 && toAbsorb > 0) {
      const min = CATEGORIES[b.category].flexMin;
      if (min !== undefined) {
        const take = Math.min(toAbsorb, Math.max(0, len - min));
        if (take > 0) {
          len -= take;
          toAbsorb -= take;
          changes.push(len === 0 ? `„${b.title}” wypada z planu.` : `„${b.title}” krótsze o ${take} min.`);
        }
      }
    }
    const next = { ...b, start: fromMin(cursor), end: fromMin(cursor + len) };
    cursor += len;
    return next;
  });

  const result = [...blocks.slice(0, idx), ...shifted.filter((b) => b.end !== b.start), ...(anchorAt < 0 ? [] : tail.slice(anchorAt))];
  if (!changes.length) changes.push("Kolejne bloki przesunięte bez skracania.");
  return { blocks: result, changes, cut };
};

/* ---------- Gaming ---------- */

export const gamingMinutes = (data: Data, date: string, now: number = Date.now()): number => {
  const logged = data.gameSessions.filter((s) => s.date === date).reduce((a, s) => a + s.minutes, 0);
  const live = data.activeGame && dateKey(new Date(data.activeGame.startedAt)) === date ? (now - data.activeGame.startedAt) / 60000 : 0;
  return logged + Math.max(0, live);
};

export const gamingWeekMinutes = (data: Data, date: string, now: number = Date.now()): number =>
  weekDays(date).reduce((a, d) => a + gamingMinutes(data, d, now), 0);

export const isGamingDay = (data: Data, date: string) => data.settings.gaming.days.includes(dow(date));

export const plannedGamingMinutes = (data: Data, date: string): number => {
  if (!isGamingDay(data, date)) return 0;
  const g = data.settings.gaming;
  return Math.min(g.dailyLimitMin, Math.max(0, toMin(g.end) - toMin(g.start)));
};

/* ---------- Focus / study ---------- */

export const focusMinutes = (data: Data, dates: string[], category?: CategoryId): number =>
  data.focusSessions
    .filter((s) => dates.includes(s.date) && (!category || s.category === category))
    .reduce((a, s) => a + s.minutes, 0);

export const REVIEW_INTERVALS = [1, 3, 7, 14, 30];
export const nextReviewDate = (stage: number, from: string): string =>
  addDays(from, REVIEW_INTERVALS[Math.min(stage, REVIEW_INTERVALS.length - 1)]);

/* ---------- Readiness ---------- */

export interface Readiness {
  score: number;
  label: "Wysoka" | "Średnia" | "Niska";
  hint: string;
}

/** A plain average of what the user typed in. Organisational hint only — not a health assessment. */
export const readiness = (log: DayLog | undefined): Readiness | null => {
  if (!log || log.sleepHours === undefined || log.energy === undefined) return null;
  const sleep = Math.min(1, log.sleepHours / 8);
  const energy = (log.energy - 1) / 4;
  const score = Math.round((sleep * 0.5 + energy * 0.5) * 100);
  if (score >= 70) return { score, label: "Wysoka", hint: "Dobry dzień na najtrudniejsze zadanie z rana." };
  if (score >= 45) return { score, label: "Średnia", hint: "Trzymaj plan, ale nie dokładaj nic ponad niego." };
  return { score, label: "Niska", hint: "Zrób mniej, ale zrób. Rozważ lżejszy trening albo dzień regeneracji." };
};

/* ---------- Alter ego ---------- */

export const suggestedEgo = (category: CategoryId | undefined): EgoId | undefined =>
  category ? CATEGORIES[category].ego : undefined;

/* ---------- Tasks ---------- */

const PRIORITY_RANK = { critical: 0, high: 1, medium: 2, low: 3 } as const;

export const sortTasks = (tasks: Task[]): Task[] =>
  [...tasks].sort(
    (a, b) =>
      Number(a.status === "done") - Number(b.status === "done") ||
      PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
      (a.due ?? "9999").localeCompare(b.due ?? "9999") ||
      a.createdAt - b.createdAt,
  );

export const pinnedTasks = (data: Data, date: string): Task[] => data.tasks.filter((t) => t.pinnedDate === date).slice(0, 3);

/* ---------- Habits ---------- */

export interface HabitDef {
  id: string;
  label: string;
  /** Derived from real activity when possible; otherwise checked by hand. */
  auto?: (data: Data, date: string) => boolean;
}

const hasFocus = (c: CategoryId) => (data: Data, date: string) => focusMinutes(data, [date], c) >= 15;

export const HABITS: HabitDef[] = [
  { id: "morning", label: "Poranna rutyna" },
  { id: "evening", label: "Rutyna wieczorna" },
  { id: "math", label: "Matematyka", auto: hasFocus("math") },
  { id: "english", label: "Angielski", auto: hasFocus("english") },
  { id: "code", label: "Programowanie", auto: hasFocus("code") },
  { id: "reading", label: "Czytanie" },
  { id: "training", label: "Trening", auto: (d, date) => d.workouts.some((w) => w.date === date) },
  {
    id: "gaming",
    label: "Granie w limicie",
    auto: (d, date) =>
      date < dateKey() && gamingMinutes(d, date) <= (isGamingDay(d, date) ? d.settings.gaming.dailyLimitMin : 0),
  },
  { id: "sleep", label: "Sen 7 h+", auto: (d, date) => (d.dayLogs[date]?.sleepHours ?? 0) >= 7 },
];

export const habitDone = (data: Data, date: string, habit: HabitDef): boolean =>
  (data.habitLogs[date] ?? []).includes(habit.id) || Boolean(habit.auto?.(data, date));

/* ---------- XP ---------- */

export const totalXp = (data: Data) => data.xp.reduce((a, e) => a + e.amount, 0);
export const levelOf = (xp: number) => Math.floor(Math.sqrt(xp / 100)) + 1;
export const levelFloor = (level: number) => (level - 1) ** 2 * 100;

/* ---------- Weekly report ---------- */

export interface WeekReport {
  days: string[];
  blocksPlanned: number;
  blocksDone: number;
  completion: number;
  minutes: { math: number; english: number; code: number; aiven: number; training: number; gaming: number };
  gamingPlanned: number;
  sleepAvg: number | null;
  tasksDone: Task[];
  wins: string[];
  improve: string[];
}

/** Blocks that count towards completion — the ones that require showing up. */
const COUNTED: CategoryId[] = ["math", "english", "inf04", "code", "aiven", "career", "gym", "routine"];

export const weekReport = (data: Data, anyDay: string, today: string = dateKey()): WeekReport => {
  const days = weekDays(anyDay);
  let planned = 0;
  let done = 0;
  for (const d of days) {
    if (d > today) continue;
    for (const b of blocksFor(data, d)) {
      if (!COUNTED.includes(b.category)) continue;
      planned++;
      const s = blockStatus(data, d, b.id);
      if (s === "done") done++;
      else if (s === "partial") done += 0.5;
    }
  }
  const sleeps = days.map((d) => data.dayLogs[d]?.sleepHours).filter((v): v is number => v !== undefined);
  const training = data.workouts.filter((w) => days.includes(w.date)).length;
  const gaming = days.reduce((a, d) => a + gamingMinutes(data, d), 0);
  const gamingPlanned = Math.min(
    data.settings.gaming.weeklyLimitMin,
    days.reduce((a, d) => a + plannedGamingMinutes(data, d), 0),
  );
  const minutes = {
    math: focusMinutes(data, days, "math"),
    english: focusMinutes(data, days, "english"),
    code: focusMinutes(data, days, "code") + focusMinutes(data, days, "inf04"),
    aiven: focusMinutes(data, days, "aiven"),
    training: training * 120,
    gaming,
  };
  const tasksDone = data.tasks.filter((t) => t.completedAt && days.includes(dateKey(new Date(t.completedAt))));
  const completion = planned ? Math.round((done / planned) * 100) : 0;
  const sleepAvg = sleeps.length ? sleeps.reduce((a, b) => a + b, 0) / sleeps.length : null;

  const wins: string[] = [];
  if (minutes.math >= 300) wins.push(`${Math.round(minutes.math / 60)} h matematyki w skupieniu.`);
  if (training >= 4) wins.push(`${training} treningi zapisane w tym tygodniu.`);
  if (gaming <= data.settings.gaming.weeklyLimitMin && gaming > 0) wins.push("Granie zmieściło się w tygodniowym limicie.");
  for (const t of tasksDone.filter((t) => t.priority === "critical" || t.priority === "high").slice(0, 3))
    wins.push(`Zamknięte: ${t.title}`);
  if (completion >= 75) wins.push(`${completion}% kluczowych bloków wykonane.`);

  const improve: string[] = [];
  if (gaming > data.settings.gaming.weeklyLimitMin)
    improve.push(`Granie: ${Math.round((gaming - data.settings.gaming.weeklyLimitMin) / 60 * 10) / 10} h ponad limit. Ustal jedną konkretną godzinę końca i trzymaj timer.`);
  if (sleepAvg !== null && sleepAvg < 7) improve.push("Średnio mniej niż 7 h snu. Zacznij rutynę wieczorną punktualnie o 22:00.");
  if (planned >= 5 && completion < 60) improve.push("Mniej niż 60% bloków. Wybierz jeden blok dziennie, którego nie odpuszczasz — zacznij od matematyki.");
  if (minutes.english < 60 && planned >= 5) improve.push("Angielski poniżej godziny. Krótka sesja 25 min dziennie wystarczy, żeby ruszyć.");
  if (minutes.aiven < 60 && planned >= 5) improve.push("Aiven dostał mało czasu. Zaplanuj jeden follow-up lub ofertę na jutro.");

  return { days, blocksPlanned: planned, blocksDone: done, completion, minutes, gamingPlanned, sleepAvg, tasksDone, wins: wins.slice(0, 4), improve: improve.slice(0, 3) };
};

/* ---------- Missions & badges (derived from real activity only) ---------- */

export interface Mission {
  id: string;
  label: string;
  current: number;
  target: number;
  unit: string;
  /** For limits: success means staying at or below target, judged when the week is over. */
  inverse?: boolean;
}

export const missions = (data: Data, anyDay: string): Mission[] => {
  const days = weekDays(anyDay);
  const r = weekReport(data, anyDay);
  return [
    { id: "math", label: "5 h matematyki w skupieniu", current: Math.round((r.minutes.math / 60) * 10) / 10, target: 5, unit: "h" },
    { id: "build", label: "4 h budowania (kod / AI / INF.04)", current: Math.round((r.minutes.code / 60) * 10) / 10, target: 4, unit: "h" },
    { id: "aiven", label: "3 dni z pracą nad Aiven", current: days.filter((d) => focusMinutes(data, [d], "aiven") >= 20).length, target: 3, unit: "dni" },
    { id: "train", label: "5 treningów — nie więcej", current: Math.min(5, data.workouts.filter((w) => days.includes(w.date)).length), target: 5, unit: "" },
    { id: "sleep", label: "5 nocy po 7 h+", current: days.filter((d) => (data.dayLogs[d]?.sleepHours ?? 0) >= 7).length, target: 5, unit: "nocy" },
    { id: "gaming", label: "Granie w limicie tygodnia", current: Math.round((r.minutes.gaming / 60) * 10) / 10, target: data.settings.gaming.weeklyLimitMin / 60, unit: "h", inverse: true },
  ];
};

export const missionComplete = (m: Mission, weekOver: boolean) => (m.inverse ? weekOver && m.current <= m.target : m.current >= m.target);

export interface Badge {
  id: string;
  label: string;
  desc: string;
  earned: boolean;
}

export const badges = (data: Data): Badge[] => {
  const focusTotal = (c?: CategoryId) => data.focusSessions.filter((s) => !c || s.category === c).reduce((a, s) => a + s.minutes, 0);
  const won = data.clients.filter((c) => c.stage === "won").length;
  const income = data.transactions.filter((t) => t.type === "income").reduce((a, t) => a + t.amount, 0);
  const doneTasks = data.tasks.filter((t) => t.status === "done").length;
  const mastered = data.topics.filter((t) => t.status === "mastered").length;
  const cleanGamingDays = new Set(data.xp.filter((e) => e.key.startsWith("gaming:")).map((e) => e.date)).size;
  return [
    { id: "first-session", label: "Pierwsza sesja", desc: "Ukończona sesja skupienia", earned: data.focusSessions.length > 0 },
    { id: "math-10", label: "10 h matematyki", desc: "Łącznie w sesjach skupienia", earned: focusTotal("math") >= 600 },
    { id: "math-50", label: "50 h matematyki", desc: "Łącznie w sesjach skupienia", earned: focusTotal("math") >= 3000 },
    { id: "focus-25", label: "25 h skupienia", desc: "Wszystkie kategorie", earned: focusTotal() >= 1500 },
    { id: "topics-5", label: "5 opanowanych tematów", desc: "Status „opanowane” w Study", earned: mastered >= 5 },
    { id: "mock", label: "Próbny arkusz", desc: "Zapisany wynik testu", earned: data.tests.length > 0 },
    { id: "tasks-25", label: "25 zamkniętych zadań", desc: "Wykonane, nie zaplanowane", earned: doneTasks >= 25 },
    { id: "workouts-20", label: "20 treningów", desc: "Zapisane w dzienniku", earned: data.workouts.length >= 20 },
    { id: "gaming-7", label: "7 dni w limicie", desc: "Sesje zakończone zgodnie z planem", earned: cleanGamingDays >= 7 },
    { id: "client", label: "Pierwszy klient", desc: "Lead na etapie „wygrany”", earned: won > 0 },
    { id: "revenue", label: "Pierwszy przychód", desc: "Zaksięgowany wpływ w Aiven", earned: income > 0 },
  ];
};
