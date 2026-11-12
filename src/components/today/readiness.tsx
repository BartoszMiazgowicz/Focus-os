"use client";

import { Minus, Plus } from "lucide-react";
import { useState } from "react";
import { setDayLog } from "@/lib/actions";
import { readiness } from "@/lib/logic";
import { useData } from "@/lib/store";
import { Button, Card, cx, IconButton, Ring, SectionTitle } from "../ui/kit";

export const ENERGY_LABELS = ["Bardzo niska", "Niska", "W porządku", "Dobra", "Bardzo dobra"];

/** Sleep + energy check-in. Shared by Today and Training. */
export function CheckIn({ date, onDone }: { date: string; onDone?: () => void }) {
  const log = useData((d) => d.dayLogs[date]);
  const [sleep, setSleep] = useState(log?.sleepHours ?? 8);
  const [energy, setEnergy] = useState(log?.energy ?? 0);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm">Sen ostatniej nocy</span>
        <div className="flex items-center gap-1">
          <IconButton label="Mniej snu" onClick={() => setSleep(Math.max(0, sleep - 0.5))} className="border border-line"><Minus size={15} /></IconButton>
          <span className="tabular w-16 text-center font-mono text-sm">{sleep.toString().replace(".", ",")} h</span>
          <IconButton label="Więcej snu" onClick={() => setSleep(Math.min(14, sleep + 0.5))} className="border border-line"><Plus size={15} /></IconButton>
        </div>
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between text-sm">
          <span>Energia</span>
          <span className="text-[12px] text-muted">{energy ? ENERGY_LABELS[energy - 1] : "wybierz"}</span>
        </div>
        <div className="grid grid-cols-5 gap-1.5" role="radiogroup" aria-label="Poziom energii">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={energy === n}
              aria-label={ENERGY_LABELS[n - 1]}
              onClick={() => setEnergy(n)}
              className={cx("tabular h-11 rounded-xl border text-sm font-medium transition-colors", energy === n ? "border-accent bg-accent/10 text-fg" : "border-line text-muted hover:text-fg")}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      <Button
        variant="primary"
        className="w-full"
        disabled={!energy}
        onClick={() => {
          setDayLog(date, { sleepHours: sleep, energy });
          onDone?.();
        }}
      >
        Zapisz
      </Button>
    </div>
  );
}

export function ReadinessCard({ date }: { date: string }) {
  const log = useData((d) => d.dayLogs[date]);
  const [editing, setEditing] = useState(false);
  const r = readiness(log);
  return (
    <Card>
      <SectionTitle action={r && !editing ? <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>Zmień</Button> : undefined}>Gotowość dnia</SectionTitle>
      {r && !editing ? (
        <div className="flex items-center gap-4">
          <Ring value={r.score / 100} size={64}><span className="tabular text-sm font-semibold">{r.score}</span></Ring>
          <div className="min-w-0">
            <p className="text-sm font-medium">{r.label} · {String(log?.sleepHours).replace(".", ",")} h snu</p>
            <p className="mt-0.5 text-[13px] leading-snug text-muted">{r.hint}</p>
          </div>
        </div>
      ) : (
        <CheckIn date={date} onDone={() => setEditing(false)} />
      )}
      <p className="mt-3 text-[11px] leading-relaxed text-muted/80">Liczone z Twoich wpisów o śnie i energii. To wskazówka do planowania, nie ocena zdrowia.</p>
    </Card>
  );
}
