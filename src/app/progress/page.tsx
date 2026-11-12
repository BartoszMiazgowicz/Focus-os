"use client";

import { Award, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Bar, Button, Card, Check, cx, Empty, Field, IconButton, Input, Modal, PageHeader, SectionTitle, Segmented, Select } from "@/components/ui/kit";
import { deleteGoal, saveGoal } from "@/lib/actions";
import { badges, habitDone, HABITS, levelFloor, levelOf, missionComplete, missions, totalXp, weekReport } from "@/lib/logic";
import type { Goal } from "@/lib/schema";
import { useData } from "@/lib/store";
import { addDays, dateKey, DAY_SHORT, dow, fmtDate, fmtDur, uid, weekDays, weekStart } from "@/lib/time";

const HORIZON: Record<Goal["horizon"], string> = { week: "Tydzień", month: "Miesiąc", long: "Długoterminowy" };

function GoalEditor({ goal, onClose }: { goal: Goal | null; onClose: () => void }) {
  const [g, setG] = useState({ id: goal?.id, title: goal?.title ?? "", horizon: goal?.horizon ?? ("month" as Goal["horizon"]), progress: goal?.progress ?? 0, milestones: goal?.milestones ?? [] });
  const [step, setStep] = useState("");
  const [error, setError] = useState("");
  const addStep = () => {
    if (!step.trim()) return;
    setG({ ...g, milestones: [...g.milestones, { id: uid(), title: step.trim(), done: false }] });
    setStep("");
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!g.title.trim()) return setError("Nazwij cel konkretnie — tak, żeby dało się go odhaczyć.");
    saveGoal({ ...g, title: g.title.trim() });
    onClose();
  };
  return (
    <Modal open onClose={onClose} title={goal ? "Cel" : "Nowy cel"} wide>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Cel" error={error}><Input autoFocus={!goal} value={g.title} onChange={(e) => setG({ ...g, title: e.target.value })} placeholder="np. Matura z matematyki rozszerzonej: 70%+" maxLength={160} /></Field>
        <Field label="Horyzont">
          <Select value={g.horizon} onChange={(e) => setG({ ...g, horizon: e.target.value as Goal["horizon"] })}>
            {Object.entries(HORIZON).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Field>
        <div>
          <span className="mb-1.5 block text-[12px] font-medium text-muted">Kamienie milowe</span>
          <ul className="mb-2 space-y-1">
            {g.milestones.map((m) => (
              <li key={m.id} className="flex items-center gap-3 rounded-xl bg-surface-2/60 py-1 pl-3 pr-1">
                <Check label={m.title} checked={m.done} onChange={() => setG({ ...g, milestones: g.milestones.map((x) => (x.id === m.id ? { ...x, done: !x.done } : x)) })} />
                <span className={cx("min-w-0 flex-1 truncate text-sm", m.done && "text-muted line-through")}>{m.title}</span>
                <IconButton label={`Usuń ${m.title}`} onClick={() => setG({ ...g, milestones: g.milestones.filter((x) => x.id !== m.id) })}><Trash2 size={15} /></IconButton>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <Input value={step} onChange={(e) => setStep(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addStep(); } }} placeholder="Dodaj kamień milowy i naciśnij Enter" aria-label="Nowy kamień milowy" />
            <IconButton label="Dodaj kamień milowy" onClick={addStep} className="size-11 border border-line"><Plus size={16} /></IconButton>
          </div>
        </div>
        {g.milestones.length === 0 && (
          <Field label={`Postęp: ${g.progress}%`} hint="Z kamieniami milowymi postęp liczy się sam.">
            <input type="range" min={0} max={100} step={5} value={g.progress} onChange={(e) => setG({ ...g, progress: Number(e.target.value) })} className="h-11 w-full accent-[var(--accent)]" aria-label="Postęp celu" />
          </Field>
        )}
        {goal && goal.history.length > 1 && (
          <div>
            <span className="mb-1.5 block text-[12px] font-medium text-muted">Historia zmian</span>
            <ul className="space-y-1 text-[12px] text-muted">
              {[...goal.history].reverse().slice(0, 6).map((h) => (
                <li key={h.at} className="tabular flex justify-between"><span>{new Date(h.at).toLocaleDateString("pl-PL", { day: "numeric", month: "short" })}</span><span>{h.progress}%</span></li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex gap-2">
          {goal && <Button variant="danger" onClick={() => { deleteGoal(goal.id); onClose(); }}>Usuń</Button>}
          <Button type="submit" variant="primary" className="flex-1">Zapisz</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function ProgressPage() {
  const today = dateKey();
  const [anchor, setAnchor] = useState(today);
  const [tab, setTab] = useState<"week" | "goals" | "xp">("week");
  const [goal, setGoal] = useState<Goal | "new" | null>(null);

  const report = useData((d) => weekReport(d, anchor));
  const weekMissions = useData((d) => missions(d, anchor));
  const xp = useData(totalXp);
  const events = useData((d) => [...d.xp].sort((a, b) => b.at - a.at).slice(0, 25));
  const earned = useData(badges);
  const goals = useData((d) => d.goals);
  const habitGrid = useData((d) => HABITS.map((h) => ({ label: h.label, days: weekDays(anchor).map((day) => habitDone(d, day, h)) })));

  const days = weekDays(anchor);
  const isCurrent = weekStart(anchor) === weekStart(today);
  const weekOver = days[6] < today;
  const level = levelOf(xp);
  const floor = levelFloor(level);
  const ceil = levelFloor(level + 1);
  const rows: [string, number, number][] = [
    ["Matematyka", report.minutes.math, 450],
    ["Angielski", report.minutes.english, 180],
    ["Programowanie / AI", report.minutes.code, 420],
    ["Aiven", report.minutes.aiven, 300],
    ["Trening", report.minutes.training, 600],
  ];

  return (
    <div>
      <PageHeader title="Progress" subtitle="Liczby do podejmowania decyzji — nie ocena Ciebie." />
      <div className="mb-4"><Segmented label="Widok" value={tab} onChange={setTab} options={[{ value: "week", label: "Tydzień" }, { value: "goals", label: "Cele" }, { value: "xp", label: "Rozwój" }]} /></div>

      {tab === "week" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <IconButton label="Poprzedni tydzień" className="border border-line" onClick={() => setAnchor(addDays(anchor, -7))}><ChevronLeft size={16} /></IconButton>
            <p className="tabular text-sm font-medium">{fmtDate(days[0], { day: "numeric", month: "short" })} – {fmtDate(days[6], { day: "numeric", month: "short" })}{isCurrent && " · bieżący"}</p>
            <IconButton label="Następny tydzień" className="border border-line" disabled={isCurrent} onClick={() => setAnchor(addDays(anchor, 7))}><ChevronRight size={16} /></IconButton>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <SectionTitle action={<span className="tabular text-[12px] text-muted">{report.blocksDone}/{report.blocksPlanned}</span>}>Wykonane bloki</SectionTitle>
              <p className="tabular text-4xl font-semibold tracking-tight">{report.completion}%</p>
              <div className="mt-3"><Bar value={report.completion} label="Procent wykonanych bloków" /></div>
              <p className="mt-2 text-[12px] text-muted">Liczone bloki nauki, pracy, treningu i rutyn do dziś. Odpoczynek i czas prywatny nie są oceniane.</p>
            </Card>
            <Card>
              <SectionTitle>Czas</SectionTitle>
              <ul className="space-y-3">
                {rows.map(([label, value, target]) => (
                  <li key={label}>
                    <div className="mb-1.5 flex justify-between text-[13px]"><span>{label}</span><span className="tabular text-muted">{fmtDur(value)}</span></div>
                    <Bar value={value} max={target} label={label} />
                  </li>
                ))}
                <li>
                  <div className="mb-1.5 flex justify-between text-[13px]"><span>Granie</span><span className="tabular text-muted">{fmtDur(report.minutes.gaming)} / plan {fmtDur(report.gamingPlanned)}</span></div>
                  <Bar value={report.minutes.gaming} max={report.gamingPlanned || 1} over={report.minutes.gaming > report.gamingPlanned} label="Granie" />
                </li>
              </ul>
              <p className="mt-3 text-[12px] text-muted">Sen: {report.sleepAvg === null ? "brak wpisów" : `średnio ${report.sleepAvg.toFixed(1).replace(".", ",")} h`} · trening liczony jako 2 h na zapisany trening.</p>
            </Card>
            <Card>
              <SectionTitle>Najważniejsze osiągnięcia</SectionTitle>
              {report.wins.length === 0 ? <p className="text-[13px] leading-relaxed text-muted">Jeszcze nic do pokazania w tym tygodniu. Pierwsza ukończona sesja albo zamknięte zadanie trafi tutaj.</p> : (
                <ul className="space-y-2 text-sm">{report.wins.map((w) => <li key={w} className="flex gap-2"><span className="text-accent">✓</span>{w}</li>)}</ul>
              )}
            </Card>
            <Card>
              <SectionTitle>Do poprawy w następnym tygodniu</SectionTitle>
              {report.improve.length === 0 ? <p className="text-[13px] leading-relaxed text-muted">Nic nie wymaga korekty{report.blocksPlanned < 5 ? " — albo jest jeszcze za mało danych, żeby coś wskazać" : ""}.</p> : (
                <ol className="space-y-2.5 text-sm leading-relaxed">{report.improve.map((w, i) => <li key={w} className="flex gap-3"><span className="tabular font-mono text-muted">{i + 1}</span>{w}</li>)}</ol>
              )}
            </Card>
          </div>

          <Card>
            <SectionTitle>Nawyki</SectionTitle>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-[13px]">
                <thead>
                  <tr><th className="text-left font-normal" />{days.map((d) => <th key={d} className={cx("w-9 pb-2 text-center text-[11px] font-medium", d === today ? "text-accent" : "text-muted")}>{DAY_SHORT[dow(d)]}</th>)}</tr>
                </thead>
                <tbody>
                  {habitGrid.map((h) => (
                    <tr key={h.label}>
                      <th scope="row" className="py-1.5 pr-3 text-left font-normal">{h.label}</th>
                      {h.days.map((done, i) => (
                        <td key={i} className="text-center"><span aria-label={done ? "zrobione" : "brak"} className={cx("inline-block size-2.5 rounded-full", done ? "bg-accent" : "bg-surface-2")} /></td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[12px] text-muted">Puste pole to informacja, nie porażka. Po przerwie wróć najmniejszą możliwą wersją nawyku.</p>
          </Card>
        </div>
      )}

      {tab === "goals" && (
        <div className="space-y-4">
          <div className="flex justify-end"><Button variant="primary" onClick={() => setGoal("new")}><Plus size={16} /> Cel</Button></div>
          {goals.length === 0 ? (
            <Empty title="Brak celów" hint="Zacznij od jednego celu długoterminowego (np. matura w maju 2027) i podziel go na kamienie milowe." action={<Button onClick={() => setGoal("new")}><Plus size={15} /> Dodaj cel</Button>} />
          ) : (
            (Object.keys(HORIZON) as Goal["horizon"][]).filter((h) => goals.some((g) => g.horizon === h)).map((h) => (
              <Card key={h}>
                <SectionTitle>{HORIZON[h]}</SectionTitle>
                <ul className="space-y-4">
                  {goals.filter((g) => g.horizon === h).map((g) => (
                    <li key={g.id}>
                      <button type="button" onClick={() => setGoal(g)} className="w-full text-left">
                        <span className="mb-1.5 flex justify-between gap-3 text-sm"><span className="min-w-0 truncate font-medium">{g.title}</span><span className="tabular text-muted">{g.progress}%</span></span>
                        <Bar value={g.progress} label={`Postęp celu ${g.title}`} />
                        {g.milestones.length > 0 && <span className="mt-1.5 block text-[12px] text-muted">{g.milestones.filter((m) => m.done).length}/{g.milestones.length} kamieni milowych{g.milestones.find((m) => !m.done) && ` · następny: ${g.milestones.find((m) => !m.done)!.title}`}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === "xp" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <SectionTitle action={<span className="tabular text-[12px] text-muted">{xp} XP</span>}>Poziom {level}</SectionTitle>
            <Bar value={xp - floor} max={ceil - floor} label="Postęp do następnego poziomu" />
            <p className="tabular mt-2 text-[12px] text-muted">{ceil - xp} XP do poziomu {level + 1}</p>
            <p className="mt-3 text-[12px] leading-relaxed text-muted">XP jest tylko za wykonanie: zamknięte zadania, sesje skupienia, treningi, powtórki, granie w limicie. Nic za planowanie, nic za nocne sesje i nic za trening ponad plan.</p>
          </Card>
          <Card>
            <SectionTitle>Misje tygodnia</SectionTitle>
            <ul className="space-y-3">
              {weekMissions.map((m) => {
                const done = missionComplete(m, weekOver);
                return (
                  <li key={m.id}>
                    <div className="mb-1.5 flex justify-between gap-3 text-[13px]">
                      <span className={cx(done && "text-accent")}>{done && "✓ "}{m.label}</span>
                      <span className="tabular shrink-0 text-muted">{String(m.current).replace(".", ",")} / {m.target} {m.unit}</span>
                    </div>
                    <Bar value={m.current} max={m.target} over={m.inverse && m.current > m.target} label={m.label} />
                  </li>
                );
              })}
            </ul>
          </Card>
          <Card>
            <SectionTitle action={<span className="tabular text-[12px] text-muted">{earned.filter((b) => b.earned).length}/{earned.length}</span>}>Odznaki</SectionTitle>
            <ul className="grid grid-cols-2 gap-2">
              {earned.map((b) => (
                <li key={b.id} className={cx("rounded-xl border p-3", b.earned ? "border-accent/40 bg-accent/[0.06]" : "border-line opacity-55")}>
                  <Award size={16} className={b.earned ? "text-accent" : "text-muted"} />
                  <p className="mt-2 text-[13px] font-medium leading-snug">{b.label}</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-muted">{b.desc}</p>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <SectionTitle>Historia osiągnięć</SectionTitle>
            {events.length === 0 ? <p className="text-[13px] leading-relaxed text-muted">Pusto. Pierwsze XP dostaniesz za ukończoną sesję skupienia albo zamknięte zadanie.</p> : (
              <ul className="divide-y divide-line">
                {events.map((e) => (
                  <li key={e.key} className="flex items-center gap-3 py-2">
                    <span className="min-w-0 flex-1"><span className="block truncate text-[13px]">{e.label}</span><span className="block text-[11px] text-muted">{fmtDate(e.date, { day: "numeric", month: "short" })}</span></span>
                    <span className="tabular shrink-0 text-[13px] font-medium text-accent">+{e.amount}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      {goal && <GoalEditor goal={goal === "new" ? null : goal} onClose={() => setGoal(null)} />}
    </div>
  );
}
