"use client";

import { CATEGORIES, type CategoryId, type Priority } from "./categories";
import { defaultTemplate } from "./defaults";
import { blockKey, blockLen, gamingMinutes, isGamingDay, missionComplete, missions, nextReviewDate } from "./logic";
import type {
  ActiveTimer, AppNotification, Block, BlockStatus, Client, Data, DayLog, FocusSession, Goal, Project, Settings,
  Task, TestResult, Topic, Transaction, Workout,
} from "./schema";
import { getData, mutate } from "./store";
import { addDays, dateKey, uid, weekDays, weekStart } from "./time";

/* ---------- XP: paid once per real achievement, revoked when undone ---------- */

const grant = (d: Data, key: string, amount: number, label: string, date = dateKey()) => {
  if (amount <= 0 || d.xp.some((e) => e.key === key)) return;
  d.xp.push({ key, at: Date.now(), date, amount, label });
};
const revoke = (d: Data, key: string) => {
  d.xp = d.xp.filter((e) => e.key !== key);
};

const TASK_XP: Record<Priority, number> = { low: 5, medium: 10, high: 20, critical: 30 };
const FOCUS_XP_DAILY_CAP = 60;
const WORKOUT_XP_WEEKLY_CAP = 5;
const XP_BLOCKS: CategoryId[] = ["math", "english", "inf04", "code", "aiven", "career", "gym", "routine"];

/* ---------- Settings & template ---------- */

export const updateSettings = (fn: (s: Settings) => void) => mutate((d) => fn(d.settings));

export const saveTemplateBlock = (day: number, block: Block) =>
  mutate((d) => {
    const list = (d.template[String(day)] ??= []);
    const i = list.findIndex((b) => b.id === block.id);
    if (i >= 0) list[i] = block;
    else list.push(block);
    list.sort((a, b) => a.start.localeCompare(b.start));
  });

export const deleteTemplateBlock = (day: number, id: string) =>
  mutate((d) => {
    d.template[String(day)] = (d.template[String(day)] ?? []).filter((b) => b.id !== id);
  });

export const resetTemplate = () => mutate((d) => void (d.template = defaultTemplate()));

export const setDayPlan = (date: string, blocks: Block[] | null) =>
  mutate((d) => {
    if (blocks) d.dayPlans[date] = blocks;
    else delete d.dayPlans[date];
  });

/* ---------- Blocks ---------- */

export const setBlockStatus = (date: string, block: Block, status: BlockStatus | null) =>
  mutate((d) => {
    const key = blockKey(date, block.id);
    const xpKey = `block:${key}`;
    revoke(d, xpKey);
    if (!status) {
      delete d.blockLogs[key];
      return;
    }
    const before = d.blockLogs[key]?.status;
    d.blockLogs[key] = { status, at: Date.now() };
    if (XP_BLOCKS.includes(block.category) && (status === "done" || status === "partial"))
      grant(d, xpKey, status === "done" ? 4 : 2, `Blok: ${block.title}`, date);
    // A postponed block becomes a task for tomorrow instead of being stacked onto today.
    if (status === "moved" && before !== "moved" && CATEGORIES[block.category].task)
      d.tasks.push({
        id: uid(), title: `Przełożone: ${block.title}`, category: block.category, priority: "medium",
        due: addDays(date, 1), estimateMin: blockLen(block), status: "todo", progress: 0, steps: [], createdAt: Date.now(),
      });
  });

/* ---------- Tasks ---------- */

export type TaskInput = Pick<Task, "title" | "category" | "priority"> & Partial<Task>;

export const addTask = (input: TaskInput): string => {
  const id = uid();
  mutate((d) => {
    d.tasks.push({ status: "todo", progress: 0, steps: [], createdAt: Date.now(), ...input, id });
  });
  return id;
};

const syncTaskXp = (d: Data, t: Task) => {
  const key = `task:${t.id}`;
  if (t.status === "done") grant(d, key, TASK_XP[t.priority], `Zadanie: ${t.title}`);
  else revoke(d, key);
};

export const updateTask = (id: string, patch: Partial<Task>) =>
  mutate((d) => {
    const t = d.tasks.find((x) => x.id === id);
    if (!t) return;
    Object.assign(t, patch);
    if (t.steps.length && t.status !== "done")
      t.progress = Math.round((t.steps.filter((s) => s.done).length / t.steps.length) * 100);
    if (patch.status === "done") t.progress = 100;
    if (t.status === "done" && !t.completedAt) t.completedAt = Date.now();
    if (t.status !== "done") delete t.completedAt;
    syncTaskXp(d, t);
  });

