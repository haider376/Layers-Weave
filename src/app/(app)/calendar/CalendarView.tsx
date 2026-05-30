"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { addTaskAction } from "../tasks/actions";
import { showToast } from "@/components/Toast";

export type CalEvent = { id: string; title: string; date: string; kind: "meeting" | "task"; status: string; dealId: string | null };

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const START_HOUR = 8, END_HOUR = 19, ROW = 50;

function startOfWeek(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - x.getDay()); return x; }
function sameDay(a: Date, b: Date) { return a.toDateString() === b.toDateString(); }
function evColor(e: CalEvent) {
  if (e.kind === "task") return e.status === "Done" ? "var(--faint)" : e.status === "High" ? "var(--red)" : "var(--amber)";
  return e.status === "Showed up" ? "var(--neon)" : e.status === "No Show" ? "var(--red)" : "var(--violet)";
}

export default function CalendarView({ events }: { events: CalEvent[] }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [view, setView] = useState<"week" | "month">("week");
  const [cursor, setCursor] = useState(() => new Date());
  const [adding, setAdding] = useState<string | null>(null); // ISO date for the day being added to
  const [title, setTitle] = useState("");
  const today = new Date();

  const weekStart = useMemo(() => startOfWeek(cursor), [cursor]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setDate(d.getDate() + i); return d; }), [weekStart]);

  // month grid (6 weeks)
  const monthCells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const gridStart = startOfWeek(first);
    return Array.from({ length: 42 }, (_, i) => { const d = new Date(gridStart); d.setDate(d.getDate() + i); return d; });
  }, [cursor]);

  const evOn = (d: Date) => events.filter((e) => sameDay(new Date(e.date), d));
  const label = view === "month"
    ? cursor.toLocaleDateString("en-GB", { month: "long", year: "numeric" })
    : `${weekStart.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${days[6].toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;

  function shift(n: number) { const d = new Date(cursor); if (view === "month") d.setMonth(d.getMonth() + n); else d.setDate(d.getDate() + n * 7); setCursor(d); }
  function addOn(dayIso: string) {
    if (!title.trim()) return;
    start(async () => { await addTaskAction({ title, type: "To-do", priority: "Medium", dueDate: dayIso }); setTitle(""); setAdding(null); showToast("Added to calendar"); router.refresh(); });
  }

  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

  return (
    <div className="cal">
      <div className="cal-bar">
        <div className="cal-month font-display">{label}</div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div className="seg">
            <button className={view === "week" ? "on" : ""} onClick={() => setView("week")}>Week</button>
            <button className={view === "month" ? "on" : ""} onClick={() => setView("month")}>Month</button>
          </div>
          <div className="cal-nav">
            <button onClick={() => shift(-1)}>‹</button>
            <button className="cal-today" onClick={() => setCursor(new Date())}>Today</button>
            <button onClick={() => shift(1)}>›</button>
          </div>
        </div>
      </div>

      {view === "week" ? (
        <div className="cal-grid">
          <div className="cal-head">
            <div className="cal-gutter" />
            {days.map((d, i) => (
              <div key={i} className={`cal-day-h${sameDay(d, today) ? " today" : ""}`}>
                <span className="cal-dow">{DAYS[i]}</span><span className="cal-dnum">{d.getDate()}</span>
              </div>
            ))}
          </div>
          <div className="cal-body" style={{ height: hours.length * ROW }}>
            <div className="cal-gutter-col">{hours.map((h) => <div className="cal-hour" key={h} style={{ height: ROW }}>{h % 12 === 0 ? 12 : h % 12}{h < 12 ? "am" : "pm"}</div>)}</div>
            {days.map((d, i) => (
              <div className="cal-col" key={i} onDoubleClick={() => { setAdding(d.toISOString()); }}>
                {hours.map((h) => <div className="cal-cell" key={h} style={{ height: ROW }} />)}
                {evOn(d).map((e) => {
                  const dt = new Date(e.date);
                  const top = e.kind === "meeting" ? (dt.getHours() + dt.getMinutes() / 60 - START_HOUR) * ROW : 2 + (evOn(d).filter((x) => x.kind === "task").indexOf(e)) * 26;
                  return (
                    <motion.div key={e.id} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="cal-ev" style={{ top: Math.max(0, top), borderLeftColor: evColor(e) }}>
                      {e.dealId ? <Link href={`/deals/${e.dealId}`}><span className="cal-ev-t">{e.title}</span></Link> : <span className="cal-ev-t">{e.title}</span>}
                      <span className="cal-ev-m">{e.kind === "meeting" ? dt.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit" }) : "task"} · {e.status}</span>
                    </motion.div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="cal-month-grid">
          {DAYS.map((d) => <div className="cmg-dow" key={d}>{d}</div>)}
          {monthCells.map((d, i) => {
            const inMonth = d.getMonth() === cursor.getMonth();
            const evs = evOn(d);
            return (
              <div key={i} className={`cmg-cell${inMonth ? "" : " out"}${sameDay(d, today) ? " today" : ""}`} onClick={() => setAdding(d.toISOString())}>
                <div className="cmg-num">{d.getDate()}</div>
                {evs.slice(0, 3).map((e) => (
                  <div className="cmg-ev" key={e.id} style={{ background: evColor(e) }} title={e.title}>{e.title}</div>
                ))}
                {evs.length > 3 && <div className="cmg-more">+{evs.length - 3}</div>}
              </div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {adding && (
          <motion.div className="cal-add-pop" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <span className="eyebrow">New on {new Date(adding).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}</span>
            <input className="ed" autoFocus style={{ border: "1px solid var(--line-2)", flex: 1 }} placeholder="Event / task title…" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addOn(adding)} />
            <button className="btn primary" style={{ flex: "none", padding: "8px 16px" }} onClick={() => addOn(adding)}>Add</button>
            <button className="btn ghost" style={{ flex: "none", padding: "8px 14px" }} onClick={() => { setAdding(null); setTitle(""); }}>Cancel</button>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="cal-hint">Double-click a day{view === "month" ? "" : " column"} to add an event</div>
    </div>
  );
}
