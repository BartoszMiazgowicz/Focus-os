"use client";

import { Pin, Plus } from "lucide-react";
import { useState } from "react";
import { togglePin, toggleTask } from "@/lib/actions";
import { CATEGORIES } from "@/lib/categories";
import { pinnedTasks, sortTasks } from "@/lib/logic";
import { toast, useData } from "@/lib/store";
import { useUi } from "@/lib/ui";
import { Button, Card, Check, cx, Empty, Modal, SectionTitle } from "../ui/kit";

export function PinPicker({ date, open, onClose }: { date: string; open: boolean; onClose: () => void }) {
  const tasks = useData((d) => d.tasks);
  const candidates = sortTasks(tasks.filter((t) => t.status !== "done"));
  return (
    <Modal open={open} onClose={onClose} title="Priorytety dnia" description="Maksymalnie trzy. Wybierz to, co naprawdę przesuwa sprawy do przodu.">
      {candidates.length === 0 ? (
        <Empty title="Brak otwartych zadań" hint="Dodaj zadanie, a potem przypnij je jako priorytet." />
      ) : (
        <ul className="space-y-1">
          {candidates.map((t) => {
            const pinned = t.pinnedDate === date;
            return (
              <li key={t.id}>
                <button
                  type="button"
                  aria-pressed={pinned}
                  onClick={() => !togglePin(t.id, date) && toast("Trzy priorytety to maksimum. Odepnij jeden, żeby dodać kolejny.")}
                  className={cx("flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors", pinned ? "border-accent bg-accent/[0.06]" : "border-transparent hover:bg-surface-2")}
                >
                  <Pin size={15} className={pinned ? "text-accent" : "text-muted"} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{t.title}</span>
                    <span className="block text-[12px] text-muted">{CATEGORIES[t.category].label}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="mt-4 flex gap-2">
        <Button className="flex-1" onClick={() => useUi.setState({ quickAdd: true })}><Plus size={15} /> Nowe zadanie</Button>
        <Button variant="primary" className="flex-1" onClick={onClose}>Gotowe</Button>
      </div>
    </Modal>
  );
}

export function Priorities({ date }: { date: string }) {
  const pinned = useData((d) => pinnedTasks(d, date).map((t) => t.id).join(","));
  const tasks = useData((d) => d.tasks);
  const [picker, setPicker] = useState(false);
  const list = tasks.filter((t) => pinned.split(",").includes(t.id));
  return (
    <Card>
      <SectionTitle action={<Button variant="ghost" size="sm" onClick={() => setPicker(true)}>{list.length ? "Zmień" : "Wybierz"}</Button>}>
        3 priorytety dnia
      </SectionTitle>
      {list.length === 0 ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button className="flex-1" onClick={() => setPicker(true)}><Pin size={15} /> Wybierz z listy</Button>
          <Button className="flex-1" onClick={() => useUi.setState({ quickAdd: true })}><Plus size={15} /> Szybkie zadanie</Button>
        </div>
      ) : (
        <ul className="space-y-1">
          {list.map((t, i) => (
            <li key={t.id} className="flex items-center gap-3 py-2">
              <span className="tabular w-3 font-mono text-[12px] text-muted">{i + 1}</span>
              <Check label={`Oznacz „${t.title}” jako wykonane`} checked={t.status === "done"} onChange={() => toggleTask(t.id)} />
              <span className="min-w-0 flex-1">
                <span className={cx("block truncate text-sm", t.status === "done" && "text-muted line-through")}>{t.title}</span>
                <span className="block text-[12px] text-muted">{CATEGORIES[t.category].label}{t.estimateMin ? ` · ${t.estimateMin} min` : ""}</span>
              </span>
            </li>
          ))}
          {list.length < 3 && (
            <li>
              <button type="button" onClick={() => setPicker(true)} className="flex w-full items-center gap-3 py-2 text-sm text-muted hover:text-fg">
                <span className="w-3" /><span className="flex size-6 items-center justify-center rounded-full border border-dashed border-muted/50"><Plus size={12} /></span>
                Dodaj priorytet
              </button>
            </li>
          )}
        </ul>
      )}
      <PinPicker date={date} open={picker} onClose={() => setPicker(false)} />
    </Card>
  );
}
