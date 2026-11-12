"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { addTask, deleteTask, togglePin, updateTask } from "@/lib/actions";
import { CATEGORIES, PRIORITIES, PRIORITY_LABEL, TASK_CATEGORIES, type CategoryId, type Priority } from "@/lib/categories";
import type { Task } from "@/lib/schema";
import { toast, useData } from "@/lib/store";
import { dateKey, uid } from "@/lib/time";
import { useUi } from "@/lib/ui";
import { Button, Check, Field, IconButton, Input, Modal, Select } from "../ui/kit";

interface Draft {
  title: string;
  category: CategoryId;
  priority: Priority;
  due: string;
  estimate: string;
  clientId: string;
  steps: Task["steps"];
}

const toDraft = (t?: Partial<Task>): Draft => ({
  title: t?.title ?? "",
  category: t?.category ?? "math",
  priority: t?.priority ?? "medium",
  due: t?.due ?? "",
  estimate: t?.estimateMin ? String(t.estimateMin) : "",
  clientId: t?.clientId ?? "",
  steps: t?.steps ?? [],
});

/** Full task editor: used for both creating and editing. */
export function TaskForm({ task, preset, onDone }: { task?: Task; preset?: Partial<Task>; onDone: () => void }) {
  const [d, setD] = useState<Draft>(() => toDraft(task ?? preset));
  const [step, setStep] = useState("");
  const [error, setError] = useState("");
  const clients = useData((s) => s.clients);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));

  const addStep = () => {
    if (!step.trim()) return;
    set("steps", [...d.steps, { id: uid(), title: step.trim(), done: false }]);
    setStep("");
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const title = d.title.trim();
    if (!title) return setError("Wpisz, co konkretnie trzeba zrobić.");
    const estimate = d.estimate ? Number(d.estimate) : undefined;
    if (estimate !== undefined && (!Number.isFinite(estimate) || estimate < 0 || estimate > 6000)) return setError("Czas podaj w minutach (0–6000).");
    const fields = {
      title, category: d.category, priority: d.priority, steps: d.steps,
      due: d.due || undefined, estimateMin: estimate, clientId: d.clientId || undefined,
    };
    if (task) updateTask(task.id, fields);
    else addTask({ ...preset, ...fields });
    onDone();
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field label="Zadanie" error={error}>
        <Input autoFocus value={d.title} onChange={(e) => set("title", e.target.value)} placeholder="np. Arkusz maturalny 2023 — zadania 1–8" maxLength={160} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Kategoria">
          <Select value={d.category} onChange={(e) => set("category", e.target.value as CategoryId)}>
            {TASK_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORIES[c].label}</option>)}
          </Select>
        </Field>
        <Field label="Priorytet">
          <Select value={d.priority} onChange={(e) => set("priority", e.target.value as Priority)}>
            {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
          </Select>
        </Field>
        <Field label="Termin">
          <Input type="date" value={d.due} onChange={(e) => set("due", e.target.value)} />
        </Field>
        <Field label="Szacowany czas (min)">
          <Input type="number" inputMode="numeric" min={0} value={d.estimate} onChange={(e) => set("estimate", e.target.value)} placeholder="45" />
        </Field>
      </div>
      {clients.length > 0 && d.category === "aiven" && (
        <Field label="Klient">
          <Select value={d.clientId} onChange={(e) => set("clientId", e.target.value)}>
            <option value="">— bez klienta —</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.company}</option>)}
          </Select>
        </Field>
      )}
      <div>
        <span className="mb-1.5 block text-[12px] font-medium text-muted">Małe kroki</span>
        {d.steps.length > 0 && (
          <ul className="mb-2 space-y-1">
            {d.steps.map((s) => (
              <li key={s.id} className="flex items-center gap-3 rounded-xl bg-surface-2/60 py-1 pl-3 pr-1">
                <Check label={s.title} checked={s.done} onChange={() => set("steps", d.steps.map((x) => (x.id === s.id ? { ...x, done: !x.done } : x)))} />
                <span className="min-w-0 flex-1 truncate text-sm">{s.title}</span>
                <IconButton label={`Usuń krok ${s.title}`} onClick={() => set("steps", d.steps.filter((x) => x.id !== s.id))}><Trash2 size={15} /></IconButton>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2">
          <Input
            value={step}
            onChange={(e) => setStep(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addStep();
              }
            }}
            placeholder="Dodaj krok i naciśnij Enter"
            aria-label="Nowy krok"
          />
          <IconButton label="Dodaj krok" onClick={addStep} className="size-11 border border-line"><Plus size={16} /></IconButton>
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        {task && (
          <Button
            variant="danger"
            onClick={() => {
              deleteTask(task.id);
              toast("Zadanie usunięte.");
              onDone();
            }}
          >
            Usuń
          </Button>
        )}
        <Button type="submit" variant="primary" className="flex-1">{task ? "Zapisz" : "Dodaj zadanie"}</Button>
      </div>
    </form>
  );
}

/** Two-field quick capture, reachable from Today and Tasks. */
export function QuickAddTask() {
  const open = useUi((s) => s.quickAdd);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<CategoryId>("math");
  const [pin, setPin] = useState(false);
  const close = () => useUi.setState({ quickAdd: false });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const id = addTask({ title: title.trim(), category, priority: "medium" });
    if (pin && !togglePin(id, dateKey())) toast("Masz już 3 priorytety na dziś — zadanie trafiło na listę.");
    else toast("Dodane.", "success");
    setTitle("");
    setPin(false);
    close();
  };

  return (
    <Modal open={open} onClose={close} title="Szybkie zadanie">
      <form onSubmit={submit} className="space-y-3">
        <Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Co trzeba zrobić?" aria-label="Tytuł zadania" maxLength={160} />
        <Select value={category} onChange={(e) => setCategory(e.target.value as CategoryId)} aria-label="Kategoria">
          {TASK_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORIES[c].label}</option>)}
        </Select>
        <label className="flex items-center gap-3 py-1 text-sm">
          <Check label="Przypnij jako priorytet dnia" checked={pin} onChange={() => setPin(!pin)} />
          Przypnij jako priorytet dnia
        </label>
        <Button type="submit" variant="primary" className="w-full" disabled={!title.trim()}>Dodaj</Button>
      </form>
    </Modal>
  );
}
