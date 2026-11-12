"use client";

import { Plus, Search, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { TaskForm } from "@/components/tasks/task-form";
import { Button, Card, Check, Confirm, cx, Empty, Field, IconButton, Input, Modal, PageHeader, Pill, SectionTitle, Segmented, Select, Textarea } from "@/components/ui/kit";
import { addTransaction, deleteClient, deleteProject, deleteTransaction, saveClient, saveProject, toggleTask } from "@/lib/actions";
import { clientSchema, projectSchema, STAGES, transactionSchema, type Client, type Project, type Stage } from "@/lib/schema";
import { toast, useData } from "@/lib/store";
import { addDays, dateKey, fmtDate, fmtMoney, uid, weekDays } from "@/lib/time";

const STAGE_LABEL: Record<Stage, string> = { lead: "Nowy lead", contact: "Kontakt", call: "Rozmowa", offer: "Oferta", negotiation: "Negocjacje", won: "Wygrany", lost: "Przegrany" };
const STAGE_PROBABILITY: Record<Stage, number> = { lead: 10, contact: 20, call: 35, offer: 50, negotiation: 70, won: 100, lost: 0 };
const PAYMENT_LABEL: Record<Project["payment"], string> = { unpaid: "Nieopłacony", partial: "Częściowo", paid: "Opłacony" };
const PROJECT_STATUS: Record<Project["status"], string> = { planned: "Planowany", active: "W realizacji", done: "Zakończony" };
const isOpen = (c: Client) => c.stage !== "won" && c.stage !== "lost";
const short = (d: string) => fmtDate(d, { day: "numeric", month: "short" });
const firstError = (issues: { message: string }[]) => issues[0]?.message ?? "Sprawdź dane.";

function ClientEditor({ client, onClose }: { client: Client | null; onClose: () => void }) {
  const [c, setC] = useState<Client>(
    () => client ?? { id: uid(), company: "", contact: "", email: "", phone: "", stage: "lead", value: 0, probability: 10, notes: "", createdAt: Date.now() },
  );
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [taskForm, setTaskForm] = useState(false);
  const tasks = useData((d) => d.tasks.filter((t) => t.clientId === c.id));
  const set = <K extends keyof Client>(k: K, v: Client[K]) => setC((p) => ({ ...p, [k]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = clientSchema.safeParse({ ...c, company: c.company.trim(), email: c.email.trim(), followUp: c.followUp || undefined });
    if (!parsed.success) return setError(firstError(parsed.error.issues));
    saveClient(parsed.data);
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={client ? c.company : "Nowy lead"} wide>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Firma" error={error}><Input autoFocus={!client} value={c.company} onChange={(e) => set("company", e.target.value)} maxLength={120} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Osoba kontaktowa"><Input value={c.contact} onChange={(e) => set("contact", e.target.value)} maxLength={120} /></Field>
          <Field label="Telefon"><Input type="tel" value={c.phone} onChange={(e) => set("phone", e.target.value)} maxLength={40} /></Field>
        </div>
        <Field label="E-mail"><Input type="email" value={c.email} onChange={(e) => set("email", e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Etap">
            <Select value={c.stage} onChange={(e) => { const stage = e.target.value as Stage; setC((p) => ({ ...p, stage, probability: STAGE_PROBABILITY[stage] })); }}>
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
            </Select>
          </Field>
          <Field label="Follow-up"><Input type="date" value={c.followUp ?? ""} onChange={(e) => set("followUp", e.target.value || undefined)} /></Field>
          <Field label="Wartość projektu (zł)"><Input type="number" inputMode="numeric" min={0} value={c.value || ""} onChange={(e) => set("value", Math.max(0, Number(e.target.value) || 0))} /></Field>
          <Field label="Prawdopodobieństwo (%)"><Input type="number" inputMode="numeric" min={0} max={100} value={c.probability} onChange={(e) => set("probability", Math.min(100, Math.max(0, Number(e.target.value) || 0)))} /></Field>
        </div>
        <Field label="Notatki"><Textarea value={c.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Potrzeby klienta, ustalenia, następny krok" maxLength={4000} /></Field>
        {client && (
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[12px] font-medium text-muted">Zadania dla klienta</span>
              <Button variant="ghost" size="sm" onClick={() => setTaskForm(true)}><Plus size={13} /> Zadanie</Button>
            </div>
            {tasks.length === 0 ? <p className="text-[13px] text-muted">Brak zadań.</p> : (
              <ul className="space-y-2">
                {tasks.map((t) => (
                  <li key={t.id} className="flex items-center gap-3">
                    <Check label={t.title} checked={t.status === "done"} onChange={() => toggleTask(t.id)} />
                    <span className={cx("text-sm", t.status === "done" && "text-muted line-through")}>{t.title}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <div className="flex gap-2">
          {client && <Button variant="danger" onClick={() => setConfirm(true)}>Usuń</Button>}
          <Button type="submit" variant="primary" className="flex-1">Zapisz</Button>
        </div>
      </form>
      <Confirm open={confirm} onClose={() => setConfirm(false)} onConfirm={() => { deleteClient(c.id); onClose(); }} title="Usunąć klienta?" body="Zadania i projekty zostaną, ale stracą powiązanie z tym klientem." />
      <Modal open={taskForm} onClose={() => setTaskForm(false)} title="Zadanie dla klienta">
        {taskForm && <TaskForm preset={{ category: "aiven", clientId: c.id }} onDone={() => setTaskForm(false)} />}
      </Modal>
    </Modal>
  );
}

function ProjectEditor({ project, onClose }: { project: Project | null; onClose: () => void }) {
  const clients = useData((d) => d.clients);
  const [p, setP] = useState<Project>(() => project ?? { id: uid(), name: "", status: "active", price: 0, payment: "unpaid" });
  const [error, setError] = useState("");
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = projectSchema.safeParse({ ...p, name: p.name.trim(), deadline: p.deadline || undefined, clientId: p.clientId || undefined });
    if (!parsed.success) return setError(firstError(parsed.error.issues));
    saveProject(parsed.data);
    onClose();
  };
  return (
    <Modal open onClose={onClose} title={project ? "Projekt" : "Nowy projekt"}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Nazwa" error={error}><Input autoFocus={!project} value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} maxLength={120} placeholder="np. Strona dla salonu X" /></Field>
        <Field label="Klient">
          <Select value={p.clientId ?? ""} onChange={(e) => setP({ ...p, clientId: e.target.value || undefined })}>
            <option value="">— bez klienta —</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.company}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Termin"><Input type="date" value={p.deadline ?? ""} onChange={(e) => setP({ ...p, deadline: e.target.value || undefined })} /></Field>
          <Field label="Cena (zł)"><Input type="number" inputMode="numeric" min={0} value={p.price || ""} onChange={(e) => setP({ ...p, price: Math.max(0, Number(e.target.value) || 0) })} /></Field>
          <Field label="Status">
            <Select value={p.status} onChange={(e) => setP({ ...p, status: e.target.value as Project["status"] })}>
              {Object.entries(PROJECT_STATUS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <Field label="Płatność">
            <Select value={p.payment} onChange={(e) => setP({ ...p, payment: e.target.value as Project["payment"] })}>
              {Object.entries(PAYMENT_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>
        <p className="text-[12px] leading-relaxed text-muted">Status płatności to informacja. Faktyczny wpływ zaksięguj osobno w zakładce Finanse — tylko to liczy się jako przychód.</p>
        <div className="flex gap-2">
          {project && <Button variant="danger" onClick={() => { deleteProject(p.id); onClose(); }}>Usuń</Button>}
          <Button type="submit" variant="primary" className="flex-1">Zapisz</Button>
        </div>
      </form>
    </Modal>
  );
}

function TransactionForm({ onClose }: { onClose: () => void }) {
  const [t, setT] = useState({ type: "income" as "income" | "cost", amount: "", label: "", date: dateKey() });
  const [error, setError] = useState("");
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = transactionSchema.omit({ id: true }).safeParse({ ...t, label: t.label.trim(), amount: Number(t.amount) });
    if (!parsed.success) return setError(firstError(parsed.error.issues));
    addTransaction(parsed.data);
    toast(t.type === "income" ? "Przychód zaksięgowany." : "Koszt zapisany.", "success");
    onClose();
  };
  return (
    <Modal open onClose={onClose} title="Nowy wpis" description="Tylko pieniądze, które faktycznie wpłynęły lub zostały wydane.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Segmented label="Rodzaj wpisu" value={t.type} onChange={(type) => setT({ ...t, type })} options={[{ value: "income", label: "Przychód" }, { value: "cost", label: "Koszt" }]} />
        <Field label="Opis" error={error}><Input autoFocus value={t.label} onChange={(e) => setT({ ...t, label: e.target.value })} placeholder="np. Zaliczka — strona dla X" maxLength={120} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Kwota (zł)"><Input type="number" inputMode="decimal" min={0} step="0.01" value={t.amount} onChange={(e) => setT({ ...t, amount: e.target.value })} /></Field>
          <Field label="Data"><Input type="date" value={t.date} onChange={(e) => e.target.value && setT({ ...t, date: e.target.value })} /></Field>
        </div>
        <Button type="submit" variant="primary" className="w-full">Zapisz</Button>
      </form>
    </Modal>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="text-[12px] text-muted">{label}</p>
      <p className="tabular mt-1 text-xl font-semibold tracking-tight">{value}</p>
      <p className="mt-0.5 text-[11px] text-muted">{hint}</p>
    </div>
  );
}

type Tab = "overview" | "clients" | "projects" | "finance";

export default function AivenPage() {
  const today = dateKey();
  const month = today.slice(0, 7);
  const clients = useData((d) => d.clients);
  const projects = useData((d) => d.projects);
  const transactions = useData((d) => [...d.transactions].sort((a, b) => b.date.localeCompare(a.date)));
  const [tab, setTab] = useState<Tab>("overview");
  const [query, setQuery] = useState("");
  const [client, setClient] = useState<Client | "new" | null>(null);
  const [project, setProject] = useState<Project | "new" | null>(null);
  const [txForm, setTxForm] = useState(false);

  const open = clients.filter(isOpen);
  const potential = open.reduce((a, c) => a + c.value, 0);
  const weighted = open.reduce((a, c) => a + (c.value * c.probability) / 100, 0);
  const sum = (type: "income" | "cost", prefix = "") => transactions.filter((t) => t.type === type && t.date.startsWith(prefix)).reduce((a, t) => a + t.amount, 0);
  const followUps = open.filter((c) => c.followUp && c.followUp <= today);
  const week = weekDays(today);
  const dueProjects = projects.filter((p) => p.status !== "done" && p.deadline && p.deadline <= week[6]);
  const offers = clients.filter((c) => c.stage === "offer" || c.stage === "negotiation");
  const name = (id?: string) => clients.find((c) => c.id === id)?.company;
  const q = query.trim().toLowerCase();
  const filtered = clients.filter((c) => !q || `${c.company} ${c.contact} ${c.email}`.toLowerCase().includes(q));

  const clientRow = (c: Client) => (
    <li key={c.id}>
      <button type="button" onClick={() => setClient(c)} className="flex w-full items-center gap-3 py-3 text-left">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{c.company}</span>
          <span className="block truncate text-[12px] text-muted">
            {STAGE_LABEL[c.stage]}{c.contact && ` · ${c.contact}`}{c.followUp && isOpen(c) && ` · follow-up ${c.followUp === today ? "dziś" : short(c.followUp)}`}
          </span>
        </span>
        {c.value > 0 && <span className="tabular shrink-0 text-[13px] text-muted">{fmtMoney(c.value)}</span>}
      </button>
    </li>
  );

  return (
    <div>
      <PageHeader title="Aiven" subtitle="Klienci, projekty i pieniądze — bez zbędnego CRM-u." action={<Button variant="primary" onClick={() => setClient("new")}><Plus size={16} /> Lead</Button>} />
      <div className="mb-4">
        <Segmented label="Widok" value={tab} onChange={setTab} options={[{ value: "overview", label: "Przegląd" }, { value: "clients", label: "Klienci" }, { value: "projects", label: "Projekty" }, { value: "finance", label: "Finanse" }]} />
      </div>

      {tab === "overview" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <Stat label="Przychód zrealizowany" value={fmtMoney(sum("income", month))} hint={`ten miesiąc · łącznie ${fmtMoney(sum("income"))}`} />
            <Stat label="Wartość potencjalna" value={fmtMoney(potential)} hint={`ważona szansą: ${fmtMoney(weighted)}`} />
          </div>
          <p className="px-1 text-[12px] text-muted">Potencjał to niepodpisane rozmowy. Do przychodu liczą się wyłącznie zaksięgowane wpływy.</p>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <SectionTitle>Dzisiejsze follow-upy · {followUps.length}</SectionTitle>
              {followUps.length === 0 ? <p className="text-[13px] text-muted">Nic zaległego. Ustaw termin follow-upu przy każdym otwartym leadzie.</p> : (
                <ul className="divide-y divide-line">
                  {followUps.map((c) => (
                    <li key={c.id} className="flex items-center gap-2 py-2">
                      <button type="button" onClick={() => setClient(c)} className="min-w-0 flex-1 text-left">
                        <span className="block truncate text-sm">{c.company}</span>
                        <span className="block text-[12px] text-muted">{c.followUp === today ? "dziś" : `zaległe od ${short(c.followUp!)}`}</span>
                      </button>
                      <Button size="sm" onClick={() => { saveClient({ ...c, followUp: addDays(today, 3) }); toast("Follow-up odnotowany. Następny za 3 dni."); }}>Zrobione</Button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card>
              <SectionTitle>Terminy w tym tygodniu · {dueProjects.length}</SectionTitle>
              {dueProjects.length === 0 ? <p className="text-[13px] text-muted">Żaden projekt nie ma terminu w tym tygodniu.</p> : (
                <ul className="divide-y divide-line">
                  {dueProjects.map((p) => (
                    <li key={p.id}>
                      <button type="button" onClick={() => setProject(p)} className="flex w-full items-center justify-between gap-3 py-2 text-left">
                        <span className="truncate text-sm">{p.name}</span>
                        <Pill tone={p.deadline! < today ? "danger" : "default"}>{short(p.deadline!)}</Pill>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card>
              <SectionTitle>Oferty czekające · {offers.length}</SectionTitle>
              {offers.length === 0 ? <p className="text-[13px] text-muted">Brak wysłanych ofert. Najpierw dowieź wartość w rozmowie, potem wyślij ofertę.</p> : (
                <ul className="divide-y divide-line">{offers.map(clientRow)}</ul>
              )}
            </Card>
          </div>
        </div>
      )}

      {tab === "clients" && (
        <Card>
          {clients.length === 0 ? (
            <Empty icon={<Users size={22} />} title="Brak leadów" hint="Dodaj pierwszą firmę, z którą chcesz porozmawiać. Wystarczy nazwa i termin follow-upu." action={<Button onClick={() => setClient("new")}><Plus size={15} /> Dodaj lead</Button>} />
          ) : (
            <>
              <div className="relative mb-2">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Szukaj klienta" aria-label="Szukaj klienta" className="pl-9" />
              </div>
              {filtered.length === 0 ? <p className="py-6 text-center text-[13px] text-muted">Nikt nie pasuje do „{query}”.</p> : (
                STAGES.filter((s) => filtered.some((c) => c.stage === s)).map((s) => (
                  <div key={s} className="mt-4">
                    <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">{STAGE_LABEL[s]}</p>
                    <ul className="divide-y divide-line">{filtered.filter((c) => c.stage === s).map(clientRow)}</ul>
                  </div>
                ))
              )}
            </>
          )}
        </Card>
      )}

      {tab === "projects" && (
        <Card>
          <SectionTitle action={<Button size="sm" onClick={() => setProject("new")}><Plus size={14} /> Projekt</Button>}>Projekty</SectionTitle>
          {projects.length === 0 ? (
            <Empty title="Brak projektów" hint="Gdy klient powie „tak”, załóż projekt z terminem i ceną." action={<Button onClick={() => setProject("new")}><Plus size={15} /> Dodaj projekt</Button>} />
          ) : (
            <ul className="divide-y divide-line">
              {projects.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => setProject(p)} className="flex w-full items-center gap-3 py-3 text-left">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{p.name}</span>
                      <span className="block truncate text-[12px] text-muted">{[name(p.clientId), PROJECT_STATUS[p.status], p.deadline && `termin ${short(p.deadline)}`].filter(Boolean).join(" · ")}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="tabular block text-[13px]">{fmtMoney(p.price)}</span>
                      <span className={cx("block text-[11px]", p.payment === "paid" ? "text-accent" : "text-muted")}>{PAYMENT_LABEL[p.payment]}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {tab === "finance" && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <Stat label="Przychód" value={fmtMoney(sum("income", month))} hint="ten miesiąc" />
            <Stat label="Koszty" value={fmtMoney(sum("cost", month))} hint="ten miesiąc" />
            <Stat label="Wynik" value={fmtMoney(sum("income", month) - sum("cost", month))} hint={fmtDate(today, { month: "long", year: "numeric" })} />
          </div>
          <Card>
            <SectionTitle action={<Button size="sm" onClick={() => setTxForm(true)}><Plus size={14} /> Wpis</Button>}>Przychody i koszty</SectionTitle>
            {transactions.length === 0 ? (
              <Empty title="Brak wpisów" hint="Zapisuj tylko faktyczne wpływy i wydatki. Dzięki temu miesięczny wynik jest prawdziwy." action={<Button onClick={() => setTxForm(true)}><Plus size={15} /> Dodaj wpis</Button>} />
            ) : (
              <ul className="divide-y divide-line">
                {transactions.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 py-2">
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm">{t.label}</span><span className="block text-[12px] text-muted">{fmtDate(t.date, { day: "numeric", month: "short", year: "numeric" })}</span></span>
                    <span className={cx("tabular shrink-0 text-sm font-medium", t.type === "income" ? "text-accent" : "text-muted")}>{t.type === "income" ? "+" : "−"}{fmtMoney(t.amount)}</span>
                    <IconButton label="Usuń wpis" onClick={() => deleteTransaction(t.id)}><Trash2 size={14} /></IconButton>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      {client && <ClientEditor client={client === "new" ? null : client} onClose={() => setClient(null)} />}
      {project && <ProjectEditor project={project === "new" ? null : project} onClose={() => setProject(null)} />}
      {txForm && <TransactionForm onClose={() => setTxForm(false)} />}
    </div>
  );
}
