import { z } from "zod";
import { CATEGORY_IDS, PRIORITIES } from "./categories";
import { EGO_IDS } from "./egos";

/** Single source of truth for persisted data. Types are inferred; import/restore validates against it. */

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format HH:MM");
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format RRRR-MM-DD");
const category = z.enum(CATEGORY_IDS);

export const blockSchema = z.object({
  id: z.string(),
  start: time,
  end: time,
  title: z.string().min(1).max(80),
  category,
});
export type Block = z.infer<typeof blockSchema>;

export const BLOCK_STATUSES = ["done", "partial", "skipped", "moved"] as const;
export type BlockStatus = (typeof BLOCK_STATUSES)[number];

const stepSchema = z.object({ id: z.string(), title: z.string(), done: z.boolean() });

export const taskSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(160),
  category,
  priority: z.enum(PRIORITIES),
  due: date.optional(),
  estimateMin: z.number().min(0).max(6000).optional(),
  status: z.enum(["todo", "doing", "done"]),
  progress: z.number().min(0).max(100),
  steps: z.array(stepSchema).default([]),
  pinnedDate: date.optional(),
  clientId: z.string().optional(),
  createdAt: z.number(),
  completedAt: z.number().optional(),
});
export type Task = z.infer<typeof taskSchema>;

export const goalSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(160),
  horizon: z.enum(["week", "month", "long"]),
  progress: z.number().min(0).max(100),
  milestones: z.array(stepSchema).default([]),
  history: z.array(z.object({ at: z.number(), progress: z.number(), note: z.string() })).default([]),
  createdAt: z.number(),
});
export type Goal = z.infer<typeof goalSchema>;

export const SUBJECT_IDS = ["math", "english", "inf04"] as const;
export type SubjectId = (typeof SUBJECT_IDS)[number];
export const TOPIC_STATUSES = ["new", "learning", "review", "mastered"] as const;

export const topicSchema = z.object({
  id: z.string(),
  subject: z.enum(SUBJECT_IDS),
  section: z.string(),
  title: z.string().min(1).max(160),
  mastery: z.number().min(0).max(100),
  status: z.enum(TOPIC_STATUSES),
  tasksDone: z.number().min(0),
  notes: z.string().default(""),
  mistakes: z.string().default(""),
  nextReview: date.optional(),
  reviewStage: z.number().min(0).default(0),
});
export type Topic = z.infer<typeof topicSchema>;

export const testSchema = z.object({
  id: z.string(),
  subject: z.enum(SUBJECT_IDS),
  date,
  title: z.string().min(1).max(120),
  scorePct: z.number().min(0).max(100),
});
export type TestResult = z.infer<typeof testSchema>;

export const focusSessionSchema = z.object({
  id: z.string(),
  date,
  startedAt: z.number(),
  minutes: z.number().min(0),
  category,
  goal: z.string().default(""),
  topicId: z.string().optional(),
  did: z.string().default(""),
  hard: z.string().default(""),
  next: z.string().default(""),
});
export type FocusSession = z.infer<typeof focusSessionSchema>;

export const activeTimerSchema = z.object({
  startedAt: z.number(),
  /** Timestamp when the focus phase ends; null while paused. */
  endsAt: z.number().nullable(),
  /** Remaining ms captured at pause. */
  pausedRemaining: z.number().nullable(),
  focusMin: z.number(),
  breakMin: z.number(),
  category,
  goal: z.string(),
  topicId: z.string().optional(),
  blockKey: z.string().optional(),
});
export type ActiveTimer = z.infer<typeof activeTimerSchema>;

export const gameSessionSchema = z.object({
  id: z.string(),
  date,
  startedAt: z.number(),
  minutes: z.number().min(0),
  /** Started inside the planned window on a planned day. */
  planned: z.boolean(),
});
export type GameSession = z.infer<typeof gameSessionSchema>;

export const STAGES = ["lead", "contact", "call", "offer", "negotiation", "won", "lost"] as const;
export type Stage = (typeof STAGES)[number];

export const clientSchema = z.object({
  id: z.string(),
  company: z.string().min(1, "Podaj nazwę firmy").max(120),
  contact: z.string().max(120).default(""),
  email: z.union([z.literal(""), z.email("Nieprawidłowy e-mail")]).default(""),
  phone: z.string().max(40).default(""),
  stage: z.enum(STAGES),
  value: z.number().min(0),
  probability: z.number().min(0).max(100),
  followUp: date.optional(),
  notes: z.string().default(""),
  createdAt: z.number(),
});
export type Client = z.infer<typeof clientSchema>;

