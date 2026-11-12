import type { EgoId } from "./egos";

export const CATEGORY_IDS = [
  "math", "english", "inf04", "code", "aiven", "career", "gym", "relationship", "life",
  "routine", "recovery", "meal", "break", "free", "gaming",
] as const;
export type CategoryId = (typeof CATEGORY_IDS)[number];

export interface CategoryDef {
  label: string;
  /** Deep-work category: "Rozpocznij" opens a focus session and time counts in reports. */
  focus: boolean;
  /** Can be assigned to tasks. */
  task: boolean;
  /** Minimum minutes this block may shrink to when the plan is shifted; undefined = never shrinks. */
  flexMin?: number;
  ego?: EgoId;
}

export const CATEGORIES: Record<CategoryId, CategoryDef> = {
  math: { label: "Matura — matematyka", focus: true, task: true, ego: "observer" },
  english: { label: "Angielski", focus: true, task: true, ego: "observer" },
  inf04: { label: "INF.04", focus: true, task: true, ego: "builder" },
  code: { label: "AI / programowanie", focus: true, task: true, ego: "builder" },
  aiven: { label: "Aiven", focus: true, task: true, ego: "closer" },
  career: { label: "Kariera", focus: true, task: true, ego: "closer" },
  gym: { label: "Trening", focus: false, task: true },
  relationship: { label: "Relacje", focus: false, task: true },
  life: { label: "Życie", focus: false, task: true },
  routine: { label: "Rutyna", focus: false, task: false },
  recovery: { label: "Regeneracja", focus: false, task: false, flexMin: 20 },
  meal: { label: "Posiłek", focus: false, task: false, flexMin: 30 },
  break: { label: "Przerwa", focus: false, task: false, flexMin: 0 },
  free: { label: "Czas wolny", focus: false, task: false, flexMin: 0 },
  gaming: { label: "Gry", focus: false, task: false },
};

export const TASK_CATEGORIES = CATEGORY_IDS.filter((c) => CATEGORIES[c].task);
export const FOCUS_CATEGORIES = CATEGORY_IDS.filter((c) => CATEGORIES[c].focus);

export const PRIORITIES = ["low", "medium", "high", "critical"] as const;
export type Priority = (typeof PRIORITIES)[number];
export const PRIORITY_LABEL: Record<Priority, string> = {
  low: "Niski",
  medium: "Średni",
  high: "Wysoki",
  critical: "Krytyczny",
};
