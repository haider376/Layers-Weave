"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

export type CalEvent = { id: string; title: string; date: string; status: string; owner: string | null; dealId: string };

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const START_HOUR = 8;
const END_HOUR = 19;
const ROW = 50; // px per hour

function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay());
  return x;
}
function statusColor(s: string) {
  if (s === "Showed up") return "var(--neon)";
  if (s === "No Show") return "var(--red)";
  if (s === "Unqualified") return "var(--faint)";
  return "var(--violet)";
}

export default function CalendarView({ events }: { events: CalEvent[] }) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const today = new Date();

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart); d.setDate(d.getDate() + i); return d;
  }), [weekStart]);

  const evByDay = useMemo(() => {
    const map: Record<number, CalEvent[]> = {};
    for (const e of events) {
      const d = new Date(e.date);
      for (let i = 0; i < 7; i++) {
        if (d.toDateString() === days[i].toDateString()) { (map[i] ??= []).push(e); break; }
      }
    }
    return map;
  }, [events, days]);

  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
  const monthLabel = weekStart.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  function shift(n: number) { const d = new Date(weekStart); d.setDate(d.getDate() + n * 7); setWeekStart(d); }

  return (
    <div className="cal">
      <div className="cal-bar">
        <div className="cal-month font-display">{monthLabel}</div>
        <div className="cal-nav">
          <button onClick={() => shift(-1)}>‹</button>
          <button className="cal-today" onClick={() => setWeekStart(startOfWeek(new Date()))}>Today</button>
          <button onClick={() => shift(1)}>›</button>
        </div>
      </div>

      <div className="cal-grid">
        <div className="cal-head">
          <div className="cal-gutter" />
          {days.map((d, i) => {
            const isToday = d.toDateString() === today.toDateString();
            return (
              <div key={i} className={`cal-day-h${isToday ? " today" : ""}`}>
                <span className="cal-dow">{DAYS[i]}</span>
                <span className="cal-dnum">{d.getDate()}</span>
              </div>
            );
          })}
        </div>

        <div className="cal-body" style={{ height: hours.length * ROW }}>
          <div className="cal-gutter-col">
            {hours.map((h) => (
              <div className="cal-hour" key={h} style={{ height: ROW }}>{h % 12 === 0 ? 12 : h % 12}{h < 12 ? "am" : "pm"}</div>
            ))}
          </div>
          {days.map((d, i) => (
            <div className="cal-col" key={i}>
              {hours.map((h) => <div className="cal-cell" key={h} style={{ height: ROW }} />)}
              {(evByDay[i] ?? []).map((e) => {
                const dt = new Date(e.date);
                const top = (dt.getHours() + dt.getMinutes() / 60 - START_HOUR) * ROW;
                return (
                  <motion.div
                    key={e.id}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.25 }}
                    className="cal-ev"
                    style={{ top: Math.max(0, top), borderLeftColor: statusColor(e.status) }}
                  >
                    <Link href={`/deals/${e.dealId}`}>
                      <span className="cal-ev-t">{e.title}</span>
                      <span className="cal-ev-m">{dt.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit" })} · {e.status}</span>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
