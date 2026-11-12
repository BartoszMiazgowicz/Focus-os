"use client";

import { Maximize2, Minimize2, Pause, Play, Timer } from "lucide-react";
import { useEffect, useState } from "react";
import { cancelTimer, finishTimer, pauseTimer, resumeTimer, startTimer, timerRemainingMs } from "@/lib/actions";
import { CATEGORIES, FOCUS_CATEGORIES, type CategoryId } from "@/lib/categories";
import { EGOS, pickLine } from "@/lib/egos";
import { useEgo, useNow } from "@/lib/hooks";
import { toast, useData } from "@/lib/store";
import { fmtClock } from "@/lib/time";
import { useUi } from "@/lib/ui";
import { Button, cx, Field, IconButton, Input, Modal, Ring, Select, Textarea } from "../ui/kit";

const PRESETS = [
  { id: "25", label: "25 / 5", focus: 25, rest: 5 },
  { id: "50", label: "50 / 10", focus: 50, rest: 10 },
  { id: "custom", label: "Własny", focus: 0, rest: 0 },
] as const;

/** Dialog that configures and starts a focus session. */
function Starter() {
  const prefill = useUi((s) => s.starter);
  return (
    <Modal open={prefill !== null} onClose={() => useUi.setState({ starter: null })} title="Sesja skupienia" description="Jedno zadanie, jeden cel. Reszta poczeka.">
      {prefill && <StarterForm key={JSON.stringify(prefill)} />}
    </Modal>
  );
}

function StarterForm() {
  const prefill = useUi((s) => s.starter) ?? {};
  const topics = useData((d) => d.topics);
  const [preset, setPreset] = useState<string>(prefill.focusMin ? "custom" : "25");
  const [focus, setFocus] = useState(String(prefill.focusMin ?? 40));
  const [rest, setRest] = useState(String(prefill.breakMin ?? 5));
  const [category, setCategory] = useState<CategoryId>(prefill.category ?? "math");
  const [topicId, setTopicId] = useState(prefill.topicId ?? "");
  const [goal, setGoal] = useState(prefill.goal ?? "");
  const [error, setError] = useState("");
  const subjectTopics = topics.filter((t) => t.subject === category);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = PRESETS.find((x) => x.id === preset)!;
    const focusMin = preset === "custom" ? Number(focus) : p.focus;
    const breakMin = preset === "custom" ? Number(rest) : p.rest;
    if (!Number.isFinite(focusMin) || focusMin < 5 || focusMin > 180) return setError("Czas skupienia: od 5 do 180 minut.");
    if (!Number.isFinite(breakMin) || breakMin < 0 || breakMin > 60) return setError("Przerwa: od 0 do 60 minut.");
    startTimer({ focusMin, breakMin, category, goal: goal.trim(), topicId: topicId || undefined, blockKey: prefill.blockKey });
    useUi.setState({ starter: null, timerMinimized: false });
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Długość sesji">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={preset === p.id}
            onClick={() => setPreset(p.id)}
            className={cx("h-12 rounded-xl border text-sm font-medium transition-colors", preset === p.id ? "border-accent bg-accent/[0.07] text-fg" : "border-line text-muted hover:text-fg")}
          >
            {p.label}
          </button>
        ))}
      </div>
      {preset === "custom" && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Skupienie (min)"><Input type="number" inputMode="numeric" min={5} max={180} value={focus} onChange={(e) => setFocus(e.target.value)} /></Field>
          <Field label="Przerwa (min)"><Input type="number" inputMode="numeric" min={0} max={60} value={rest} onChange={(e) => setRest(e.target.value)} /></Field>
        </div>
      )}
      <Field label="Obszar">
        <Select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value as CategoryId);
            setTopicId("");
          }}
        >
          {FOCUS_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORIES[c].label}</option>)}
        </Select>
      </Field>
      {subjectTopics.length > 0 && (
        <Field label="Temat (opcjonalnie)">
          <Select value={topicId} onChange={(e) => setTopicId(e.target.value)}>
            <option value="">— bez tematu —</option>
            {subjectTopics.map((t) => <option key={t.id} value={t.id}>{t.section}: {t.title}</option>)}
          </Select>
        </Field>
      )}
      <Field label="Cel sesji" error={error} hint="Konkret: co ma być zrobione, gdy timer się skończy?">
        <Input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="np. 6 zadań z równań z parametrem" maxLength={140} />
      </Field>
      <Button type="submit" variant="primary" size="lg" className="w-full"><Play size={16} /> Start</Button>
    </form>
  );
}

