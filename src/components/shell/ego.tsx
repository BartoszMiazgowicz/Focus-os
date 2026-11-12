"use client";

import { Eye, Target, Wrench, type LucideIcon } from "lucide-react";
import { updateSettings } from "@/lib/actions";
import { EGO_IDS, EGOS, type EgoId } from "@/lib/egos";
import { useEgo } from "@/lib/hooks";
import { useData } from "@/lib/store";
import { useUi } from "@/lib/ui";
import { cx, Modal, Switch } from "../ui/kit";

export const EGO_ICON: Record<EgoId, LucideIcon> = { closer: Target, builder: Wrench, observer: Eye };

export function EgoChip() {
  const { ego, suggested } = useEgo();
  const Icon = EGO_ICON[ego];
  return (
    <button
      type="button"
      onClick={() => useUi.setState({ egoOpen: true })}
      aria-label={`Aktywne alter ego: ${EGOS[ego].name}. Zmień`}
      className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-surface px-3 text-[13px] font-medium transition-colors hover:border-accent/50"
    >
      <Icon size={15} className="text-accent" />
      <span>{EGOS[ego].name}</span>
      {suggested && <span className="hidden text-[11px] font-normal text-muted sm:inline">auto</span>}
    </button>
  );
}

export function EgoSwitcher() {
  const open = useUi((s) => s.egoOpen);
  const settings = useData((d) => d.settings);
  const { ego: effective, suggested } = useEgo();
  return (
    <Modal
      open={open}
      onClose={() => useUi.setState({ egoOpen: false })}
      title="Alter ego"
      description="Trzy sposoby działania. Wybierz ten, którego wymaga następne zadanie."
    >
      <div className="space-y-2">
        {EGO_IDS.map((id) => {
          const e = EGOS[id];
          const Icon = EGO_ICON[id];
          const active = settings.activeEgo === id;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={active}
              onClick={() => updateSettings((s) => void (s.activeEgo = id))}
              className={cx(
                "flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-colors",
                active ? "border-accent bg-accent/[0.06]" : "border-line hover:border-muted/50",
              )}
            >
              <Icon size={18} className={cx("mt-0.5 shrink-0", active ? "text-accent" : "text-muted")} />
              <span className="min-w-0">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  {e.name}
                  {suggested && effective === id && <span className="text-[11px] font-normal text-accent">sugerowany teraz</span>}
                </span>
                <span className="mt-0.5 block text-[13px] text-muted">{e.tagline}</span>
                <span className="mt-1 block text-[12px] text-muted/80">{e.when}</span>
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-4 space-y-3 border-t border-line pt-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Sugeruj tryb automatycznie</p>
            <p className="text-[12px] text-muted">Na podstawie bieżącego bloku w planie.</p>
          </div>
          <Switch label="Sugeruj tryb automatycznie" checked={settings.autoEgo} onChange={(v) => updateSettings((s) => void (s.autoEgo = v))} />
        </div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Komunikaty alter ego</p>
            <p className="text-[12px] text-muted">Krótkie zdania na ekranie Today i po sesjach.</p>
          </div>
          <Switch label="Komunikaty alter ego" checked={settings.egoMessages} onChange={(v) => updateSettings((s) => void (s.egoMessages = v))} />
        </div>
      </div>
    </Modal>
  );
}
