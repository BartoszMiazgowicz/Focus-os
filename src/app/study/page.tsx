"use client";

import { ChevronDown, Play, Plus, RotateCw, Trash2 } from "lucide-react";
import { useState } from "react";
import { Bar, Button, Card, Confirm, cx, Empty, Field, IconButton, Input, Modal, PageHeader, Pill, SectionTitle, Segmented, Select, Textarea } from "@/components/ui/kit";
import { addTest, completeReview, deleteFocusSession, deleteTest, deleteTopic, saveTopic } from "@/lib/actions";
import { focusMinutes } from "@/lib/logic";
import { TOPIC_STATUSES, type SubjectId, type Topic } from "@/lib/schema";
import { toast, useData } from "@/lib/store";
import { dateKey, fmtDate, fmtDur, weekDays } from "@/lib/time";
import { openStarter } from "@/lib/ui";

const SUBJECTS: { value: SubjectId; label: string; full: string }[] = [
  { value: "math", label: "Matematyka", full: "Matematyka rozszerzona" },
  { value: "english", label: "Angielski", full: "Angielski rozszerzony" },
  { value: "inf04", label: "INF.04", full: "INF.04 — część praktyczna" },
];
const STATUS_LABEL: Record<Topic["status"], string> = { new: "Nie zaczęte", learning: "W trakcie", review: "Do powtórki", mastered: "Opanowane" };

