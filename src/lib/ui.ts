"use client";

import { create } from "zustand";
import type { TimerInput } from "./actions";

/** Ephemeral UI state shared across screens. */
interface UiState {
  /** Prefill for the "start focus session" dialog; null = closed. */
  starter: Partial<TimerInput> | null;
  timerMinimized: boolean;
  egoOpen: boolean;
  quickAdd: boolean;
}

export const useUi = create<UiState>(() => ({ starter: null, timerMinimized: false, egoOpen: false, quickAdd: false }));
export const openStarter = (prefill: Partial<TimerInput> = {}) => useUi.setState({ starter: prefill });
