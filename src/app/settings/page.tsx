"use client";

import { ArrowRight, Download, Moon, Sun, Upload } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { EGO_ICON } from "@/components/shell/ego";
import { Button, Card, Confirm, cx, Field, Input, PageHeader, SectionTitle, Switch } from "@/components/ui/kit";
import { updateSettings } from "@/lib/actions";
import { EGOS } from "@/lib/egos";
import type { Settings } from "@/lib/schema";
import { createBackup, listBackups, parseEnvelope, serialize, type BackupEntry } from "@/lib/storage";
import { getData, replaceAll, resetAll, toast, useData } from "@/lib/store";
import { dateKey, DAY_SHORT, toMin, WEEK_ORDER } from "@/lib/time";
import { useUi } from "@/lib/ui";

function Row({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        {hint && <p className="mt-0.5 text-[12px] leading-relaxed text-muted">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

const TimeInput = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <Field label={label}>
    <Input type="time" value={value} onChange={(e) => e.target.value && onChange(e.target.value)} />
  </Field>
);

function NumberInput({ label, value, min, max, onChange, hint }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void; hint?: string }) {
  const [text, setText] = useState(String(value));
  const n = Number(text);
  const valid = text !== "" && Number.isFinite(n) && n >= min && n <= max;
  return (
    <Field label={label} hint={hint} error={valid ? undefined : `Zakres: ${min}–${max}`}>
      <Input
        type="number"
        inputMode="decimal"
        value={text}
        min={min}
        max={max}
        onChange={(e) => {
          setText(e.target.value);
          const v = Number(e.target.value);
          if (e.target.value !== "" && Number.isFinite(v) && v >= min && v <= max) onChange(v);
        }}
      />
    </Field>
  );
}

function SystemNotifications({ settings }: { settings: Settings }) {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(() =>
    typeof Notification === "undefined" ? "unsupported" : Notification.permission,
  );

  const toggle = async (on: boolean) => {
    if (!on) return updateSettings((s) => void (s.notifications.system = false));
    if (permission === "unsupported") return;
    const result = permission === "granted" ? "granted" : await Notification.requestPermission();
    setPermission(result);
    if (result === "granted") updateSettings((s) => void (s.notifications.system = true));
    else toast("Przeglądarka nie zezwoliła na powiadomienia. Zmień to w ustawieniach strony.", "error");
  };

  return (
    <>
      <Row
        title="Powiadomienia systemowe"
        hint={
          permission === "unsupported"
            ? "Ta przeglądarka ich nie obsługuje. Na iPhonie najpierw dodaj aplikację do ekranu początkowego."
            : permission === "denied"
              ? "Zablokowane w ustawieniach przeglądarki dla tej strony."
              : "Pokazywane przez system, gdy aplikacja jest otwarta lub działa w tle."
        }
      >
        <Switch label="Powiadomienia systemowe" checked={settings.notifications.system && permission === "granted"} onChange={toggle} />
      </Row>
      <p className="mt-2 rounded-xl bg-surface-2/60 p-3 text-[12px] leading-relaxed text-muted">
        Uczciwie: przypomnienia wylicza sama aplikacja, więc działają, dopóki jest uruchomiona (także zminimalizowana, jeśli system jej nie uśpi). Powiadomienia przy całkowicie zamkniętej aplikacji wymagają serwera push — tej wersji go nie ma.
      </p>
    </>
  );
}

export default function SettingsPage() {
  const settings = useData((d) => d.settings);
  const fileRef = useRef<HTMLInputElement>(null);
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [confirm, setConfirm] = useState<"reset" | { payload: string; label: string } | null>(null);
  // Pages render only after client hydration (see Providers), so browser APIs are safe in initial state.
  const [installHint] = useState(() => !window.matchMedia("(display-mode: standalone)").matches);

  useEffect(() => {
    void listBackups().then(setBackups);
  }, []);

  const exportJson = () => {
    const blob = new Blob([serialize(getData())], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `focus-os-${dateKey()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Kopia pobrana.", "success");
  };

  const restore = (payload: string) => {
    const res = parseEnvelope(payload);
    if (!res.ok) return toast(res.error, "error");
    replaceAll(res.data);
    toast("Dane wczytane.", "success");
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 10_000_000) return toast("Plik jest za duży na kopię FOCUS OS.", "error");
    const payload = await file.text();
    const res = parseEnvelope(payload);
    if (!res.ok) return toast(res.error, "error");
    setConfirm({ payload, label: `pliku „${file.name}”` });
  };

  const snapshot = async () => {
    if (await createBackup(getData())) {
      setBackups(await listBackups());
      toast("Kopia zapisana w tej przeglądarce.", "success");
    } else toast("Nie udało się zapisać kopii.", "error");
  };

  const windowLen = toMin(settings.gaming.end) - toMin(settings.gaming.start);

  return (
    <div className="max-w-2xl">
      <PageHeader title="Settings" subtitle="Zmiany zapisują się automatycznie." />
      <div className="space-y-4">
        <Card>
          <SectionTitle>Profil</SectionTitle>
          <Field label="Imię" hint="Używane w powitaniu na ekranie Today.">
            <Input value={settings.name} onChange={(e) => updateSettings((s) => void (s.name = e.target.value.slice(0, 40)))} placeholder="Bartek" autoComplete="given-name" />
          </Field>
        </Card>

        <Card>
          <SectionTitle>Wygląd</SectionTitle>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Motyw">
            {([["dark", "Ciemny", Moon], ["light", "Jasny", Sun]] as const).map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={settings.theme === value}
                onClick={() => updateSettings((s) => void (s.theme = value))}
                className={cx("flex h-12 items-center justify-center gap-2 rounded-xl border text-sm font-medium transition-colors", settings.theme === value ? "border-accent bg-accent/[0.07]" : "border-line text-muted hover:text-fg")}
              >
                <Icon size={15} /> {label}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <SectionTitle>Alter ego</SectionTitle>
          <Row title={EGOS[settings.activeEgo].name} hint={EGOS[settings.activeEgo].tagline}>
            <Button size="sm" onClick={() => useUi.setState({ egoOpen: true })}>
              {(() => {
                const Icon = EGO_ICON[settings.activeEgo];
                return <Icon size={14} className="text-accent" />;
              })()}
              Zmień
            </Button>
          </Row>
          <Row title="Sugeruj tryb automatycznie" hint="Na podstawie bieżącego bloku w planie.">
            <Switch label="Sugeruj tryb automatycznie" checked={settings.autoEgo} onChange={(v) => updateSettings((s) => void (s.autoEgo = v))} />
          </Row>
          <Row title="Komunikaty alter ego" hint="Krótkie zdania na Today i po sesjach.">
            <Switch label="Komunikaty alter ego" checked={settings.egoMessages} onChange={(v) => updateSettings((s) => void (s.egoMessages = v))} />
          </Row>
        </Card>

        <Card>
          <SectionTitle>Sen</SectionTitle>
          <div className="grid grid-cols-3 gap-3">
            <TimeInput label="Sen" value={settings.sleep.bed} onChange={(v) => updateSettings((s) => void (s.sleep.bed = v))} />
            <TimeInput label="Pobudka" value={settings.sleep.wake} onChange={(v) => updateSettings((s) => void (s.sleep.wake = v))} />
            <TimeInput label="Niedziela" value={settings.sleep.sundayWake} onChange={(v) => updateSettings((s) => void (s.sleep.sundayWake = v))} />
          </div>
        </Card>

        <Card>
          <SectionTitle>Tygodniowy plan</SectionTitle>
          <Link href="/planner" className="flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-3 text-sm font-medium transition-colors hover:border-muted/50">
            Edytuj bloki w Plannerze (tryb „Edytuj szablon”) <ArrowRight size={15} className="text-muted" />
          </Link>
        </Card>

        <Card>
          <SectionTitle>Limity grania</SectionTitle>
          <p className="mb-2 text-[12px] font-medium text-muted">Dni z zaplanowanym graniem</p>
          <div className="mb-4 grid grid-cols-7 gap-1.5">
            {WEEK_ORDER.map((d) => {
              const on = settings.gaming.days.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={on}
                  onClick={() => updateSettings((s) => void (s.gaming.days = on ? s.gaming.days.filter((x) => x !== d) : [...s.gaming.days, d]))}
                  className={cx("h-11 rounded-xl border text-[13px] font-medium transition-colors", on ? "border-accent bg-accent/[0.07] text-fg" : "border-line text-muted")}
                >
                  {DAY_SHORT[d]}
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TimeInput label="Okno od" value={settings.gaming.start} onChange={(v) => updateSettings((s) => void (s.gaming.start = v))} />
            <TimeInput label="Okno do" value={settings.gaming.end} onChange={(v) => updateSettings((s) => void (s.gaming.end = v))} />
            <NumberInput label="Limit dzienny (min)" value={settings.gaming.dailyLimitMin} min={0} max={600} onChange={(v) => updateSettings((s) => void (s.gaming.dailyLimitMin = v))} />
            <NumberInput label="Limit tygodniowy (h)" value={settings.gaming.weeklyLimitMin / 60} min={0} max={70} onChange={(v) => updateSettings((s) => void (s.gaming.weeklyLimitMin = Math.round(v * 60)))} />
            <NumberInput label="Przypomnienie przed końcem (min)" value={settings.gaming.warnMin} min={1} max={60} onChange={(v) => updateSettings((s) => void (s.gaming.warnMin = v))} />
          </div>
          {windowLen <= 0 && <p role="alert" className="mt-2 text-[12px] text-danger">Koniec okna musi być później niż początek.</p>}
        </Card>

        <Card>
          <SectionTitle>Powiadomienia</SectionTitle>
          <Row title="Przypomnienia w aplikacji" hint="Start bloku, koniec grania, rutyna wieczorna, terminy zadań.">
            <Switch label="Przypomnienia w aplikacji" checked={settings.notifications.inApp} onChange={(v) => updateSettings((s) => void (s.notifications.inApp = v))} />
          </Row>
          <SystemNotifications settings={settings} />
        </Card>

        {installHint && (
          <Card>
            <SectionTitle>Aplikacja na telefonie</SectionTitle>
            <ul className="space-y-2 text-[13px] leading-relaxed text-muted">
              <li><span className="text-fg">iPhone (Safari):</span> Udostępnij → „Do ekranu początkowego”.</li>
              <li><span className="text-fg">Android (Chrome):</span> menu ⋮ → „Zainstaluj aplikację” / „Dodaj do ekranu głównego”.</li>
              <li>Po instalacji FOCUS OS otwiera się na pełnym ekranie i działa bez internetu. Dane zostają na tym urządzeniu.</li>
            </ul>
          </Card>
        )}

        <Card>
          <SectionTitle>Dane</SectionTitle>
          <p className="mb-3 text-[12px] leading-relaxed text-muted">
            Wszystko jest zapisane lokalnie w tej przeglądarce — nic nie trafia na serwer. Telefon i komputer mają osobne dane; przeniesiesz je eksportem i importem pliku JSON.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={exportJson}><Download size={15} /> Eksport JSON</Button>
            <Button onClick={() => fileRef.current?.click()}><Upload size={15} /> Import JSON</Button>
          </div>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onFile} aria-label="Plik kopii danych" />
          <div className="mt-4 border-t border-line pt-3">
            <Row title="Kopie w przeglądarce" hint="Tworzone automatycznie raz dziennie. Przechowywane są trzy ostatnie.">
              <Button size="sm" onClick={snapshot}>Utwórz teraz</Button>
            </Row>
            {backups.length > 0 && (
              <ul className="mt-1 divide-y divide-line">
                {backups.map((b) => (
                  <li key={b.at} className="flex items-center justify-between gap-3 py-2">
                    <span className="tabular text-[13px] text-muted">{new Date(b.at).toLocaleString("pl-PL", { dateStyle: "medium", timeStyle: "short" })}</span>
                    <Button variant="ghost" size="sm" onClick={() => setConfirm({ payload: b.payload, label: "tej kopii" })}>Przywróć</Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="mt-4 border-t border-line pt-4">
            <Button variant="danger" className="w-full" onClick={() => setConfirm("reset")}>Zresetuj wszystkie dane</Button>
          </div>
        </Card>
      </div>

      <Confirm
        open={confirm === "reset"}
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          void resetAll();
          toast("Dane zresetowane.");
        }}
        title="Zresetować wszystkie dane?"
        body="Zadania, historia, treningi, klienci i ustawienia zostaną usunięte z tej przeglądarki. Kopie w przeglądarce zostają — ale najpierw zrób eksport JSON."
        confirmLabel="Resetuj"
      />
      <Confirm
        open={confirm !== null && confirm !== "reset"}
        onClose={() => setConfirm(null)}
        onConfirm={() => confirm && confirm !== "reset" && restore(confirm.payload)}
        title="Zastąpić obecne dane?"
        body={`Obecne dane zostaną zastąpione zawartością ${confirm && confirm !== "reset" ? confirm.label : "kopii"}. Tej operacji nie da się cofnąć.`}
        confirmLabel="Zastąp"
      />
    </div>
  );
}
