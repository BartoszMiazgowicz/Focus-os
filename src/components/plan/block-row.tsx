"use client";

import { blockStatus } from "@/lib/logic";
import type { Block } from "@/lib/schema";
import { useData } from "@/lib/store";
import { cx } from "../ui/kit";
import { STATUS_LABEL } from "./block-sheet";

/** One line of a day's timeline. */
export function BlockRow({ date, block, state, onOpen }: { date: string; block: Block; state: "past" | "now" | "future"; onOpen: () => void }) {
  const status = useData((d) => blockStatus(d, date, block.id));
  const dim = status === "skipped" || status === "moved" || (state === "past" && !status);
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cx(
        "group flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-surface-2/70",
        state === "now" && "bg-surface-2/70",
      )}
    >
      <span className={cx("tabular w-[86px] shrink-0 font-mono text-[12px]", state === "now" ? "text-accent" : "text-muted")}>
        {block.start}–{block.end}
      </span>
      <span
        aria-hidden
        className={cx(
          "size-2 shrink-0 rounded-full border-[1.5px]",
          status === "done" ? "border-accent bg-accent" : status === "partial" ? "border-accent bg-accent/40" : state === "now" ? "border-accent" : "border-muted/40",
        )}
      />
      <span className={cx("min-w-0 flex-1 truncate text-sm", dim && "text-muted", status === "skipped" && "line-through", state === "now" && "font-medium")}>
        {block.title}
      </span>
      {status && <span className="shrink-0 text-[11px] text-muted">{STATUS_LABEL[status]}</span>}
      {state === "now" && !status && <span className="shrink-0 text-[11px] font-medium text-accent">teraz</span>}
    </button>
  );
}
