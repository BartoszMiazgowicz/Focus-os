"use client";

import { Gamepad2, Plus, Square, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Bar, Button, Card, Check, cx, Empty, Field, IconButton, Input, Modal, PageHeader, Ring, SectionTitle } from "@/components/ui/kit";
import { addGameSession, deleteGameSession, endGame, skipGaming, startGame, toggleTask } from "@/lib/actions";
import { useNow } from "@/lib/hooks";
import { gamingMinutes, gamingWeekMinutes, isGamingDay, pinnedTasks, plannedGamingMinutes } from "@/lib/logic";
import { toast, useData } from "@/lib/store";
import { dateKey, DAY_SHORT, dow, fmtClock, fmtDate, fmtDur, toMin, weekDays } from "@/lib/time";

const clock = (ts: number) => new Date(ts).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
const PAUSE_SECONDS = 10;

/** "Nie wciągaj mnie": a short pause and one honest question before a session starts. */
function Gate({ date, onClose }: { date: string; onClose: () => void }) {
  const g = useData((d) => d.settings.gaming);
  const planned = useData((d) => isGamingDay(d, date));
  const used = useData((d) => gamingMinutes(d, date));
  const priorities = useData((d) => pinnedTasks(d, date));
  const [opened] = useState(() => Date.now());
  const now = useNow(250);
  const [offPlan, setOffPlan] = useState(30);

  const wait = Math.max(0, PAUSE_SECONDS - Math.floor((now.getTime() - opened) / 1000));
  const m = now.getHours() * 60 + now.getMinutes();
  const left = Math.max(0, g.dailyLimitMin - used);
  const inWindow = planned && m >= toMin(g.start) - 10 && m < toMin(g.end) && left > 0;
  const minutes = inWindow ? Math.min(left, toMin(g.end) - m) : offPlan;
  const end = now.getTime() + minutes * 60000;
  const open = priorities.filter((t) => t.status !== "done");

  return (
    <Modal open onClose={onClose} title="Zanim zaczniesz" description="Krótka pauza. Decyzja należy do Ciebie.">
      <div className="space-y-5">
        <div>
          <p className="text-sm font-medium">Czy wykonałem dzisiejsze 3 priorytety?</p>
          {priorities.length === 0 ? (
            <p className="mt-2 text-[13px] text-muted">Nie masz dziś przypiętych priorytetów — odpowiedz sobie uczciwie.</p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {priorities.map((t) => (
                <li key={t.id} className="flex items-center gap-3">
                  <Check label={t.title} checked={t.status === "done"} onChange={() => toggleTask(t.id)} />
                  <span className={cx("text-sm", t.status === "done" && "text-muted line-through")}>{t.title}</span>
                </li>
              ))}
            </ul>
          )}
          {open.length > 0 && <p className="mt-3 text-[13px] text-muted">Otwarte: {open.length}. Możesz zagrać mimo to — po prostu zdecyduj świadomie.</p>}
        </div>

        {inWindow ? (
          <div className="rounded-2xl border border-line p-4">
            <p className="text-[12px] text-muted">Sesja skończy się o</p>
            <p className="tabular mt-1 font-mono text-3xl font-light">{clock(end)}</p>
            <p className="mt-1 text-[13px] text-muted">{fmtDur(minutes)} · przypomnienie {g.warnMin} min przed końcem</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-line p-4">
            <p className="text-sm font-medium">{!planned ? "Dziś nie ma zaplanowanego grania." : left <= 0 ? "Dzisiejszy limit jest już wykorzystany." : `Zaplanowane okno to ${g.start}–${g.end}.`}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">Możesz zapisać sesję poza planem — policzy się do tygodniowego limitu. Wybierz z góry, ile ma trwać:</p>
            <div className="mt-3 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Długość sesji poza planem">
              {[30, 60, 90].map((n) => (
                <button key={n} type="button" role="radio" aria-checked={offPlan === n} onClick={() => setOffPlan(n)} className={cx("h-11 rounded-xl border text-sm font-medium", offPlan === n ? "border-accent bg-accent/[0.07]" : "border-line text-muted")}>
                  {n} min
                </button>
              ))}
            </div>
            <p className="tabular mt-3 text-[13px] text-muted">Koniec o {clock(end)}</p>
          </div>
        )}

        <div className="space-y-2">
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            disabled={wait > 0}
            onClick={() => {
              startGame(end, inWindow);
              onClose();
            }}
          >
            {wait > 0 ? `Oddech… ${wait}` : inWindow ? "Rozpocznij zaplanowaną sesję" : "Rozpocznij sesję poza planem"}
          </Button>
          <Button
            size="lg"
            className="w-full"
            onClick={() => {
              skipGaming(date);
              toast("Dzisiaj odpuszczasz. Wieczór jest Twój.", "success");
              onClose();
            }}
          >
            Dzisiaj odpuszczam
          </Button>
        </div>
      </div>
    </Modal>
  );
}

interface Summary {
  minutes: number;
  dayTotal: number;
  limit: number;
}