export const toggleTask = (id: string) => {
  const t = getData().tasks.find((x) => x.id === id);
  if (!t) return;
  if (t.status !== "done") updateTask(id, { status: "done" });
  else updateTask(id, t.steps.length ? { status: "todo" } : { status: "todo", progress: 0 });
};

export const toggleStep = (taskId: string, stepId: string) =>
  mutate((d) => {
    const t = d.tasks.find((x) => x.id === taskId);
    const s = t?.steps.find((x) => x.id === stepId);
    if (!t || !s) return;
    s.done = !s.done;
    t.progress = Math.round((t.steps.filter((x) => x.done).length / t.steps.length) * 100);
    if (t.status === "todo" && t.progress > 0) t.status = "doing";
  });

export const deleteTask = (id: string) =>
  mutate((d) => {
    d.tasks = d.tasks.filter((t) => t.id !== id);
  });

/** Pins a task as one of today's three priorities. Returns false when the limit is reached. */
export const togglePin = (id: string, date: string): boolean => {
  const data = getData();
  const t = data.tasks.find((x) => x.id === id);
  if (!t) return false;
  if (t.pinnedDate !== date && data.tasks.filter((x) => x.pinnedDate === date).length >= 3) return false;
  mutate((d) => {
    const task = d.tasks.find((x) => x.id === id)!;
    if (task.pinnedDate === date) delete task.pinnedDate;
    else task.pinnedDate = date;
  });
  return true;
};

/* ---------- Goals & habits ---------- */

export const saveGoal = (goal: Omit<Goal, "id" | "createdAt" | "history"> & { id?: string }, note = "") =>
  mutate((d) => {
    const progress = goal.milestones.length
      ? Math.round((goal.milestones.filter((m) => m.done).length / goal.milestones.length) * 100)
      : goal.progress;
    const existing = d.goals.find((g) => g.id === goal.id);
    if (existing) {
      if (existing.progress !== progress) existing.history.push({ at: Date.now(), progress, note });
      Object.assign(existing, goal, { progress });
    } else {
      d.goals.push({ ...goal, progress, id: uid(), createdAt: Date.now(), history: [{ at: Date.now(), progress, note: "Cel utworzony" }] });
    }
  });

export const deleteGoal = (id: string) => mutate((d) => void (d.goals = d.goals.filter((g) => g.id !== id)));

export const toggleHabit = (date: string, id: string) =>
  mutate((d) => {
    const list = (d.habitLogs[date] ??= []);
    const i = list.indexOf(id);
    if (i >= 0) list.splice(i, 1);
    else list.push(id);
  });

/* ---------- Study ---------- */

export const saveTopic = (topic: Omit<Topic, "id"> & { id?: string }) =>
  mutate((d) => {
    const existing = d.topics.find((t) => t.id === topic.id);
    if (existing) {
      // First real contact with a topic schedules the first review for the next day.
      if (existing.status === "new" && topic.status !== "new" && !topic.nextReview) topic.nextReview = addDays(dateKey(), 1);
      Object.assign(existing, topic);
    } else d.topics.push({ ...topic, id: uid() });
  });

export const deleteTopic = (id: string) => mutate((d) => void (d.topics = d.topics.filter((t) => t.id !== id)));

export const completeReview = (id: string) =>
  mutate((d) => {
    const t = d.topics.find((x) => x.id === id);
    if (!t) return;
    grant(d, `review:${id}:${t.reviewStage}:${dateKey()}`, 5, `Powtórka: ${t.title}`);
    t.reviewStage += 1;
    t.nextReview = nextReviewDate(t.reviewStage, dateKey());
    if (t.status === "new") t.status = "learning";
  });

export const addTest = (test: Omit<TestResult, "id">) => mutate((d) => void d.tests.push({ ...test, id: uid() }));
export const deleteTest = (id: string) => mutate((d) => void (d.tests = d.tests.filter((t) => t.id !== id)));

/* ---------- Focus timer ---------- */

export type TimerInput = Pick<ActiveTimer, "focusMin" | "breakMin" | "category" | "goal" | "topicId" | "blockKey">;

