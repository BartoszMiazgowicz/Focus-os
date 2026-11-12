"use client";

import { create } from "zustand";
import { useStoreWithEqualityFn } from "zustand/traditional";
import { immer } from "zustand/middleware/immer";
import { defaultData } from "./defaults";
import type { Data } from "./schema";
import { clearAll, createBackup, listBackups, loadData, saveData, THEME_KEY } from "./storage";

interface StoreState {
  data: Data;
  hydrated: boolean;
  loadError?: string;
  saveFailed: boolean;
}

export const useStore = create<StoreState>()(
  immer(() => ({ data: defaultData(), hydrated: false, saveFailed: false }) as StoreState),
);

const isEqual = (a: unknown, b: unknown): boolean => {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => isEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
};

/**
 * Read a slice of persisted data. Selectors may derive new arrays/objects; the result is compared
 * structurally so components only re-render when the derived value actually changes.
 */
export const useData = <T,>(selector: (d: Data) => T): T => useStoreWithEqualityFn(useStore, (s) => selector(s.data), isEqual);

export const getData = (): Data => useStore.getState().data;

/** The only way data changes. Every mutation is persisted automatically (debounced). */
export const mutate = (fn: (d: Data) => void): void => {
  useStore.setState((s) => {
    fn(s.data);
  });
};

let saveTimer: ReturnType<typeof setTimeout> | undefined;
let started = false;

const flush = async () => {
  const { data } = useStore.getState();
  const ok = await saveData(data);
  if (useStore.getState().saveFailed === ok) useStore.setState({ saveFailed: !ok });
  try {
    window.localStorage.setItem(THEME_KEY, data.settings.theme);
  } catch {
    /* storage unavailable — already reported through saveFailed */
  }
};

export const hydrate = async (): Promise<void> => {
  if (started) return;
  started = true;
  const { data, error } = await loadData();
  useStore.setState({ data, hydrated: true, loadError: error });

  useStore.subscribe((state, prev) => {
    if (state.data === prev.data) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, 250);
  });
  // Never lose the last change when the tab is closed or the phone locks.
  const flushNow = () => {
    clearTimeout(saveTimer);
    void flush();
  };
  window.addEventListener("pagehide", flushNow);
  document.addEventListener("visibilitychange", () => document.visibilityState === "hidden" && flushNow());

  // One automatic local snapshot per day.
  const backups = await listBackups();
  if (!backups.length || Date.now() - backups[0].at > 24 * 3600 * 1000) void createBackup(data);
};

export const replaceAll = (data: Data): void => useStore.setState({ data, loadError: undefined });

export const resetAll = async (): Promise<void> => {
  await clearAll();
  useStore.setState({ data: defaultData(), loadError: undefined });
};

/* ---------- Toasts (ephemeral, not persisted) ---------- */

export interface Toast {
  id: number;
  text: string;
  tone: "default" | "success" | "error";
}

export const useToasts = create<{ toasts: Toast[] }>(() => ({ toasts: [] }));
let toastId = 0;

export const toast = (text: string, tone: Toast["tone"] = "default"): void => {
  const id = ++toastId;
  useToasts.setState((s) => ({ toasts: [...s.toasts.slice(-2), { id, text, tone }] }));
  setTimeout(() => useToasts.setState((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3800);
};
