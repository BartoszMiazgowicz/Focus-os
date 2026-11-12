"use client";

import {
  BarChart3, Bell, Briefcase, CalendarDays, Dumbbell, Gamepad2, GraduationCap, LayoutGrid, ListChecks, Settings, Sun, type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { clearNotifications, markNotificationsRead } from "@/lib/actions";
import { useData, useStore } from "@/lib/store";
import { FocusLayer } from "../focus/focus-layer";
import { QuickAddTask } from "../tasks/task-form";
import { Button, cx, Empty, IconButton, Modal } from "../ui/kit";
import { EgoChip, EgoSwitcher } from "./ego";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV: NavItem[] = [
  { href: "/", label: "Today", icon: Sun },
  { href: "/planner", label: "Planner", icon: CalendarDays },
  { href: "/tasks", label: "Tasks", icon: ListChecks },
  { href: "/study", label: "Study", icon: GraduationCap },
  { href: "/aiven", label: "Aiven", icon: Briefcase },
  { href: "/training", label: "Training", icon: Dumbbell },
  { href: "/gaming", label: "Gaming Control", icon: Gamepad2 },
  { href: "/progress", label: "Progress", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];
const MOBILE_PRIMARY = ["/", "/planner", "/tasks", "/gaming"];

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="FOCUS OS — Today">
      <span className="relative flex size-6 items-center justify-center rounded-full border-2 border-line">
        <span className="size-1.5 rounded-full bg-accent" />
      </span>
      <span className="text-[13px] font-semibold tracking-[0.18em]">FOCUS OS</span>
    </Link>
  );
}

function Notifications() {
  const [open, setOpen] = useState(false);
  const list = useData((d) => d.notifications);
  const unread = list.filter((n) => !n.read).length;
  const close = () => {
    setOpen(false);
    markNotificationsRead();
  };
  return (
    <>
      <IconButton label={unread ? `Powiadomienia, nieprzeczytane: ${unread}` : "Powiadomienia"} onClick={() => setOpen(true)} className="relative border border-line bg-surface">
        <Bell size={16} />
        {unread > 0 && <span className="absolute right-2 top-2 size-2 rounded-full bg-accent" />}
      </IconButton>
      <Modal open={open} onClose={close} title="Powiadomienia">
        {list.length === 0 ? (
          <Empty title="Cisza" hint="Przypomnienia o blokach, końcu grania i terminach pojawią się tutaj, gdy aplikacja jest otwarta." />
        ) : (
          <>
            <ul className="divide-y divide-line">
              {list.map((n) => (
                <li key={n.key}>
                  <Link href={n.href ?? "/"} onClick={close} className="flex gap-3 py-3">
                    <span className={cx("mt-1.5 size-1.5 shrink-0 rounded-full", n.read ? "bg-line" : "bg-accent")} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{n.title}</span>
                      <span className="block truncate text-[13px] text-muted">{n.body}</span>
                    </span>
                    <time className="tabular shrink-0 text-[11px] text-muted">
                      {new Date(n.at).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}
                    </time>
                  </Link>
                </li>
              ))}
            </ul>
            <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={clearNotifications}>Wyczyść</Button>
          </>
        )}
      </Modal>
    </>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [more, setMore] = useState(false);
  const loadError = useStore((s) => s.loadError);
  const saveFailed = useStore((s) => s.saveFailed);
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const moreActive = !MOBILE_PRIMARY.some(isActive);

  return (
    <div className="mx-auto flex min-h-dvh max-w-[1400px]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line px-4 py-6 lg:flex">
        <div className="px-2"><Logo /></div>
        <nav aria-label="Główna nawigacja" className="mt-8 flex flex-1 flex-col gap-0.5">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href) ? "page" : undefined}
              className={cx(
                "flex h-10 items-center gap-3 rounded-xl px-3 text-[13.5px] transition-colors",
                isActive(href) ? "bg-surface-2 font-medium text-fg" : "text-muted hover:bg-surface-2/60 hover:text-fg",
                href === "/settings" && "mt-auto",
              )}
            >
              <Icon size={16} className={isActive(href) ? "text-accent" : undefined} />
              {label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="pt-safe sticky top-0 z-30 border-b border-line/60 bg-bg/85 backdrop-blur-xl">
          <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-8">
            <div className="lg:hidden"><Logo /></div>
            <div className="ml-auto flex items-center gap-2">
              <EgoChip />
              <Notifications />
            </div>
          </div>
        </header>

        {(loadError || saveFailed) && (
          <div role="alert" className="border-b border-danger/30 bg-danger/10 px-4 py-2.5 text-[13px] text-danger sm:px-8">
            {loadError ?? "Nie udało się zapisać zmian w pamięci przeglądarki. Zrób eksport danych w Settings."}
          </div>
        )}

        <main key={pathname} className="animate-rise w-full max-w-5xl flex-1 px-4 pb-32 pt-6 sm:px-8 lg:pb-16 lg:pt-8">
          {children}
        </main>
      </div>

      {/* Mobile tab bar */}
      <nav aria-label="Główna nawigacja" className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/90 backdrop-blur-xl lg:hidden">
        <ul className="mx-auto grid h-16 max-w-lg grid-cols-5">
          {NAV.filter((n) => MOBILE_PRIMARY.includes(n.href)).map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                aria-current={isActive(href) ? "page" : undefined}
                className={cx("flex h-full flex-col items-center justify-center gap-1 text-[10.5px] font-medium", isActive(href) ? "text-accent" : "text-muted")}
              >
                <Icon size={20} strokeWidth={isActive(href) ? 2.2 : 1.8} />
                {label === "Gaming Control" ? "Gaming" : label}
              </Link>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => setMore(true)}
              aria-haspopup="dialog"
              className={cx("flex h-full w-full flex-col items-center justify-center gap-1 text-[10.5px] font-medium", moreActive ? "text-accent" : "text-muted")}
            >
              <LayoutGrid size={20} strokeWidth={moreActive ? 2.2 : 1.8} />
              Więcej
            </button>
          </li>
        </ul>
      </nav>

      <Modal open={more} onClose={() => setMore(false)} title="Moduły">
        <div className="grid grid-cols-2 gap-2">
          {NAV.filter((n) => !MOBILE_PRIMARY.includes(n.href)).map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMore(false)}
              className={cx(
                "flex h-20 flex-col justify-between rounded-2xl border p-3.5 text-sm font-medium transition-colors",
                isActive(href) ? "border-accent text-fg" : "border-line text-fg hover:border-muted/50",
              )}
            >
              <Icon size={18} className={isActive(href) ? "text-accent" : "text-muted"} />
              {label}
            </Link>
          ))}
        </div>
      </Modal>

      <EgoSwitcher />
      <QuickAddTask />
      <FocusLayer />
    </div>
  );
}