function EndScreen({ summary, onClose }: { summary: Summary; onClose: () => void }) {
  const over = summary.dayTotal - summary.limit;
  const within = over <= 2;
  return (
    <Modal open onClose={onClose} title={within ? "Kończę zgodnie z planem" : "Sesja zakończona"}>
      <div className="space-y-4">
        <dl className="grid grid-cols-2 gap-2">
          {[["Ta sesja", fmtDur(summary.minutes)], ["Dziś łącznie", `${fmtDur(summary.dayTotal)} / ${fmtDur(summary.limit)}`]].map(([l, v]) => (
            <div key={l} className="rounded-2xl border border-line p-3.5">
              <dt className="text-[12px] text-muted">{l}</dt>
              <dd className="tabular mt-1 text-lg font-semibold tracking-tight">{v}</dd>
            </div>
          ))}
        </dl>
        {within ? (
          <p className="text-sm leading-relaxed text-muted">Zagrałeś tyle, ile zaplanowałeś. Teraz kolacja, spokojny czas i rutyna wieczorna o 22:00.</p>
        ) : (
          <div className="space-y-2 text-sm leading-relaxed text-muted">
            <p>Dziś wyszło {fmtDur(over)} ponad plan{summary.limit === 0 ? " (dzień bez zaplanowanego grania)" : ""}. To informacja, nie wyrok.</p>
            <p><span className="text-fg">Korekta na następny raz:</span> ostatnią rozgrywkę zacznij najpóźniej 30 minut przed końcem okna i zakończ sesję od razu po przypomnieniu.</p>
          </div>
        )}
        <Button variant="primary" size="lg" className="w-full" onClick={onClose}>Zamykam</Button>
      </div>
    </Modal>
  );
}

function ManualEntry({ onClose }: { onClose: () => void }) {
  const [date, setDate] = useState(dateKey());
  const [minutes, setMinutes] = useState("");
  const [error, setError] = useState("");
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(minutes);
    if (!date || date > dateKey()) return setError("Wybierz dzisiejszą lub wcześniejszą datę.");
    if (!Number.isFinite(n) || n < 1 || n > 1440) return setError("Podaj czas w minutach (1–1440).");
    addGameSession(date, Math.round(n));
    onClose();
  };
  return (
    <Modal open onClose={onClose} title="Dodaj sesję ręcznie" description="Jeśli grałeś bez timera — wpisz to uczciwie. Dziennik działa tylko wtedy, gdy jest prawdziwy.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data"><Input type="date" value={date} max={dateKey()} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Czas (min)"><Input autoFocus type="number" inputMode="numeric" min={1} value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="90" /></Field>
        </div>
        {error && <p role="alert" className="text-[12px] text-danger">{error}</p>}
        <Button type="submit" variant="primary" className="w-full">Zapisz</Button>
      </form>
    </Modal>
  );
}

