"use client";

import { ChevronLeft, ChevronRight, Dumbbell, Gamepad2, Heart, Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { BlockRow } from "@/components/plan/block-row";
import { BlockSheet } from "@/components/plan/block-sheet";
import { Button, Card, Confirm, cx, Empty, Field, IconButton, Input, Modal, PageHeader, SectionTitle, Segmented, Select } from "@/components/ui/kit";
import { deleteTemplateBlock, resetTemplate, saveTemplateBlock, setDayPlan } from "@/lib/actions";
import { CATEGORIES, CATEGORY_IDS, type CategoryId } from "@/lib/categories";
import { WROCLAW_DAYS } from "@/lib/defaults";
import { useNow } from "@/lib/hooks";
import { blockLen, blocksFor, validateBlock } from "@/lib/logic";
import type { Block } from "@/lib/schema";
import { toast, useData } from "@/lib/store";
import { addDays, dateKey, DAY_NAMES, DAY_SHORT, dow, fmtDate, fmtDur, nowMin, parseKey, toMin, uid, weekDays } from "@/lib/time";

function BlockEditor({ day, block, others, onClose }: { day: number; block: Block; others: Block[]; onClose: () => void }) {
  const [b, setB] = useState(block);
  const [error, setError] = useState("");
  const isNew = !others.some((o) => o.id === block.id);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = { ...b, title: b.title.trim() };
    const problem = validateBlock(next, others);
    if (problem) return setError(problem);
    saveTemplateBlock(day, next);
    onClose();
  };
  return (
    <Modal open onClose={onClose} title={isNew ? "Nowy blok" : "Edytuj blok"} description={`Szablon: ${DAY_NAMES[day]}`}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Nazwa" error={error}>
          <Input autoFocus value={b.title} onChange={(e) => setB({ ...b, title: e.target.value })} maxLength={80} placeholder="np. Matematyka" />
        </Field>
        <Field label="Kategoria">
          <Select value={b.category} onChange={(e) => setB({ ...b, category: e.target.value as CategoryId })}>
            {CATEGORY_IDS.map((c) => <option key={c} value={c}>{CATEGORIES[c].label}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Początek"><Input type="time" value={b.start} onChange={(e) => setB({ ...b, start: e.target.value })} /></Field>
          <Field label="Koniec"><Input type="time" value={b.end} onChange={(e) => setB({ ...b, end: e.target.value })} /></Field>
        </div>
        <div className="flex gap-2">
          {!isNew && (
            <Button
              variant="danger"
              onClick={() => {
                deleteTemplateBlock(day, b.id);
                onClose();
              }}
            >
              Usuń
            </Button>
          )}
          <Button type="submit" variant="primary" className="flex-1">Zapisz</Button>
        </div>
      </form>
    </Modal>
  );
}

function WeekOverview({ days, selected, onSelect }: { days: string[]; selected: string; onSelect: (d: string) => void }) {
  const rows = useData((d) =>
    days.map((date) => {
      const blocks = blocksFor(d, date);
      const sum = (pred: (b: Block) => boolean) => blocks.filter(pred).reduce((a, b) => a + blockLen(b), 0);
      const gaming = blocks.find((b) => b.category === "gaming");
      return {
        date,
        work: sum((b) => CATEGORIES[b.category].focus),
        gym: blocks.some((b) => b.category === "gym"),
        together: sum((b) => b.category === "relationship"),
        gaming: gaming ? `${gaming.start}–${gaming.end}` : "",
      };
    }),
  );
  return (
    <Card>
      <SectionTitle>Tydzień w skrócie</SectionTitle>
      <ul className="-mx-2">
        {rows.map((r) => (
          <li key={r.date}>
            <button
              type="button"
              onClick={() => onSelect(r.date)}
              className={cx("flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-surface-2/70", r.date === selected && "bg-surface-2/70")}
            >
              <span className="w-8 text-[13px] font-medium">{DAY_SHORT[dow(r.date)]}</span>
              <span className="min-w-0 flex-1 text-[12px] text-muted">
                {WROCLAW_DAYS.includes(dow(r.date)) && <span className="text-fg">Wrocław · </span>}
                {r.work ? `${fmtDur(r.work)} pracy` : "bez obowiązków"}
                {r.together > 0 && ` · ${fmtDur(r.together)} razem`}
              </span>
              <span className="flex shrink-0 items-center gap-2.5 text-muted">
                {r.together > 0 && <Heart size={14} aria-label="Czas z dziewczyną" />}
                <Dumbbell size={14} className={r.gym ? "text-fg" : "opacity-20"} aria-label={r.gym ? "Siłownia" : "Bez siłowni"} />
                <Gamepad2 size={14} className={r.gaming ? "text-fg" : "opacity-20"} aria-label={r.gaming ? `Gry ${r.gaming}` : "Bez grania"} />
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] leading-relaxed text-muted/80">Plan jest szablonem, nie więzieniem. Każdy blok możesz oznaczyć, pominąć albo przełożyć.</p>
    </Card>
  );
}

export default function PlannerPage() {
  const now = useNow(30000);
  const today = dateKey(now);
  const [selected, setSelected] = useState(today);
  const [mode, setMode] = useState<"plan" | "template">("plan");
  const [sheet, setSheet] = useState<Block | null>(null);
  const [editing, setEditing] = useState<Block | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const days = weekDays(selected);
  const day = dow(selected);
  const blocks = useData((d) => blocksFor(d, selected));
  const template = useData((d) => [...(d.template[String(day)] ?? [])].sort((a, b) => a.start.localeCompare(b.start)));
  const overridden = useData((d) => Boolean(d.dayPlans[selected]));
  const m = nowMin(now);
  const stateOf = (b: Block) => (selected < today || (selected === today && toMin(b.end) <= m) ? "past" : selected === today && toMin(b.start) <= m ? "now" : "future");

  const newBlock = (): Block => {
    const last = template[template.length - 1];
    const start = last ? last.end : "08:00";
    const end = `${String(Math.min(23, Number(start.slice(0, 2)) + 1)).padStart(2, "0")}:${start.slice(3)}`;
    return { id: uid(), title: "", category: "math", start, end };
  };

  return (
    <div>
      <PageHeader
        title="Planner"
        subtitle={`${fmtDate(days[0], { day: "numeric", month: "short" })} – ${fmtDate(days[6], { day: "numeric", month: "short", year: "numeric" })}`}
        action={
          <div className="flex items-center gap-1">
            <IconButton label="Poprzedni tydzień" onClick={() => setSelected(addDays(selected, -7))} className="border border-line"><ChevronLeft size={16} /></IconButton>
            <Button size="sm" className="h-10" onClick={() => setSelected(today)} disabled={selected === today}>Dziś</Button>
            <IconButton label="Następny tydzień" onClick={() => setSelected(addDays(selected, 7))} className="border border-line"><ChevronRight size={16} /></IconButton>
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-7 gap-1.5" role="tablist" aria-label="Dzień tygodnia">
        {days.map((d) => (
          <button
            key={d}
            type="button"
            role="tab"
            aria-selected={d === selected}
            aria-label={`${DAY_NAMES[dow(d)]}, ${fmtDate(d)}`}
            onClick={() => setSelected(d)}
            className={cx(
              "flex h-16 flex-col items-center justify-center gap-0.5 rounded-2xl border transition-colors",
              d === selected ? "border-accent bg-accent/[0.07]" : "border-line bg-surface hover:border-muted/50",
            )}
          >
            <span className={cx("text-[11px] font-medium", d === today ? "text-accent" : "text-muted")}>{DAY_SHORT[dow(d)]}</span>
            <span className="tabular text-[15px] font-semibold">{parseKey(d).getDate()}</span>
            <span className={cx("size-1 rounded-full", WROCLAW_DAYS.includes(dow(d)) ? "bg-muted" : "bg-transparent")} />
          </button>
        ))}
      </div>

      <div className="mb-4">
        <Segmented label="Tryb widoku" value={mode} onChange={setMode} options={[{ value: "plan", label: "Plan dnia" }, { value: "template", label: "Edytuj szablon" }]} />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <SectionTitle
            action={
              mode === "template" ? (
                <Button size="sm" onClick={() => setEditing(newBlock())}><Plus size={14} /> Blok</Button>
              ) : (
                <span className="text-[12px] text-muted">{WROCLAW_DAYS.includes(day) ? "Wrocław" : fmtDate(selected)}</span>
              )
            }
          >
            {DAY_NAMES[day]}{mode === "template" && " — szablon"}
          </SectionTitle>

          {mode === "plan" ? (
            <>
              {overridden && (
                <div className="mb-3 flex items-center justify-between gap-3 rounded-xl bg-surface-2/70 px-3 py-2 text-[12px] text-muted">
                  Plan tego dnia został przesunięty.
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDayPlan(selected, null);
                      toast("Przywrócono szablon dnia.");
                    }}
                  >
                    Przywróć szablon
                  </Button>
                </div>
              )}
              {blocks.length === 0 ? (
                <Empty title="Pusty dzień" hint="Dodaj bloki w trybie „Edytuj szablon”." action={<Button onClick={() => setMode("template")}>Edytuj szablon</Button>} />
              ) : (
                <div className="-mx-2">
                  {blocks.map((b) => <BlockRow key={b.id} date={selected} block={b} state={stateOf(b)} onOpen={() => setSheet(b)} />)}
                </div>
              )}
            </>
          ) : (
            <>
              <p className="mb-3 text-[12px] leading-relaxed text-muted">Zmiany dotyczą każdego dnia „{DAY_NAMES[day]}” i zapisują się od razu.</p>
              {template.length === 0 ? (
                <Empty title="Brak bloków" hint="Dodaj pierwszy blok dla tego dnia tygodnia." action={<Button onClick={() => setEditing(newBlock())}><Plus size={14} /> Dodaj blok</Button>} />
              ) : (
                <ul className="-mx-2">
                  {template.map((b) => (
                    <li key={b.id}>
                      <button type="button" onClick={() => setEditing(b)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-surface-2/70">
                        <span className="tabular w-[86px] shrink-0 font-mono text-[12px] text-muted">{b.start}–{b.end}</span>
                        <span className="min-w-0 flex-1 truncate text-sm">{b.title}</span>
                        <span className="hidden text-[11px] text-muted sm:inline">{CATEGORIES[b.category].label}</span>
                        <Pencil size={14} className="shrink-0 text-muted" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <Button variant="ghost" size="sm" className="mt-4 w-full" onClick={() => setConfirmReset(true)}>Przywróć domyślny szablon całego tygodnia</Button>
            </>
          )}
        </Card>

        <div className="lg:col-span-2">
          <WeekOverview days={days} selected={selected} onSelect={setSelected} />
        </div>
      </div>

      {sheet && <BlockSheet date={selected} block={sheet} onClose={() => setSheet(null)} />}
      {editing && <BlockEditor day={day} block={editing} others={template} onClose={() => setEditing(null)} />}
      <Confirm
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={() => {
          resetTemplate();
          toast("Przywrócono domyślny plan tygodnia.");
        }}
        title="Przywrócić domyślny szablon?"
        body="Wszystkie Twoje zmiany w tygodniowym planie zostaną zastąpione planem startowym. Historia wykonania zostaje."
        confirmLabel="Przywróć"
      />
    </div>
  );
}
