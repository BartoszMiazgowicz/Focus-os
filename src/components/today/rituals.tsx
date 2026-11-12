"use client";

import { useState } from "react";
import { saveBriefing, saveDebrief } from "@/lib/actions";
import { CATEGORIES } from "@/lib/categories";
import { EGOS, pickLine } from "@/lib/egos";
import { useEgo } from "@/lib/hooks";
import { blocksFor, blockStatus, focusMinutes, gamingMinutes, pinnedTasks } from "@/lib/logic";
import { getData, toast, useData } from "@/lib/store";
import { dateKey, fmtDur } from "@/lib/time";
import { EGO_ICON } from "../shell/ego";
import { Button, Field, Input, Modal, Textarea } from "../ui/kit";
import { PinPicker } from "./priorities";

export function Briefing({ date, open, onClose }: { date: string; open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Daily Briefing" description="Minuta, żeby wiedzieć, o co dziś grasz.">
      {open && <BriefingBody date={date} onClose={onClose} />}
    </Modal>
  );
}

function BriefingBody({ date, onClose }: { date: string; onClose: () => void }) {
  const saved = useData((d) => d.briefings[date]);
  const pinned = useData((d) => pinnedTasks(d, date).map((t) => t.title).join("\n"));
  const firstFocus = useData((d) => blocksFor(d, date).find((b) => CATEGORIES[b.category].focus && !blockStatus(d, date, b.id)));
  const { ego } = useEgo();
  const Icon = EGO_ICON[ego];
  const [avoid, setAvoid] = useState(saved?.avoid ?? "");
  const [firstStep, setFirstStep] = useState(saved?.firstStep ?? (firstFocus ? `${firstFocus.start} — ${firstFocus.title}: otwórz zeszyt i zrób pierwsze zadanie` : ""));
  const [picker, setPicker] = useState(false);
  const titles = pinned ? pinned.split("\n") : [];

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-[12px] font-medium text-muted">3 najważniejsze cele dnia</p>
        {titles.length ? (
          <ol className="space-y-1.5">
            {titles.map((t, i) => (
              <li key={t + i} className="flex gap-3 text-sm"><span className="tabular font-mono text-muted">{i + 1}</span>{t}</li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted">Nie wybrałeś jeszcze priorytetów.</p>
        )}
        <Button size="sm" className="mt-3" onClick={() => setPicker(true)}>{titles.length ? "Zmień priorytety" : "Wybierz priorytety"}</Button>
      </div>
      <Field label="Jedna rzecz, której dziś nie robię">
        <Input value={avoid} onChange={(e) => setAvoid(e.target.value)} placeholder="np. żadnych gier przed 19:00" maxLength={140} />
      </Field>
      <Field label="Pierwszy krok">
        <Input value={firstStep} onChange={(e) => setFirstStep(e.target.value)} placeholder="Najmniejsza czynność, od której zaczynasz" maxLength={160} />
      </Field>
      <div className="rounded-2xl border border-line p-4">
        <p className="flex items-center gap-2 text-[12px] font-medium text-accent"><Icon size={14} /> {EGOS[ego].name}</p>
        <p className="mt-2 text-sm leading-relaxed">{pickLine(EGOS[ego].lines, `brief${date}`)}</p>
      </div>
      <Button
        variant="primary"
        size="lg"
        className="w-full"
        onClick={() => {
          saveBriefing(date, { avoid: avoid.trim(), firstStep: firstStep.trim() });
          onClose();
        }}
      >
        Zaczynam dzień
      </Button>
      <PinPicker date={date} open={picker} onClose={() => setPicker(false)} />
    </div>
  );
}

const DEBRIEF_FIELDS = [
  ["done", "Co udało się zrobić", "Fakty, nie oceny"],
  ["failed", "Co nie wyszło", "Bez tłumaczenia się"],
  ["why", "Dlaczego", "Co konkretnie stanęło na drodze?"],
  ["improve", "Co poprawię jutro", "Jedna zmiana"],
  ["credit", "Za co mogę sobie przyznać uznanie", "Choćby drobiazg"],
] as const;

export function Debrief({ date, open, onClose }: { date: string; open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Evening Debrief" description="Dwie–trzy minuty. Krótko i szczerze.">
      {open && <DebriefBody date={date} onClose={onClose} />}
    </Modal>
  );
}

function DebriefBody({ date, onClose }: { date: string; onClose: () => void }) {
  const saved = useData((d) => d.debriefs[date]);
  const messages = useData((d) => d.settings.egoMessages);
  const { ego } = useEgo();
  const [form, setForm] = useState(() => {
    if (saved) return saved;
    const d = getData();
    const doneTasks = d.tasks.filter((t) => t.completedAt && dateKey(new Date(t.completedAt)) === date).map((t) => t.title);
    return { done: doneTasks.join(", "), failed: "", why: "", improve: "", credit: "" };
  });
  const stats = useData((d) => {
    const blocks = blocksFor(d, date);
    const done = blocks.filter((b) => blockStatus(d, date, b.id) === "done").length;
    return `${done}/${blocks.length} bloków · ${fmtDur(focusMinutes(d, [date]))} skupienia · ${fmtDur(gamingMinutes(d, date))} grania`;
  });

  return (
    <div className="space-y-4">
      <p className="tabular rounded-xl bg-surface-2/60 px-3 py-2.5 text-[13px] text-muted">{stats}</p>
      {DEBRIEF_FIELDS.map(([key, label, placeholder]) => (
        <Field key={key} label={label}>
          <Textarea rows={2} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} placeholder={placeholder} maxLength={400} />
        </Field>
      ))}
      <Button
        variant="primary"
        size="lg"
        className="w-full"
        onClick={() => {
          saveDebrief(date, form);
          toast(!messages ? "Dzień zamknięty." : form.failed.trim() ? EGOS[ego].reset : pickLine(EGOS[ego].done, date), "success");
          onClose();
        }}
      >
        Zamknij dzień
      </Button>
    </div>
  );
}