function Notes({ minutes, onSave }: { minutes: number; onSave: (n: { did: string; hard: string; next: string }) => void }) {
  const [n, setN] = useState({ did: "", hard: "", next: "" });
  const field = (k: keyof typeof n, label: string, placeholder: string) => (
    <Field label={label}>
      <Textarea rows={2} value={n[k]} onChange={(e) => setN({ ...n, [k]: e.target.value })} placeholder={placeholder} maxLength={400} />
    </Field>
  );
  return (
    <div className="w-full max-w-md space-y-4">
      <div className="text-center">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">Sesja zakończona</p>
        <p className="mt-2 text-3xl font-semibold tracking-tight">{minutes} min skupienia</p>
      </div>
      {field("did", "Co zrobiłem", "Jedno zdanie wystarczy")}
      {field("hard", "Co było trudne", "Temat, typ zadania, rozproszenie…")}
      {field("next", "Co dalej", "Pierwszy krok następnej sesji")}
      <Button variant="primary" size="lg" className="w-full" onClick={() => onSave(n)}>Zapisz sesję</Button>
    </div>
  );
}

/** Fullscreen focus mode. Hides navigation so the only thing on screen is the session. */
function Overlay() {
  const timer = useData((d) => d.activeTimer);
  const egoMessages = useData((d) => d.settings.egoMessages);
  const topic = useData((d) => d.topics.find((t) => t.id === d.activeTimer?.topicId));
  const minimized = useUi((s) => s.timerMinimized);
  const { ego } = useEgo();
  const now = useNow(500);
  const [ending, setEnding] = useState(false);
  const [breakEnd, setBreakEnd] = useState<number | null>(null);
  const [isFs, setIsFs] = useState(false);

  const running = Boolean(timer && timer.endsAt !== null);
  const remaining = timer ? timerRemainingMs(timer, now.getTime()) : 0;
  const finished = Boolean(timer) && remaining <= 0;
  const showNotes = Boolean(timer) && (finished || ending);

  // Keep the phone screen awake while the timer runs (where the browser supports it).
  useEffect(() => {
    if (!running || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | undefined;
    navigator.wakeLock.request("screen").then((l) => (lock = l)).catch(() => undefined);
    return () => void lock?.release().catch(() => undefined);
  }, [running]);

  useEffect(() => {
    const onChange = () => setIsFs(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const breakLeft = breakEnd ? breakEnd - now.getTime() : 0;

  const exitFs = () => document.fullscreenElement && document.exitFullscreen().catch(() => undefined);

  if (breakEnd && breakLeft > 0) {
    return (
      <div className="animate-fade fixed inset-0 z-[60] flex flex-col items-center justify-center gap-8 bg-bg px-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">Przerwa</p>
        <p className="tabular font-mono text-6xl font-light tracking-tight">{fmtClock(breakLeft / 1000)}</p>
        <p className="max-w-xs text-center text-sm text-muted">Wstań, napij się wody, popatrz w dal. Bez telefonu.</p>
        <Button onClick={() => setBreakEnd(null)}>Zakończ przerwę</Button>
      </div>
    );
  }

  if (!timer) return null;

  if (minimized && !showNotes) {
    return (
      <button
        type="button"
        onClick={() => useUi.setState({ timerMinimized: false })}
        className="animate-rise fixed bottom-[calc(env(safe-area-inset-bottom)+5rem)] left-1/2 z-40 flex h-12 -translate-x-1/2 items-center gap-3 rounded-full border border-accent/40 bg-surface px-5 shadow-pop lg:bottom-6"
        aria-label="Wróć do sesji skupienia"
      >
        <Timer size={16} className="text-accent" />
        <span className="tabular font-mono text-sm">{fmtClock(remaining / 1000)}</span>
        <span className="text-[12px] text-muted">{running ? CATEGORIES[timer.category].label : "Pauza"}</span>
      </button>
    );
  }

  const total = timer.focusMin * 60000;
  const spent = Math.round((total - remaining) / 60000);

  return (
    <div role="dialog" aria-modal="true" aria-label="Sesja skupienia" className="animate-fade pt-safe pb-safe fixed inset-0 z-[60] flex flex-col bg-bg">
      <div className="flex h-14 items-center justify-between px-4">
        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">{CATEGORIES[timer.category].label}</span>
        {!showNotes && (
          <div className="flex gap-1">
            {typeof document !== "undefined" && document.fullscreenEnabled && (
              <IconButton label={isFs ? "Wyjdź z pełnego ekranu" : "Pełny ekran"} onClick={() => (isFs ? exitFs() : document.documentElement.requestFullscreen().catch(() => undefined))}>
                <Maximize2 size={16} />
              </IconButton>
            )}
            <IconButton
              label="Zminimalizuj"
              onClick={() => {
                exitFs();
                useUi.setState({ timerMinimized: true });
              }}
            >
              <Minimize2 size={16} />
            </IconButton>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-6">
        {showNotes ? (
          <Notes
            minutes={spent}
            onSave={(note) => {
              const rest = timer.breakMin;
              const xp = finishTimer(note);
              exitFs();
              setEnding(false);
              toast(spent < 1 ? "Sesja krótsza niż minuta — nie zapisano." : `Zapisano ${spent} min${xp ? ` · +${xp} XP` : ""}. ${egoMessages ? pickLine(EGOS[ego].done, String(Date.now())) : ""}`, "success");
              if (finished && rest > 0) {
                setBreakEnd(Date.now() + rest * 60000);
                setTimeout(() => toast("Przerwa skończona. Wracasz?"), rest * 60000);
              }
            }}
          />
        ) : (
          <>
            <Ring value={1 - remaining / total} size={264} stroke={6}>
              <div className="text-center">
                <p className="tabular font-mono text-[56px] font-light leading-none tracking-tight">{fmtClock(remaining / 1000)}</p>
                <p className="mt-3 text-[12px] text-muted">{running ? `z ${timer.focusMin} min` : "pauza"}</p>
              </div>
            </Ring>
            <div className="mt-8 max-w-sm text-center">
              {timer.goal && <p className="text-lg font-medium leading-snug">{timer.goal}</p>}
              {topic && <p className="mt-1 text-sm text-muted">{topic.title}</p>}
              {egoMessages && <p className="mt-4 text-[13px] text-muted">{pickLine(EGOS[ego].lines, String(timer.startedAt))}</p>}
            </div>
          </>
        )}
      </div>

      {!showNotes && (
        <div className="flex items-center justify-center gap-3 px-6 pb-8">
          <Button
            variant="ghost"
            onClick={() => {
              exitFs();
              cancelTimer();
              toast("Sesja anulowana — nic nie zapisano.");
            }}
          >
            Anuluj
          </Button>
          <Button variant="primary" size="lg" className="w-40" onClick={running ? pauseTimer : resumeTimer}>
            {running ? <><Pause size={16} /> Pauza</> : <><Play size={16} /> Wznów</>}
          </Button>
          <Button
            onClick={() => {
              pauseTimer();
              setEnding(true);
            }}
          >
            Zakończ
          </Button>
        </div>
      )}
    </div>
  );
}

export function FocusLayer() {
  return (
    <>
      <Starter />
      <Overlay />
    </>
  );
}