export const projectSchema = z.object({
  id: z.string(),
  clientId: z.string().optional(),
  name: z.string().min(1, "Podaj nazwę projektu").max(120),
  deadline: date.optional(),
  status: z.enum(["planned", "active", "done"]),
  price: z.number().min(0),
  payment: z.enum(["unpaid", "partial", "paid"]),
});
export type Project = z.infer<typeof projectSchema>;

export const transactionSchema = z.object({
  id: z.string(),
  date,
  type: z.enum(["income", "cost"]),
  amount: z.number().positive("Kwota musi być większa od zera"),
  label: z.string().min(1, "Dodaj opis").max(120),
});
export type Transaction = z.infer<typeof transactionSchema>;

export const workoutSchema = z.object({
  id: z.string(),
  date,
  title: z.string().default(""),
  exercises: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      sets: z.array(z.object({ reps: z.number().min(0), weight: z.number().min(0) })),
    }),
  ),
  note: z.string().default(""),
});
export type Workout = z.infer<typeof workoutSchema>;

export const dayLogSchema = z.object({
  sleepHours: z.number().min(0).max(16).optional(),
  energy: z.number().min(1).max(5).optional(),
  mood: z.number().min(1).max(5).optional(),
});
export type DayLog = z.infer<typeof dayLogSchema>;

export const xpEventSchema = z.object({
  /** Unique key — the same achievement can never be paid twice. */
  key: z.string(),
  at: z.number(),
  date,
  amount: z.number(),
  label: z.string(),
});
export type XpEvent = z.infer<typeof xpEventSchema>;

export const notificationSchema = z.object({
  key: z.string(),
  at: z.number(),
  title: z.string(),
  body: z.string(),
  read: z.boolean(),
  href: z.string().optional(),
});
export type AppNotification = z.infer<typeof notificationSchema>;

export const settingsSchema = z.object({
  name: z.string().max(40).default(""),
  theme: z.enum(["dark", "light"]).default("dark"),
  activeEgo: z.enum(EGO_IDS).default("observer"),
  autoEgo: z.boolean().default(true),
  egoMessages: z.boolean().default(true),
  sleep: z.object({ bed: time, wake: time, sundayWake: time }).default({ bed: "23:00", wake: "07:00", sundayWake: "07:30" }),
  gaming: z
    .object({
      dailyLimitMin: z.number().min(0).max(600),
      weeklyLimitMin: z.number().min(0).max(4200),
      /** Day-of-week indexes (0 = Sunday) with planned gaming. */
      days: z.array(z.number().min(0).max(6)),
      start: time,
      end: time,
      warnMin: z.number().min(1).max(60),
    })
    .default({ dailyLimitMin: 120, weeklyLimitMin: 600, days: [2, 3, 4, 5, 6], start: "19:00", end: "21:00", warnMin: 15 }),
  notifications: z.object({ inApp: z.boolean(), system: z.boolean() }).default({ inApp: true, system: false }),
});
export type Settings = z.infer<typeof settingsSchema>;

export const dataSchema = z.object({
  settings: settingsSchema,
  /** Week template keyed by day-of-week index "0".."6". */
  template: z.record(z.string(), z.array(blockSchema)),
  /** Per-date plan overrides (after shifting a day). */
  dayPlans: z.record(z.string(), z.array(blockSchema)).default({}),
  /** Key: `${date}|${blockId}` */
  blockLogs: z.record(z.string(), z.object({ status: z.enum(BLOCK_STATUSES), at: z.number() })).default({}),
  tasks: z.array(taskSchema).default([]),
  goals: z.array(goalSchema).default([]),
  /** date → manually checked habit ids */
  habitLogs: z.record(z.string(), z.array(z.string())).default({}),
  topics: z.array(topicSchema).default([]),
  tests: z.array(testSchema).default([]),
  focusSessions: z.array(focusSessionSchema).default([]),
  activeTimer: activeTimerSchema.nullable().default(null),
  gameSessions: z.array(gameSessionSchema).default([]),
  activeGame: z.object({ startedAt: z.number(), plannedEnd: z.number(), planned: z.boolean() }).nullable().default(null),
  /** Dates on which the user consciously skipped gaming. */
  gameSkips: z.array(date).default([]),
  clients: z.array(clientSchema).default([]),
  projects: z.array(projectSchema).default([]),
  transactions: z.array(transactionSchema).default([]),
  workouts: z.array(workoutSchema).default([]),
  dayLogs: z.record(z.string(), dayLogSchema).default({}),
  briefings: z.record(z.string(), z.object({ avoid: z.string(), firstStep: z.string() })).default({}),
  debriefs: z
    .record(z.string(), z.object({ done: z.string(), failed: z.string(), why: z.string(), improve: z.string(), credit: z.string() }))
    .default({}),
  xp: z.array(xpEventSchema).default([]),
  notifications: z.array(notificationSchema).default([]),
});
export type Data = z.infer<typeof dataSchema>;