export const startTimer = (input: TimerInput) =>
  mutate((d) => {
    const now = Date.now();
    d.activeTimer = { ...input, startedAt: now, endsAt: now + input.focusMin * 60000, pausedRemaining: null };
  });

export const pauseTimer = () =>
  mutate((d) => {
    const t = d.activeTimer;
    if (!t || t.endsAt === null) return;
    t.pausedRemaining = Math.max(0, t.endsAt - Date.now());
    t.endsAt = null;
  });

export const resumeTimer = () =>
  mutate((d) => {
    const t = d.activeTimer;
    if (!t || t.pausedRemaining === null) return;
    t.endsAt = Date.now() + t.pausedRemaining;
    t.pausedRemaining = null;
  });

export const cancelTimer = () => mutate((d) => void (d.activeTimer = null));

export const timerRemainingMs = (t: ActiveTimer, now = Date.now()): number =>
  t.endsAt === null ? (t.pausedRemaining ?? 0) : Math.max(0, t.endsAt - now);

/** Saves the session with the time actually spent in focus. Returns XP earned. */
export const finishTimer = (note: Pick<FocusSession, "did" | "hard" | "next">): number => {
  let earned = 0;
  mutate((d) => {
    const t = d.activeTimer;
    if (!t) return;
    const minutes = Math.round((t.focusMin * 60000 - timerRemainingMs(t)) / 60000);
    d.activeTimer = null;
    if (minutes < 1) return;
    const started = new Date(t.startedAt);
    const date = dateKey(started);
    const id = uid();
    d.focusSessions.push({ id, date, startedAt: t.startedAt, minutes, category: t.category, goal: t.goal, topicId: t.topicId, ...note });
    // Night sessions are logged but not rewarded — sleep comes first.
    const night = started.getHours() >= 23 || started.getHours() < 5;
    const today = d.xp.filter((e) => e.key.startsWith("focus:") && e.date === date).reduce((a, e) => a + e.amount, 0);
    earned = night || minutes < 10 ? 0 : Math.min(Math.floor(minutes / 5), FOCUS_XP_DAILY_CAP - today);
    grant(d, `focus:${id}`, earned, `Skupienie: ${CATEGORIES[t.category].label} (${minutes} min)`, date);
    earned = Math.max(0, earned);
    if (t.topicId) {
      const topic = d.topics.find((x) => x.id === t.topicId);
      if (topic && topic.status === "new") {
        topic.status = "learning";
        topic.nextReview ??= addDays(date, 1);
      }
    }
    if (t.blockKey && !d.blockLogs[t.blockKey]) d.blockLogs[t.blockKey] = { status: minutes >= t.focusMin * 0.8 ? "done" : "partial", at: Date.now() };
  });
  return earned;
};

export const deleteFocusSession = (id: string) =>
  mutate((d) => {
    d.focusSessions = d.focusSessions.filter((s) => s.id !== id);
    revoke(d, `focus:${id}`);
  });

/* ---------- Gaming ---------- */

export const startGame = (plannedEnd: number, planned: boolean) =>
  mutate((d) => {
    d.activeGame = { startedAt: Date.now(), plannedEnd, planned };
  });

const settleGamingDay = (d: Data, date: string) => {
  const limit = isGamingDay(d, date) ? d.settings.gaming.dailyLimitMin : 0;
  const key = `gaming:${date}`;
  if (limit > 0 && gamingMinutes(d, date) <= limit + 2) grant(d, key, 10, "Granie zakończone zgodnie z planem", date);
  else revoke(d, key);
};

/** Ends the running session and returns its length in minutes. */
export const endGame = (): number => {
  let minutes = 0;
  mutate((d) => {
    const g = d.activeGame;
    if (!g) return;
    minutes = Math.max(1, Math.round((Date.now() - g.startedAt) / 60000));
    const date = dateKey(new Date(g.startedAt));
    d.gameSessions.push({ id: uid(), date, startedAt: g.startedAt, minutes, planned: g.planned });
    d.activeGame = null;
    settleGamingDay(d, date);
  });
  return minutes;
};

export const addGameSession = (date: string, minutes: number) =>
  mutate((d) => {
    d.gameSessions.push({ id: uid(), date, startedAt: Date.now(), minutes, planned: false });
    settleGamingDay(d, date);
  });

