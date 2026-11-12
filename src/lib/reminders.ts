"use client";

import { pushNotification, settleMissions } from "./actions";
import { blocksFor, blockStatus } from "./logic";
import { getData, toast } from "./store";
import { dateKey, nowMin, toMin } from "./time";

const system = (title: string, body: string) => {
  if (!getData().settings.notifications.system) return;
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  const opts = { body, icon: "/icon-192.png", badge: "/icon-192.png", tag: title };
  // Android requires notifications to go through the service worker; desktop accepts both.
  if ("serviceWorker" in navigator)
    navigator.serviceWorker.ready.then((r) => r.showNotification(title, opts)).catch(() => new Notification(title, opts));
  else new Notification(title, opts);
};

const notify = (key: string, title: string, body: string, href?: string) => {
  if (!getData().settings.notifications.inApp) return;
  if (!pushNotification({ key, title, body, href })) return;
  toast(`${title} — ${body}`);
  system(title, body);
};

/** Runs every few seconds while the app is open. Each reminder fires once thanks to its key. */
export const runReminders = (now = new Date()) => {
  const data = getData();
  const date = dateKey(now);
  const m = nowMin(now);

  for (const b of blocksFor(data, date)) {
    const start = toMin(b.start);
    if (m < start || m >= start + 5 || blockStatus(data, date, b.id)) continue;
    const evening = b.category === "routine" && start >= 20 * 60;
    notify(
      `block:${date}|${b.id}|${b.start}`,
      evening ? "Rutyna wieczorna" : `Teraz: ${b.title}`,
      evening ? "Koniec ekranów. Zapisz 3 priorytety na jutro." : `${b.start}–${b.end}`,
      "/",
    );
  }

  const game = data.activeGame;
  if (game) {
    const left = (game.plannedEnd - now.getTime()) / 60000;
    if (left <= 0) notify(`gameend:${game.startedAt}`, "Czas sesji minął", "Zakończ sesję w Gaming Control.", "/gaming");
    else if (left <= data.settings.gaming.warnMin)
      notify(`gamewarn:${game.startedAt}`, `Zostało ${Math.ceil(left)} min grania`, "Dokończ to, co robisz, i zamknij sesję.", "/gaming");
  }

  const timer = data.activeTimer;
  if (timer?.endsAt && timer.endsAt <= now.getTime())
    notify(`timer:${timer.startedAt}`, "Sesja skupienia zakończona", "Zapisz krótką notatkę.", "/");

  if (m >= 7 * 60) {
    const due = data.tasks.filter((t) => t.status !== "done" && t.due && t.due <= date);
    if (due.length)
      notify(`due:${date}`, due.length === 1 ? "1 zadanie z terminem na dziś" : `Zadania z terminem: ${due.length}`, due[0].title, "/tasks");
    const followUps = data.clients.filter((c) => c.followUp && c.followUp <= date && c.stage !== "won" && c.stage !== "lost");
    if (followUps.length) notify(`followup:${date}`, "Follow-up na dziś", followUps.map((c) => c.company).join(", "), "/aiven");
  }

  settleMissions();
};
