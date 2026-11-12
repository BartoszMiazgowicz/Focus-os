"use client";

import { ArrowRight, Check as CheckIcon, CircleSlash, Clock, Play, RotateCcw, SkipForward } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { setBlockStatus, setDayPlan } from "@/lib/actions";
import { CATEGORIES } from "@/lib/categories";
import { EVENING_STEPS, MORNING_STEPS } from "@/lib/defaults";
import { blockKey, blockLen, blocksFor, blockStatus, proposeShift } from "@/lib/logic";
import { BLOCK_STATUSES, type Block, type BlockStatus } from "@/lib/schema";
import { getData, toast, useData } from "@/lib/store";
import { dateKey, fmtDur, nowMin, toMin } from "@/lib/time";
import { openStarter } from "@/lib/ui";
import { Button, cx, Modal } from "../ui/kit";

export const STATUS_LABEL: Record<BlockStatus, string> = { done: "Wykonane", partial: "Częściowo", skipped: "Pominięte", moved: "Przełożone" };
const STATUS_ICON = { done: CheckIcon, partial: Clock, skipped: CircleSlash, moved: SkipForward } as const;

export const startBlock = (date: string, block: Block) => {
  const m = nowMin();
  const live = date === dateKey() && toMin(block.start) <= m && m < toMin(block.end);
  const focusMin = Math.max(5, Math.min(blockLen(block), live ? toMin(block.end) - m : blockLen(block), 180));
  openStarter({ category: block.category, focusMin, breakMin: 0, blockKey: blockKey(date, block.id) });
};

/** Details and actions for a single block of a given day. */
export function BlockSheet({ date, block, onClose }: { date: string; block: Block | null; onClose: () => void }) {
  const status = useData((d) => (block ? blockStatus(d, date, block.id) : undefined));
  const [shiftOpen, setShiftOpen] = useState(false);
  if (!block) return null;

  const cat = CATEGORIES[block.category];
  const m = nowMin();
  const isToday = date === dateKey();
  const late = isToday && toMin(block.start) < m && m < toMin(block.end) && !status;
  const proposal = shiftOpen ? proposeShift(blocksFor(getData(), date), block.id, m) : null;
  const steps = block.category === "routine" ? (toMin(block.start) < 12 * 60 ? MORNING_STEPS : EVENING_STEPS) : null;

  const set = (s: BlockStatus | null) => {
    setBlockStatus(date, block, s);
    if (s === "moved" && cat.task) toast("Przełożone — dodałem zadanie na jutro.");
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={block.title} description={`${block.start}–${block.end} · ${fmtDur(blockLen(block))} · ${cat.label}`}>
      {shiftOpen && proposal ? (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed">
            Zaczynasz teraz zamiast o {block.start}. Proponuję przesunąć resztę dnia tak, żeby nic się nie nakładało, a granie i rutyna wieczorna zostały na swoim miejscu:
          </p>
          <ul className="space-y-1.5 rounded-xl bg-surface-2/60 p-3 text-[13px] text-muted">
            {proposal.changes.map((c) => <li key={c}>· {c}</li>)}
          </ul>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => setShiftOpen(false)}>Wróć</Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={() => {
                setDayPlan(date, proposal.blocks);
                toast("Plan dnia przesunięty.", "success");
                onClose();
              }}
            >
              Przesuń plan
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {steps && (
            <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-xl bg-surface-2/60 p-3 text-[13px] text-muted">
              {steps.map((s) => <li key={s}>· {s}</li>)}
            </ul>
          )}
          {cat.focus && status !== "done" && (
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={() => {
                startBlock(date, block);
                onClose();
              }}
            >
              <Play size={16} /> Rozpocznij sesję
            </Button>
          )}
          {block.category === "gaming" && (
            <Link href="/gaming" onClick={onClose} className="flex h-13 items-center justify-center gap-2 rounded-2xl bg-accent text-[15px] font-medium text-accent-fg">
              Otwórz Gaming Control <ArrowRight size={16} />
            </Link>
          )}
          {block.category === "gym" && (
            <Link href="/training" onClick={onClose} className="flex h-11 items-center justify-center gap-2 rounded-xl border border-line bg-surface-2 text-sm font-medium">
              Zapisz trening <ArrowRight size={15} />
            </Link>
          )}
          <div className="grid grid-cols-2 gap-2">
            {BLOCK_STATUSES.map((s) => {
              const Icon = STATUS_ICON[s];
              return (
                <button
                  key={s}
                  type="button"
                  aria-pressed={status === s}
                  onClick={() => set(s)}
                  className={cx(
                    "flex h-12 items-center gap-2.5 rounded-xl border px-3.5 text-sm font-medium transition-colors",
                    status === s ? "border-accent bg-accent/[0.07] text-fg" : "border-line text-muted hover:text-fg",
                  )}
                >
                  <Icon size={15} /> {s === "moved" ? "Przełóż na jutro" : STATUS_LABEL[s]}
                </button>
              );
            })}
          </div>
          {late && (
            <Button className="w-full" onClick={() => setShiftOpen(true)}>
              <Clock size={15} /> Zaczynam później — przesuń plan
            </Button>
          )}
          {status && (
            <Button variant="ghost" size="sm" className="w-full" onClick={() => set(null)}>
              <RotateCcw size={14} /> Wyczyść status
            </Button>
          )}
        </div>
      )}
    </Modal>
  );
}
