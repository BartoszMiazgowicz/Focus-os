"use client";

import { Dumbbell, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { CheckIn, ENERGY_LABELS } from "@/components/today/readiness";
import { Button, Card, cx, Empty, Field, IconButton, Input, Modal, PageHeader, SectionTitle, Textarea } from "@/components/ui/kit";
import { deleteWorkout, saveWorkout } from "@/lib/actions";
import { blocksFor, readiness } from "@/lib/logic";
import type { Workout } from "@/lib/schema";
import { toast, useData } from "@/lib/store";
import { addDays, dateKey, DAY_SHORT, dow, fmtDate, parseKey, uid, weekDays } from "@/lib/time";

const emptyWorkout = (date: string): Workout => ({ id: uid(), date, title: "", exercises: [], note: "" });

function WorkoutEditor({ initial, isNew, onClose }: { initial: Workout; isNew: boolean; onClose: () => void }) {
  const names = useData((d) => [...new Set(d.workouts.flatMap((w) => w.exercises.map((e) => e.name)))]);
  const [w, setW] = useState(initial);
  const [error, setError] = useState("");
  const setEx = (id: string, fn: (e: Workout["exercises"][number]) => Workout["exercises"][number]) =>
    setW((p) => ({ ...p, exercises: p.exercises.map((e) => (e.id === id ? fn(e) : e)) }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!w.date || w.date > dateKey()) return setError("Wybierz dzisiejszą lub wcześniejszą datę.");
    const exercises = w.exercises.filter((x) => x.name.trim()).map((x) => ({ ...x, name: x.name.trim() }));
    saveWorkout({ ...w, exercises });
    toast("Trening zapisany.", "success");
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={isNew ? "Nowy trening" : "Trening"} wide>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data" error={error}><Input type="date" value={w.date} max={dateKey()} onChange={(e) => setW({ ...w, date: e.target.value })} /></Field>
          <Field label="Nazwa"><Input value={w.title} onChange={(e) => setW({ ...w, title: e.target.value })} placeholder="np. Push / Nogi" maxLength={60} /></Field>
        </div>
        <datalist id="exercise-names">{names.map((n) => <option key={n} value={n} />)}</datalist>
        {w.exercises.map((ex) => (
          <div key={ex.id} className="rounded-2xl border border-line p-3">
            <div className="flex gap-2">
              <Input value={ex.name} list="exercise-names" onChange={(e) => setEx(ex.id, (x) => ({ ...x, name: e.target.value }))} placeholder="Ćwiczenie" aria-label="Nazwa ćwiczenia" maxLength={60} />
              <IconButton label="Usuń ćwiczenie" className="size-11" onClick={() => setW({ ...w, exercises: w.exercises.filter((x) => x.id !== ex.id) })}><Trash2 size={15} /></IconButton>
            </div>
            <ul className="mt-2 space-y-1.5">
              {ex.sets.map((s, i) => (
                <li key={i} className="grid grid-cols-[1.5rem_1fr_1fr_2.5rem] items-center gap-2">
                  <span className="tabular text-center font-mono text-[12px] text-muted">{i + 1}</span>
                  <Input type="number" inputMode="numeric" min={0} value={s.reps || ""} placeholder="powt." aria-label={`Seria ${i + 1}: powtórzenia`}
                    onChange={(e) => setEx(ex.id, (x) => ({ ...x, sets: x.sets.map((y, j) => (j === i ? { ...y, reps: Math.max(0, Number(e.target.value) || 0) } : y)) }))} />
                  <Input type="number" inputMode="decimal" min={0} step="0.5" value={s.weight || ""} placeholder="kg" aria-label={`Seria ${i + 1}: ciężar w kg`}
                    onChange={(e) => setEx(ex.id, (x) => ({ ...x, sets: x.sets.map((y, j) => (j === i ? { ...y, weight: Math.max(0, Number(e.target.value) || 0) } : y)) }))} />
                  <IconButton label={`Usuń serię ${i + 1}`} onClick={() => setEx(ex.id, (x) => ({ ...x, sets: x.sets.filter((_, j) => j !== i) }))}><X size={14} /></IconButton>
                </li>
              ))}
            </ul>
            <Button variant="ghost" size="sm" className="mt-1.5" onClick={() => setEx(ex.id, (x) => ({ ...x, sets: [...x.sets, { ...(x.sets[x.sets.length - 1] ?? { reps: 0, weight: 0 }) }] }))}>
              <Plus size={13} /> Seria
            </Button>
          </div>
        ))}
        <Button className="w-full" onClick={() => setW({ ...w, exercises: [...w.exercises, { id: uid(), name: "", sets: [{ reps: 0, weight: 0 }] }] })}><Plus size={15} /> Ćwiczenie</Button>
        <Field label="Samopoczucie i notatki"><Textarea value={w.note} onChange={(e) => setW({ ...w, note: e.target.value })} placeholder="Jak się czułeś? Coś bolało? Co poprawić?" maxLength={1000} /></Field>
        <div className="flex gap-2">
          {!isNew && <Button variant="danger" onClick={() => { deleteWorkout(w.id); onClose(); }}>Usuń</Button>}
          <Button type="submit" variant="primary" className="flex-1">Zapisz trening</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function TrainingPage() {
  const today = dateKey();
  const days = weekDays(today);
  const workouts = useData((d) => [...d.workouts].sort((a, b) => b.date.localeCompare(a.date)));
  const plan = useData((d) => days.map((day) => blocksFor(d, day).some((b) => b.category === "gym")));
  const logs = useData((d) => d.dayLogs);
  const [editing, setEditing] = useState<{ w: Workout; isNew: boolean } | null>(null);
  const [checkIn, setCheckIn] = useState<string | null>(null);

  const r = readiness(logs[today]);
  const doneThisWeek = workouts.filter((w) => days.includes(w.date)).length;
  const plannedCount = plan.filter(Boolean).length;

  // Best set per exercise over time: a simple, honest progress signal.
  const progress = new Map<string, { first: number; best: number; last: string }>();
  for (const w of [...workouts].reverse())
    for (const ex of w.exercises) {
      const top = Math.max(0, ...ex.sets.map((s) => s.weight));
      if (!top) continue;
      const p = progress.get(ex.name);
      progress.set(ex.name, p ? { first: p.first, best: Math.max(p.best, top), last: w.date } : { first: top, best: top, last: w.date });
    }
  const journal = Array.from({ length: 7 }, (_, i) => addDays(today, -i));

  return (
    <div>
      <PageHeader
        title="Training"
        subtitle={`W tym tygodniu: ${doneThisWeek} z ${plannedCount} zaplanowanych`}
        action={<Button variant="primary" onClick={() => setEditing({ w: emptyWorkout(today), isNew: true })}><Plus size={16} /> Trening</Button>}
      />

      {r?.label === "Niska" && (
        <p className="mb-4 rounded-2xl border border-line bg-surface px-4 py-3 text-sm leading-relaxed">
          Dziś niska gotowość. Lżejszy trening albo dzień regeneracji to też realizacja planu — nie trenuj przez ból ani wyraźne przemęczenie.
        </p>
      )}

      <div className="mb-4 grid grid-cols-7 gap-1.5">
        {days.map((d, i) => {
          const done = workouts.some((w) => w.date === d);
          return (
            <div key={d} className={cx("flex h-20 flex-col items-center justify-center gap-1 rounded-2xl border", d === today ? "border-accent" : "border-line", "bg-surface")}>
              <span className={cx("text-[11px] font-medium", d === today ? "text-accent" : "text-muted")}>{DAY_SHORT[dow(d)]}</span>
              <span className="tabular text-[15px] font-semibold">{parseKey(d).getDate()}</span>
              <span className={cx("text-[10px]", done ? "font-medium text-accent" : "text-muted")}>{done ? "✓ zrobiony" : plan[i] ? "siłownia" : "wolne"}</span>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <Card>
            <SectionTitle>Historia treningów</SectionTitle>
            {workouts.length === 0 ? (
              <Empty icon={<Dumbbell size={22} />} title="Brak zapisanych treningów" hint="Po treningu zapisz ćwiczenia, serie i ciężar. Po kilku tygodniach zobaczysz tu progres." action={<Button onClick={() => setEditing({ w: emptyWorkout(today), isNew: true })}><Plus size={15} /> Zapisz trening</Button>} />
            ) : (
              <ul className="divide-y divide-line">
                {workouts.slice(0, 20).map((w) => (
                  <li key={w.id}>
                    <button type="button" onClick={() => setEditing({ w, isNew: false })} className="flex w-full items-center gap-3 py-3 text-left">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{w.title || "Trening"}</span>
                        <span className="block truncate text-[12px] text-muted">
                          {fmtDate(w.date, { weekday: "short", day: "numeric", month: "short" })} · {w.exercises.length ? w.exercises.map((e) => e.name).join(", ") : "bez listy ćwiczeń"}
                        </span>
                      </span>
                      <span className="tabular shrink-0 text-[12px] text-muted">{w.exercises.reduce((a, e) => a + e.sets.length, 0)} serii</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          {progress.size > 0 && (
            <Card>
              <SectionTitle>Progres — najcięższa seria</SectionTitle>
              <ul className="divide-y divide-line">
                {[...progress.entries()].map(([name, p]) => (
                  <li key={name} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="truncate text-sm">{name}</span>
                    <span className="tabular shrink-0 text-[13px] text-muted">
                      {p.first !== p.best && <>{p.first} kg → </>}<span className="font-semibold text-fg">{p.best} kg</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <div className="space-y-4 lg:col-span-2">
          <Card>
            <SectionTitle>Sen i energia</SectionTitle>
            <ul className="divide-y divide-line">
              {journal.map((d) => {
                const l = logs[d];
                return (
                  <li key={d}>
                    <button type="button" onClick={() => setCheckIn(d)} className="flex w-full items-center justify-between gap-3 py-2.5 text-left">
                      <span className="text-sm">{d === today ? "Dziś" : fmtDate(d, { weekday: "short", day: "numeric", month: "short" })}</span>
                      <span className="tabular text-[13px] text-muted">
                        {l?.sleepHours !== undefined ? `${String(l.sleepHours).replace(".", ",")} h · ${l.energy ? ENERGY_LABELS[l.energy - 1].toLowerCase() : "—"}` : "uzupełnij"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>
          <p className="px-1 text-[12px] leading-relaxed text-muted">
            Plan: 5 treningów w tygodniu, środa i niedziela bez siłowni. Dodatkowe treningi nie dają dodatkowych punktów — regeneracja jest częścią planu. Aplikacja nie ocenia zdrowia; przy bólu lub urazie skonsultuj się ze specjalistą.
          </p>
        </div>
      </div>

      {editing && <WorkoutEditor initial={editing.w} isNew={editing.isNew} onClose={() => setEditing(null)} />}
      <Modal open={checkIn !== null} onClose={() => setCheckIn(null)} title="Sen i energia" description={checkIn ? fmtDate(checkIn, { weekday: "long", day: "numeric", month: "long" }) : undefined}>
        {checkIn && <CheckIn key={checkIn} date={checkIn} onDone={() => setCheckIn(null)} />}
      </Modal>
    </div>
  );
}