function TopicEditor({ topic, subject, onClose }: { topic: Topic | null; subject: SubjectId; onClose: () => void }) {
  const sections = useData((d) => [...new Set(d.topics.filter((t) => t.subject === subject).map((t) => t.section))]);
  const [t, setT] = useState<Omit<Topic, "id"> & { id?: string }>(
    topic ?? { subject, section: sections[0] ?? "", title: "", mastery: 0, status: "new", tasksDone: 0, notes: "", mistakes: "", reviewStage: 0 },
  );
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);
  const set = <K extends keyof Topic>(k: K, v: Topic[K]) => setT((p) => ({ ...p, [k]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!t.title.trim()) return setError("Podaj nazwę tematu.");
    if (!t.section.trim()) return setError("Podaj dział.");
    saveTopic({ ...t, title: t.title.trim(), section: t.section.trim(), nextReview: t.nextReview || undefined });
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={topic ? "Temat" : "Nowy temat"} wide>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Temat" error={error}><Input value={t.title} onChange={(e) => set("title", e.target.value)} maxLength={160} autoFocus={!topic} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Dział"><Input value={t.section} onChange={(e) => set("section", e.target.value)} list="sections" maxLength={80} /></Field>
          <datalist id="sections">{sections.map((s) => <option key={s} value={s} />)}</datalist>
          <Field label="Status">
            <Select value={t.status} onChange={(e) => set("status", e.target.value as Topic["status"])}>
              {TOPIC_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </Select>
          </Field>
        </div>
        <Field label={`Poziom opanowania: ${t.mastery}%`} hint="Twoja własna ocena — po to, żeby wiedzieć, gdzie wracać.">
          <input type="range" min={0} max={100} step={5} value={t.mastery} onChange={(e) => set("mastery", Number(e.target.value))} className="h-11 w-full accent-[var(--accent)]" aria-label="Poziom opanowania" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Wykonane zadania">
            <div className="flex gap-2">
              <Input type="number" inputMode="numeric" min={0} value={t.tasksDone} onChange={(e) => set("tasksDone", Math.max(0, Number(e.target.value) || 0))} />
              <IconButton label="Dodaj jedno zadanie" className="size-11 border border-line" onClick={() => set("tasksDone", t.tasksDone + 1)}><Plus size={16} /></IconButton>
            </div>
          </Field>
          <Field label="Następna powtórka"><Input type="date" value={t.nextReview ?? ""} onChange={(e) => set("nextReview", e.target.value || undefined)} /></Field>
        </div>
        <Field label="Notatki"><Textarea value={t.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Wzory, schematy rozwiązań, linki" maxLength={4000} /></Field>
        <Field label="Błędy, które popełniam"><Textarea value={t.mistakes} onChange={(e) => set("mistakes", e.target.value)} placeholder="np. gubię znak przy przenoszeniu, zapominam o dziedzinie" maxLength={4000} /></Field>
        <div className="flex gap-2">
          {topic && <Button variant="danger" onClick={() => setConfirm(true)}>Usuń</Button>}
          <Button type="submit" variant="primary" className="flex-1">Zapisz</Button>
        </div>
      </form>
      <Confirm open={confirm} onClose={() => setConfirm(false)} onConfirm={() => { deleteTopic(topic!.id); onClose(); }} title="Usunąć temat?" body="Temat zniknie z listy razem z notatkami." />
    </Modal>
  );
}

function TestForm({ subject, onClose }: { subject: SubjectId; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [score, setScore] = useState("");
  const [date, setDate] = useState(dateKey());
  const [error, setError] = useState("");
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(score);
    if (!title.trim()) return setError("Podaj nazwę arkusza lub testu.");
    if (score === "" || !Number.isFinite(n) || n < 0 || n > 100) return setError("Wynik podaj w procentach (0–100).");
    addTest({ subject, title: title.trim(), scorePct: n, date });
    onClose();
  };
  return (
    <Modal open onClose={onClose} title="Wynik testu / arkusza">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Nazwa" error={error}><Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="np. CKE maj 2024" maxLength={120} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Wynik (%)"><Input type="number" inputMode="numeric" min={0} max={100} value={score} onChange={(e) => setScore(e.target.value)} /></Field>
          <Field label="Data"><Input type="date" value={date} max={dateKey()} onChange={(e) => e.target.value && setDate(e.target.value)} /></Field>
        </div>
        <Button type="submit" variant="primary" className="w-full">Zapisz wynik</Button>
      </form>
    </Modal>
  );
}

export default function StudyPage() {
  const today = dateKey();
  const [subject, setSubject] = useState<SubjectId>("math");
  const [open, setOpen] = useState<string | null>(null);
  const [editing, setEditing] = useState<Topic | "new" | null>(null);
  const [testForm, setTestForm] = useState(false);

  const topics = useData((d) => d.topics.filter((t) => t.subject === subject));
  const tests = useData((d) => d.tests.filter((t) => t.subject === subject).sort((a, b) => b.date.localeCompare(a.date)));
  const sessions = useData((d) => d.focusSessions.filter((s) => s.category === subject).sort((a, b) => b.startedAt - a.startedAt).slice(0, 8));
  const time = useData((d) => ({
    week: focusMinutes(d, weekDays(today), subject),
    total: d.focusSessions.filter((s) => s.category === subject).reduce((a, s) => a + s.minutes, 0),
  }));

  const due = topics.filter((t) => t.nextReview && t.nextReview <= today && t.status !== "mastered");
  const sections = [...new Set(topics.map((t) => t.section))];
  const avg = topics.length ? Math.round(topics.reduce((a, t) => a + t.mastery, 0) / topics.length) : 0;
  const weak = [...topics].filter((t) => t.status !== "new" && t.mastery < 50).sort((a, b) => a.mastery - b.mastery).slice(0, 3);
  const info = SUBJECTS.find((s) => s.value === subject)!;

  return (
    <div>
      <PageHeader title="Study" subtitle={info.full} action={<Button variant="primary" onClick={() => openStarter({ category: subject })}><Play size={15} /> Sesja</Button>} />
      <div className="mb-4"><Segmented label="Przedmiot" value={subject} onChange={(v) => { setSubject(v); setOpen(null); }} options={SUBJECTS} /></div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <Card>
            <dl className="grid grid-cols-3 gap-2 text-center">
              {[[`${avg}%`, "opanowania"], [fmtDur(time.week), "w tym tygodniu"], [fmtDur(time.total), "łącznie"]].map(([v, l]) => (
                <div key={l}><dt className="tabular text-lg font-semibold tracking-tight">{v}</dt><dd className="text-[11px] text-muted">{l}</dd></div>
              ))}
            </dl>
            <div className="mt-4"><Bar value={avg} label="Średni poziom opanowania" /></div>
          </Card>

          {due.length > 0 && (
            <Card>
              <SectionTitle>Powtórki na dziś · {due.length}</SectionTitle>
              <ul className="divide-y divide-line">
                {due.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 py-2.5">
                    <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setEditing(t)}>
                      <span className="block truncate text-sm">{t.title}</span>
                      <span className="block text-[12px] text-muted">{t.section} · {t.nextReview === today ? "dziś" : `od ${fmtDate(t.nextReview!, { day: "numeric", month: "short" })}`}</span>
                    </button>
                    <Button size="sm" onClick={() => { completeReview(t.id); toast("Powtórka zaliczona. Kolejna zaplanowana.", "success"); }}><RotateCw size={13} /> Zrobione</Button>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card>
            <SectionTitle action={<Button size="sm" onClick={() => setEditing("new")}><Plus size={14} /> Temat</Button>}>Działy i tematy</SectionTitle>
            {topics.length === 0 ? (
              <Empty title="Brak tematów" hint="Dodaj pierwszy temat, żeby śledzić postęp i powtórki." />
            ) : (
              <ul className="-mx-2">
                {sections.map((section) => {
                  const list = topics.filter((t) => t.section === section);
                  const mastery = Math.round(list.reduce((a, t) => a + t.mastery, 0) / list.length);
                  const isOpen = open === section;
                  return (
                    <li key={section}>
                      <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : section)} className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left hover:bg-surface-2/70">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{section}</span>
                          <span className="mt-1.5 block"><Bar value={mastery} label={`Opanowanie działu ${section}`} /></span>
                        </span>
                        <span className="tabular w-9 text-right text-[12px] text-muted">{mastery}%</span>
                        <ChevronDown size={15} className={cx("shrink-0 text-muted transition-transform", isOpen && "rotate-180")} />
                      </button>
                      {isOpen && (
                        <ul className="mb-2 ml-2 border-l border-line pl-2">
                          {list.map((t) => (
                            <li key={t.id} className="flex items-center gap-1">
                              <button type="button" onClick={() => setEditing(t)} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-surface-2/70">
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-[13px]">{t.title}</span>
                                  <span className="block text-[11px] text-muted">{STATUS_LABEL[t.status]} · {t.mastery}%{t.tasksDone ? ` · ${t.tasksDone} zad.` : ""}</span>
                                </span>
                              </button>
                              <IconButton label={`Rozpocznij sesję: ${t.title}`} onClick={() => openStarter({ category: subject, topicId: t.id, goal: t.title })}><Play size={14} /></IconButton>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-4 lg:col-span-2">
          {weak.length > 0 && (
            <Card>
              <SectionTitle>Słabe punkty</SectionTitle>
              <ul className="space-y-2">
                {weak.map((t) => (
                  <li key={t.id}>
                    <button type="button" onClick={() => openStarter({ category: subject, topicId: t.id, goal: t.title })} className="flex w-full items-center justify-between gap-3 text-left text-[13px]">
                      <span className="truncate">{t.title}</span><Pill>{t.mastery}%</Pill>
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          <Card>
            <SectionTitle action={<Button size="sm" onClick={() => setTestForm(true)}><Plus size={14} /> Wynik</Button>}>Testy i arkusze</SectionTitle>
            {tests.length === 0 ? (
              <p className="text-[13px] leading-relaxed text-muted">Po każdym próbnym arkuszu zapisz wynik. Trend mówi więcej niż pojedynczy rezultat.</p>
            ) : (
              <ul className="divide-y divide-line">
                {tests.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 py-2">
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm">{t.title}</span><span className="block text-[12px] text-muted">{fmtDate(t.date, { day: "numeric", month: "short", year: "numeric" })}</span></span>
                    <span className="tabular text-sm font-semibold">{t.scorePct}%</span>
                    <IconButton label="Usuń wynik" onClick={() => deleteTest(t.id)}><Trash2 size={14} /></IconButton>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <SectionTitle>Ostatnie sesje</SectionTitle>
            {sessions.length === 0 ? (
              <p className="text-[13px] leading-relaxed text-muted">Brak sesji. Uruchom pierwszą — wystarczy 25 minut.</p>
            ) : (
              <ul className="divide-y divide-line">
                {sessions.map((s) => (
                  <li key={s.id} className="flex items-start gap-3 py-2.5">
                    <span className="min-w-0 flex-1">
                      <span className="tabular block text-sm">{s.minutes} min · {fmtDate(s.date, { day: "numeric", month: "short" })}</span>
                      {(s.goal || s.did) && <span className="block truncate text-[12px] text-muted">{s.did || s.goal}</span>}
                      {s.hard && <span className="block truncate text-[12px] text-muted">Trudne: {s.hard}</span>}
                      {s.next && <span className="block truncate text-[12px] text-muted">Dalej: {s.next}</span>}
                    </span>
                    <IconButton label="Usuń sesję" onClick={() => deleteFocusSession(s.id)}><Trash2 size={14} /></IconButton>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <p className="px-1 text-[12px] leading-relaxed text-muted">
            Powtórki: dzień po pierwszej nauce, potem po 3, 7, 14 i 30 dniach. To pomoc organizacyjna, nie pomiar wiedzy — termin zawsze możesz zmienić ręcznie.
          </p>
        </div>
      </div>

      {editing && <TopicEditor topic={editing === "new" ? null : editing} subject={subject} onClose={() => setEditing(null)} />}
      {testForm && <TestForm subject={subject} onClose={() => setTestForm(false)} />}
    </div>
  );
}