export default function GamingPage() {
  const now = useNow(1000);
  const date = dateKey(now);
  const g = useData((d) => d.settings.gaming);
  const active = useData((d) => d.activeGame);
  const planned = useData((d) => isGamingDay(d, date));
  const today = useData((d) => gamingMinutes(d, date, now.getTime()));
  const week = useData((d) => gamingWeekMinutes(d, date, now.getTime()));
  const skipped = useData((d) => d.gameSkips.includes(date));
  const sessions = useData((d) => [...d.gameSessions].sort((a, b) => b.startedAt - a.startedAt).slice(0, 30));
  const days = weekDays(date);
  const perDay = useData((d) => days.map((day) => ({ day, planned: plannedGamingMinutes(d, day), actual: Math.round(gamingMinutes(d, day)) })));

  const [gate, setGate] = useState(false);
  const [manual, setManual] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);

  const limit = planned ? g.dailyLimitMin : 0;
  const elapsed = active ? (now.getTime() - active.startedAt) / 1000 : 0;
  const left = active ? (active.plannedEnd - now.getTime()) / 1000 : 0;
  const scale = Math.max(g.dailyLimitMin, ...perDay.map((p) => p.actual), 1);
  const plannedWeek = perDay.reduce((a, p) => a + p.planned, 0);

  useEffect(() => {
    document.title = active ? `${fmtClock(Math.max(0, left))} · Gry` : "FOCUS OS";
    return () => void (document.title = "FOCUS OS");
  }, [active, left]);

  const stop = () => {
    const minutes = endGame();
    setSummary({ minutes, dayTotal: Math.round(today), limit });
  };

  return (
    <div>
      <PageHeader title="Gaming Control" subtitle={planned ? `Dziś: ${g.start}–${g.end} · do ${fmtDur(g.dailyLimitMin)}` : "Dziś bez zaplanowanego grania"} />

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          {active ? (
            <div className="rounded-3xl border border-line bg-surface p-6 text-center sm:p-8">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-accent">{active.planned ? "Zaplanowana sesja" : "Sesja poza planem"}</p>
              <p className="tabular mt-4 font-mono text-6xl font-light tracking-tight">{fmtClock(elapsed)}</p>
              <p className="tabular mt-3 text-sm text-muted">
                {left > 0 ? <>Zostało <span className="text-fg">{fmtClock(left)}</span> · koniec o {clock(active.plannedEnd)}</> : <>Planowany koniec był o {clock(active.plannedEnd)} — {fmtDur(-left / 60)} temu</>}
              </p>
              <div className="mx-auto mt-5 max-w-sm">
                <Bar value={elapsed} max={(active.plannedEnd - active.startedAt) / 1000} over={left <= 0} label="Postęp sesji" />
              </div>
              {left > 0 && left <= g.warnMin * 60 && <p className="mt-4 text-sm">Końcówka. Dokończ to, co robisz, i zamknij sesję.</p>}
              {left <= 0 && <p className="mt-4 text-sm">Czas minął. Zamknij sesję, kiedy skończysz bieżącą rozgrywkę.</p>}
              <Button variant="primary" size="lg" className="mt-6 w-full sm:w-auto sm:min-w-56" onClick={stop}><Square size={15} /> Zakończ sesję</Button>
            </div>
          ) : (
            <div className="rounded-3xl border border-line bg-surface p-6 sm:p-8">
              <div className="flex items-center gap-5">
                <Ring value={limit ? today / limit : today > 0 ? 1 : 0} size={96} stroke={7}>
                  <Gamepad2 size={22} className="text-muted" />
                </Ring>
                <div>
                  <p className="text-[12px] text-muted">Dziś wykorzystane</p>
                  <p className="tabular text-3xl font-semibold tracking-tight">{fmtDur(today)}</p>
                  <p className="tabular mt-0.5 text-[13px] text-muted">
                    {limit ? (today <= limit ? `zostało ${fmtDur(limit - today)} z ${fmtDur(limit)}` : `${fmtDur(today - limit)} ponad plan`) : "dzień bez zaplanowanego grania"}
                  </p>
                </div>
              </div>
              {skipped && today === 0 ? (
                <p className="mt-6 rounded-xl bg-surface-2/70 px-4 py-3 text-sm">Dzisiaj odpuszczasz. Dobra decyzja to też wynik.</p>
              ) : null}
              <Button variant="primary" size="lg" className="mt-6 w-full" onClick={() => setGate(true)}>Rozpocznij sesję</Button>
              <p className="mt-3 text-center text-[12px] text-muted">Przed startem zobaczysz krótką pauzę i godzinę końca.</p>
            </div>
          )}

          <Card>
            <SectionTitle action={<span className="tabular text-[12px] text-muted">{fmtDur(week)} / {fmtDur(g.weeklyLimitMin)}</span>}>Tydzień — plan a rzeczywistość</SectionTitle>
            <Bar value={week} max={g.weeklyLimitMin} over={week > g.weeklyLimitMin} label="Wykorzystany tygodniowy limit grania" />
            <div className="mt-5 grid grid-cols-7 gap-2" role="img" aria-label={`Planowany czas ${fmtDur(plannedWeek)}, rzeczywisty ${fmtDur(week)}`}>
              {perDay.map((p) => (
                <div key={p.day} className="flex flex-col items-center gap-2">
                  <div className="flex h-24 items-end gap-1">
                    <div className="w-2.5 rounded-full bg-line" style={{ height: `${Math.max(2, (p.planned / scale) * 100)}%` }} />
                    <div className={cx("w-2.5 rounded-full", p.actual > p.planned ? "bg-danger" : "bg-accent")} style={{ height: `${Math.max(2, (p.actual / scale) * 100)}%` }} />
                  </div>
                  <span className={cx("text-[11px]", p.day === date ? "font-medium text-accent" : "text-muted")}>{DAY_SHORT[dow(p.day)]}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-4 text-[11px] text-muted">
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-line" /> plan {fmtDur(plannedWeek)}</span>
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-accent" /> rzeczywistość {fmtDur(week)}</span>
            </div>
          </Card>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <Card>
            <SectionTitle action={<Button size="sm" onClick={() => setManual(true)}><Plus size={14} /> Ręcznie</Button>}>Dziennik</SectionTitle>
            {sessions.length === 0 ? (
              <Empty title="Dziennik jest pusty" hint="Uruchom timer przed graniem albo dopisz sesję ręcznie. Tu zobaczysz, jak plan ma się do rzeczywistości." />
            ) : (
              <ul className="divide-y divide-line">
                {sessions.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="tabular text-sm">{fmtDur(s.minutes)}</p>
                      <p className="text-[12px] text-muted">{fmtDate(s.date, { weekday: "short", day: "numeric", month: "short" })} · {s.planned ? "w planie" : "poza planem"}</p>
                    </div>
                    <IconButton label="Usuń wpis" onClick={() => deleteGameSession(s.id)}><Trash2 size={15} /></IconButton>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <p className="px-1 text-[12px] leading-relaxed text-muted">
            FOCUS OS nie wykrywa gier automatycznie i niczego nie blokuje — liczy tylko to, co uruchomisz timerem albo wpiszesz. Limity zmienisz w Settings.
          </p>
        </div>
      </div>

      {gate && <Gate date={date} onClose={() => setGate(false)} />}
      {manual && <ManualEntry onClose={() => setManual(false)} />}
      {summary && <EndScreen summary={summary} onClose={() => setSummary(null)} />}
    </div>
  );
}
