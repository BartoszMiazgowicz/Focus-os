"use client";

import { CalendarClock, ListChecks, Pin, Plus, Search } from "lucide-react";
import { useState } from "react";
import { TaskForm } from "@/components/tasks/task-form";
import { Bar, Button, Check, cx, Empty, IconButton, Input, Modal, PageHeader, Pill, Segmented, Select } from "@/components/ui/kit";
import { togglePin, toggleStep, toggleTask } from "@/lib/actions";
import { CATEGORIES, PRIORITY_LABEL, TASK_CATEGORIES, type CategoryId } from "@/lib/categories";
import { sortTasks } from "@/lib/logic";
import type { Task } from "@/lib/schema";
import { toast, useData } from "@/lib/store";
import { dateKey, fmtDate } from "@/lib/time";

type Filter = "open" | "today" | "done";

function TaskRow({ task, today, onEdit }: { task: Task; today: string; onEdit: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const done = task.status === "done";
  const overdue = !done && task.due !== undefined && task.due < today;
  const pinned = task.pinnedDate === today;
  return (
    <li className="rounded-2xl border border-line bg-surface">
      <div className="flex items-start gap-3 p-3.5">
        <div className="pt-0.5"><Check label={`Oznacz „${task.title}” jako ${done ? "niewykonane" : "wykonane"}`} checked={done} onChange={() => toggleTask(task.id)} /></div>
        <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-left">
          <span className={cx("block text-sm leading-snug", done && "text-muted line-through")}>{task.title}</span>
          <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Pill>{CATEGORIES[task.category].label}</Pill>
            {(task.priority === "high" || task.priority === "critical") && <Pill tone="accent">{PRIORITY_LABEL[task.priority]}</Pill>}
            {task.due && <Pill tone={overdue ? "danger" : "default"}><CalendarClock size={11} className="mr-1" />{task.due === today ? "dziś" : fmtDate(task.due, { day: "numeric", month: "short" })}</Pill>}
            {task.estimateMin ? <Pill>{task.estimateMin} min</Pill> : null}
          </span>
        </button>
        {!done && (
          <IconButton
            label={pinned ? "Odepnij z priorytetów dnia" : "Przypnij jako priorytet dnia"}
            aria-pressed={pinned}
            onClick={() => !togglePin(task.id, today) && toast("Trzy priorytety to maksimum. Odepnij jeden, żeby dodać kolejny.")}
            className={pinned ? "text-accent" : undefined}
          >
            <Pin size={16} fill={pinned ? "currentColor" : "none"} />
          </IconButton>
        )}
      </div>
      {task.steps.length > 0 && !done && (
        <div className="border-t border-line px-3.5 py-2.5">
          <button type="button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded} className="flex w-full items-center gap-3 text-[12px] text-muted">
            <span className="flex-1"><Bar value={task.progress} label="Postęp zadania" /></span>
            <span className="tabular">{task.steps.filter((s) => s.done).length}/{task.steps.length} kroków</span>
          </button>
          {expanded && (
            <ul className="mt-2.5 space-y-2">
              {task.steps.map((s) => (
                <li key={s.id} className="flex items-center gap-3">
                  <Check label={s.title} checked={s.done} onChange={() => toggleStep(task.id, s.id)} />
                  <span className={cx("text-[13px]", s.done && "text-muted line-through")}>{s.title}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}

export default function TasksPage() {
  const today = dateKey();
  const tasks = useData((d) => d.tasks);
  const [filter, setFilter] = useState<Filter>("open");
  const [category, setCategory] = useState<CategoryId | "all">("all");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Task | "new" | null>(null);

  const q = query.trim().toLowerCase();
  const visible = sortTasks(
    tasks.filter(
      (t) =>
        (filter === "done" ? t.status === "done" : t.status !== "done") &&
        (filter !== "today" || t.pinnedDate === today || (t.due !== undefined && t.due <= today)) &&
        (category === "all" || t.category === category) &&
        (!q || t.title.toLowerCase().includes(q)),
    ),
  );
  if (filter === "done") visible.sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
  const openCount = tasks.filter((t) => t.status !== "done").length;

  return (
    <div>
      <PageHeader
        title="Tasks"
        subtitle={openCount ? `Otwarte: ${openCount}` : "Lista jest pusta"}
        action={<Button variant="primary" onClick={() => setEditing("new")}><Plus size={16} /> Zadanie</Button>}
      />
      <div className="mb-4 space-y-2">
        <Segmented
          label="Filtr zadań"
          value={filter}
          onChange={setFilter}
          options={[{ value: "open", label: "Otwarte" }, { value: "today", label: "Na dziś" }, { value: "done", label: "Zrobione" }]}
        />
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Szukaj zadania" aria-label="Szukaj zadania" className="pl-9" />
          </div>
          <Select value={category} onChange={(e) => setCategory(e.target.value as CategoryId | "all")} aria-label="Kategoria" className="w-36 sm:w-48">
            <option value="all">Wszystkie</option>
            {TASK_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORIES[c].label}</option>)}
          </Select>
        </div>
      </div>

      {visible.length === 0 ? (
        <Empty
          icon={<ListChecks size={22} />}
          title={q || category !== "all" ? "Nic nie pasuje do filtrów" : filter === "done" ? "Jeszcze nic nie zamknięte" : filter === "today" ? "Nic na dziś" : "Brak zadań"}
          hint={
            q || category !== "all"
              ? "Zmień wyszukiwanie albo kategorię."
              : filter === "today"
                ? "Przypnij do trzech zadań jako priorytety dnia albo nadaj termin."
                : "Zapisz pierwszą konkretną rzecz do zrobienia. Duże zadania rozbij na małe kroki."
          }
          action={filter !== "done" && !q ? <Button onClick={() => setEditing("new")}><Plus size={15} /> Dodaj zadanie</Button> : undefined}
        />
      ) : (
        <ul className="space-y-2">
          {visible.map((t) => <TaskRow key={t.id} task={t} today={today} onEdit={() => setEditing(t)} />)}
        </ul>
      )}

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "Nowe zadanie" : "Edytuj zadanie"}>
        {editing && <TaskForm task={editing === "new" ? undefined : editing} onDone={() => setEditing(null)} />}
      </Modal>
    </div>
  );
}
