/** Time helpers. Everything is local time; dates are "YYYY-MM-DD" keys, times are "HH:MM". */

export const toMin = (t: string): number => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

export const fromMin = (min: number): string => {
  const m = Math.max(0, Math.min(24 * 60 - 1, Math.round(min)));
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

export const dateKey = (d: Date = new Date()): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const parseKey = (key: string): Date => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
};

export const addDays = (key: string, n: number): string => {
  const d = parseKey(key);
  d.setDate(d.getDate() + n);
  return dateKey(d);
};

/** 0 = Sunday … 6 = Saturday */
export const dow = (key: string): number => parseKey(key).getDay();

export const weekStart = (key: string): string => addDays(key, -((dow(key) + 6) % 7));

export const weekDays = (key: string): string[] => {
  const s = weekStart(key);
  return Array.from({ length: 7 }, (_, i) => addDays(s, i));
};

export const nowMin = (d: Date = new Date()): number => d.getHours() * 60 + d.getMinutes();

export const DAY_NAMES = ["Niedziela", "Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota"];
export const DAY_SHORT = ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "Sb"];
/** Monday-first order of day-of-week indexes. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export const fmtDur = (min: number): string => {
  const m = Math.max(0, Math.round(min));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
};

export const fmtClock = (totalSec: number): string => {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};

export const fmtDate = (key: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long" }): string =>
  new Intl.DateTimeFormat("pl-PL", opts).format(parseKey(key));

export const fmtMoney = (n: number): string =>
  new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(n);

export const uid = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export const greeting = (d: Date = new Date()): string => {
  const h = d.getHours();
  if (h < 5) return "Późna pora";
  if (h < 12) return "Dzień dobry";
  if (h < 18) return "Dobrego popołudnia";
  return "Dobry wieczór";
};