export const deleteGameSession = (id: string) =>
  mutate((d) => {
    const s = d.gameSessions.find((x) => x.id === id);
    d.gameSessions = d.gameSessions.filter((x) => x.id !== id);
    if (s) settleGamingDay(d, s.date);
  });

export const skipGaming = (date: string) =>
  mutate((d) => {
    if (!d.gameSkips.includes(date)) d.gameSkips.push(date);
  });

/* ---------- Aiven ---------- */

const upsert = <T extends { id: string }>(list: T[], item: T) => {
  const i = list.findIndex((x) => x.id === item.id);
  if (i >= 0) list[i] = item;
  else list.push(item);
};

export const saveClient = (c: Client) => mutate((d) => upsert(d.clients, c));
export const deleteClient = (id: string) =>
  mutate((d) => {
    d.clients = d.clients.filter((c) => c.id !== id);
    for (const t of d.tasks) if (t.clientId === id) delete t.clientId;
    for (const p of d.projects) if (p.clientId === id) delete p.clientId;
  });
export const saveProject = (p: Project) => mutate((d) => upsert(d.projects, p));
export const deleteProject = (id: string) => mutate((d) => void (d.projects = d.projects.filter((p) => p.id !== id)));
export const addTransaction = (t: Omit<Transaction, "id">) => mutate((d) => void d.transactions.push({ ...t, id: uid() }));
export const deleteTransaction = (id: string) => mutate((d) => void (d.transactions = d.transactions.filter((t) => t.id !== id)));

/* ---------- Training & recovery ---------- */

export const saveWorkout = (w: Workout) =>
  mutate((d) => {
    upsert(d.workouts, w);
    // One rewarded workout per day and at most five per week — more is not better.
    const week = weekDays(w.date);
    const paid = d.xp.filter((e) => e.key.startsWith("workout:") && week.includes(e.date)).length;
    if (paid < WORKOUT_XP_WEEKLY_CAP) grant(d, `workout:${w.date}`, 25, "Trening zapisany", w.date);
  });

export const deleteWorkout = (id: string) =>
  mutate((d) => {
    const w = d.workouts.find((x) => x.id === id);
    d.workouts = d.workouts.filter((x) => x.id !== id);
    if (w && !d.workouts.some((x) => x.date === w.date)) revoke(d, `workout:${w.date}`);
  });

export const setDayLog = (date: string, patch: DayLog) =>
  mutate((d) => {
    d.dayLogs[date] = { ...d.dayLogs[date], ...patch };
  });

/* ---------- Briefing / debrief ---------- */

export const saveBriefing = (date: string, b: Data["briefings"][string]) => mutate((d) => void (d.briefings[date] = b));

export const saveDebrief = (date: string, b: Data["debriefs"][string]) =>
  mutate((d) => {
    d.debriefs[date] = b;
    grant(d, `debrief:${date}`, 5, "Wieczorne podsumowanie", date);
  });

/* ---------- Notifications ---------- */

/** Returns true when the notification is new (keys de-duplicate reminders). */
export const pushNotification = (n: Omit<AppNotification, "at" | "read">): boolean => {
  if (getData().notifications.some((x) => x.key === n.key)) return false;
  mutate((d) => {
    d.notifications = [{ ...n, at: Date.now(), read: false }, ...d.notifications].slice(0, 40);
  });
  return true;
};

export const markNotificationsRead = () => mutate((d) => d.notifications.forEach((n) => void (n.read = true)));
export const clearNotifications = () => mutate((d) => void (d.notifications = []));

/* ---------- Weekly missions ---------- */

/** Pays out missions that are genuinely complete (limit-type missions only after the week ends). */
export const settleMissions = () => {
  const today = dateKey();
  const data = getData();
  const due: { key: string; label: string }[] = [];
  for (const anchor of [today, addDays(today, -7)]) {
    const week = weekStart(anchor);
    const over = addDays(week, 6) < today;
    for (const m of missions(data, anchor)) {
      const key = `mission:${week}:${m.id}`;
      if (missionComplete(m, over) && !data.xp.some((e) => e.key === key)) due.push({ key, label: `Misja: ${m.label}` });
    }
  }
  if (due.length) mutate((d) => due.forEach((m) => grant(d, m.key, 30, m.label)));
};
