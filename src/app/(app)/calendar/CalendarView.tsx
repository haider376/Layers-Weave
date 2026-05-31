"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { addTaskAction } from "../tasks/actions";
import { createCalendarEventAction, disconnectGoogleAction } from "@/app/actions/google";
import { showToast } from "@/components/Toast";

export type CalEvent = { id: string; title: string; date: string; kind: "meeting" | "task" | "google"; status: string; dealId: string | null; link?: string; allDay?: boolean };
type GoogleState = { connected: boolean; email: string | null; configured: boolean };

// Google-Calendar-style calendars/colours, mapped onto our event kinds + statuses.
type CalKey = "meeting" | "task" | "done" | "google";
const KINDS: { key: CalKey; label: string; color: string }[] = [
  { key: "meeting", label: "Meetings & SQLs", color: "#1a73e8" },
  { key: "task", label: "Tasks", color: "#f09300" },
  { key: "done", label: "Completed", color: "#0b8043" },
  { key: "google", label: "Google Calendar", color: "#C6F542" },
];
function calOf(e: CalEvent): CalKey { return e.kind === "google" ? "google" : e.kind === "task" ? (e.status === "Done" ? "done" : "task") : "meeting"; }
const COLOR = (k: CalKey) => KINDS.find((x) => x.key === k)!.color;

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const sameDay = (a: Date, b: Date) => iso(a) === iso(b);
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const startOfWeek = (d: Date) => addDays(d, -d.getDay());
const fmt12 = (mins: number) => { const h = Math.floor(mins / 60), m = mins % 60; const ap = h < 12 ? "AM" : "PM"; const hh = h % 12 === 0 ? 12 : h % 12; return m ? `${hh}:${String(m).padStart(2, "0")} ${ap}` : `${hh} ${ap}`; };

type View = "month" | "week" | "day";
type Item = CalEvent & { d: Date; mins: number; cal: CalKey };

export default function CalendarView({ events, google }: { events: CalEvent[]; google: GoogleState }) {
  const router = useRouter();
  const params = useSearchParams();
  const [, start] = useTransition();
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState(() => new Date());
  const [mini, setMini] = useState(() => new Date());
  const [hidden, setHidden] = useState<Set<CalKey>>(new Set());
  const [creating, setCreating] = useState<null | { date: string; time: string }>(null);

  // Surface the OAuth round-trip result (?gcal=…) as a toast, then clean the URL.
  useEffect(() => {
    const s = params.get("gcal");
    if (!s) return;
    const msg: Record<string, string> = {
      connected: "Google Calendar connected ✓",
      denied: "Google connection cancelled",
      error: "Couldn't connect Google Calendar — try again",
      unconfigured: "Google Calendar isn't configured yet (admin setup needed)",
    };
    showToast(msg[s] ?? "Google Calendar");
    router.replace("/calendar");
  }, [params, router]);

  const items: Item[] = useMemo(() => events.map((e) => {
    const d = new Date(e.date);
    return { ...e, d, mins: d.getHours() * 60 + d.getMinutes(), cal: calOf(e) };
  }), [events]);

  const byDay = useMemo(() => {
    const m: Record<string, Item[]> = {};
    for (const it of items) { if (hidden.has(it.cal)) continue; (m[iso(it.d)] ??= []).push(it); }
    for (const k in m) m[k].sort((a, b) => a.mins - b.mins);
    return m;
  }, [items, hidden]);

  const toggleKind = (k: CalKey) => setHidden((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });

  const periodLabel = useMemo(() => {
    if (view === "month") return cursor.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    if (view === "day") return cursor.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const s = startOfWeek(cursor), e = addDays(s, 6);
    return s.getMonth() === e.getMonth()
      ? `${s.toLocaleDateString("en-GB", { month: "long" })} ${s.getDate()}–${e.getDate()}, ${e.getFullYear()}`
      : `${s.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${e.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
  }, [view, cursor]);

  const nav = (dir: number) => setCursor((c) => view === "month" ? new Date(c.getFullYear(), c.getMonth() + dir, 1) : addDays(c, dir * (view === "week" ? 7 : 1)));
  const goToday = () => { const t = new Date(); setCursor(t); setMini(t); };
  const jump = (d: Date, v?: View) => { setCursor(d); setMini(d); if (v) setView(v); };

  function saveEvent(ev: { title: string; date: string; time: string; duration: number; invitees: string[] }) {
    start(async () => {
      // When Google Calendar is connected, push a real event (with invites);
      // otherwise fall back to a local task so the workspace still tracks it.
      if (google.connected) {
        const r = await createCalendarEventAction({ title: ev.title, date: ev.date, time: ev.time, durationMin: ev.duration, invitees: ev.invitees });
        if (r.pushedToGoogle) {
          setCreating(null);
          showToast(ev.invitees.length ? "Event created on Google + invites sent" : "Event created on Google Calendar");
          router.refresh();
          return;
        }
        // fall through to local task if the push failed
      }
      const dur = ev.duration >= 60 && ev.duration % 60 === 0 ? `${ev.duration / 60}h` : `${ev.duration}m`;
      const who = ev.invitees.length ? ` · with ${ev.invitees.join(", ")}` : "";
      const title = `${ev.title} (${dur})${who}`;
      await addTaskAction({ title, type: "Meeting", priority: "Medium", dueDate: new Date(`${ev.date}T${ev.time}`).toISOString() });
      setCreating(null);
      showToast(google.connected ? "Saved locally (Google push failed)" : "Event added to calendar");
      router.refresh();
    });
  }

  function disconnectGoogle() {
    start(async () => { await disconnectGoogleAction(); showToast("Google Calendar disconnected"); router.refresh(); });
  }

  return (
    <div className="gcal">
      <aside className="gcal-side">
        <button className="gcal-create" onClick={() => setCreating({ date: iso(cursor), time: "09:00" })}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          Create
        </button>
        <MiniMonth mini={mini} setMini={setMini} cursor={cursor} onPick={(d) => jump(d, view === "month" ? undefined : view)} byDay={byDay} />
        <div className="gcal-mycal">
          <div className="gcal-mycal-h">My calendars</div>
          {KINDS.map((k) => {
            const count = items.filter((it) => it.cal === k.key).length;
            return (
              <label key={k.key} className="gcal-cal-item">
                <input type="checkbox" checked={!hidden.has(k.key)} onChange={() => toggleKind(k.key)} style={{ ["--c" as string]: k.color }} />
                <span>{k.label}</span>
                {count > 0 && <span className="gcal-cal-count">{count}</span>}
              </label>
            );
          })}
        </div>

        {/* Google Calendar connection */}
        <div className="gcal-conn">
          <div className="gcal-conn-h">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="3" stroke="#C6F542" strokeWidth="2"/><path d="M3 9h18M8 2v4M16 2v4" stroke="#C6F542" strokeWidth="2" strokeLinecap="round"/></svg>
            Google Calendar
          </div>
          {google.connected ? (
            <>
              <div className="gcal-conn-on"><span className="gcal-conn-dot" />{google.email ?? "Connected"}</div>
              <button className="gcal-conn-btn ghost" onClick={disconnectGoogle}>Disconnect</button>
            </>
          ) : google.configured ? (
            <>
              <div className="gcal-conn-sub">Sync events & send invites from here.</div>
              <a className="gcal-conn-btn" href="/api/integrations/google/connect">Connect</a>
            </>
          ) : (
            <div className="gcal-conn-sub">Not configured yet — admin needs to add Google API keys.</div>
          )}
        </div>
      </aside>

      <div className="gcal-main">
        <div className="gcal-toolbar">
          <button className="gcal-today" onClick={goToday}>Today</button>
          <div className="gcal-arrows">
            <button onClick={() => nav(-1)} aria-label="Previous"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg></button>
            <button onClick={() => nav(1)} aria-label="Next"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg></button>
          </div>
          <h2 className="gcal-period">{periodLabel}</h2>
          <span style={{ flex: 1 }} />
          <div className="gcal-views">
            {(["day", "week", "month"] as View[]).map((v) => (
              <button key={v} className={view === v ? "on" : ""} onClick={() => setView(v)}>{v[0].toUpperCase() + v.slice(1)}</button>
            ))}
          </div>
        </div>

        {view === "month" && <MonthGrid cursor={cursor} byDay={byDay} onDay={(d) => jump(d, "day")} />}
        {view === "week" && <TimeGrid days={Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(cursor), i))} byDay={byDay} onSlot={(date, time) => setCreating({ date, time })} />}
        {view === "day" && <TimeGrid days={[cursor]} byDay={byDay} onSlot={(date, time) => setCreating({ date, time })} />}
      </div>

      {creating && <CreateModal init={creating} onClose={() => setCreating(null)} onSave={saveEvent} />}
    </div>
  );
}

function MiniMonth({ mini, setMini, cursor, onPick, byDay }: { mini: Date; setMini: (d: Date) => void; cursor: Date; onPick: (d: Date) => void; byDay: Record<string, Item[]> }) {
  const y = mini.getFullYear(), m = mini.getMonth();
  const start = addDays(new Date(y, m, 1), -new Date(y, m, 1).getDay());
  const cells = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const today = new Date();
  return (
    <div className="gcal-mini">
      <div className="gcal-mini-h">
        <span>{mini.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</span>
        <span className="gcal-mini-nav">
          <button onClick={() => setMini(new Date(y, m - 1, 1))}>‹</button>
          <button onClick={() => setMini(new Date(y, m + 1, 1))}>›</button>
        </span>
      </div>
      <div className="gcal-mini-grid">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <span key={i} className="gcal-mini-dow">{d}</span>)}
        {cells.map((d, i) => {
          const out = d.getMonth() !== m;
          const has = (byDay[iso(d)] ?? []).length > 0;
          return (
            <button key={i} className={`gcal-mini-cell${out ? " out" : ""}${sameDay(d, today) ? " today" : ""}${sameDay(d, cursor) ? " sel" : ""}`} onClick={() => onPick(d)}>
              {d.getDate()}{has && <i className="gcal-mini-dot" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MonthGrid({ cursor, byDay, onDay }: { cursor: Date; byDay: Record<string, Item[]>; onDay: (d: Date) => void }) {
  const y = cursor.getFullYear(), m = cursor.getMonth();
  const start = addDays(new Date(y, m, 1), -new Date(y, m, 1).getDay());
  const cells = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const today = new Date();
  return (
    <div className="gcal-month">
      <div className="gcal-month-dow">{DOW.map((d) => <div key={d}>{d}</div>)}</div>
      <div className="gcal-month-grid">
        {cells.map((d, i) => {
          const out = d.getMonth() !== m;
          const evs = byDay[iso(d)] ?? [];
          return (
            <div key={i} className={`gcal-mcell${out ? " out" : ""}`} onClick={() => onDay(d)}>
              <div className="gcal-mcell-h">
                <span className={`gcal-mcell-num${sameDay(d, today) ? " today" : ""}`}>{d.getDate()}</span>
              </div>
              <div className="gcal-mcell-evs">
                {evs.slice(0, 3).map((e) => (
                  <Chip key={e.id} e={e} />
                ))}
                {evs.length > 3 && <button className="gcal-more" onClick={(ev) => { ev.stopPropagation(); onDay(d); }}>{evs.length - 3} more</button>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Chip({ e }: { e: Item }) {
  const timeLabel = e.allDay ? "All day" : fmt12(e.mins);
  const inner = (
    <div className="gcal-chip" style={{ ["--c" as string]: COLOR(e.cal) }} title={`${timeLabel} · ${e.title}`}>
      <i className="gcal-chip-dot" />
      <b>{timeLabel}</b>
      <span className="gcal-chip-t">{e.title}</span>
    </div>
  );
  if (e.dealId) return <Link href={`?deal=${e.dealId}`} scroll={false} onClick={(ev) => ev.stopPropagation()} style={{ textDecoration: "none" }}>{inner}</Link>;
  if (e.kind === "google" && e.link) return <a href={e.link} target="_blank" rel="noopener noreferrer" onClick={(ev) => ev.stopPropagation()} style={{ textDecoration: "none" }}>{inner}</a>;
  return inner;
}

function TimeGrid({ days, byDay, onSlot }: { days: Date[]; byDay: Record<string, Item[]>; onSlot: (date: string, time: string) => void }) {
  const hours = Array.from({ length: 24 }, (_, h) => h);
  const today = new Date();
  const HOUR = 48;
  const nowMin = today.getHours() * 60 + today.getMinutes();
  return (
    <div className="gcal-time" style={{ ["--cols" as string]: days.length }}>
      <div className="gcal-time-head">
        <div className="gcal-tz" />
        {days.map((d, i) => (
          <div key={i} className="gcal-time-col-h">
            <span className="gcal-th-dow">{DOW[d.getDay()]}</span>
            <span className={`gcal-th-num${sameDay(d, today) ? " today" : ""}`}>{d.getDate()}</span>
          </div>
        ))}
      </div>
      <div className="gcal-time-body">
        <div className="gcal-gutter">
          {hours.map((h) => <div key={h} className="gcal-hr" style={{ height: HOUR }}>{h === 0 ? "" : fmt12(h * 60)}</div>)}
        </div>
        {days.map((d, ci) => {
          const evs = byDay[iso(d)] ?? [];
          return (
            <div key={ci} className="gcal-time-col">
              <div className="gcal-slots" style={{ height: HOUR * 24 }}>
                {hours.map((h) => <div key={h} className="gcal-slot" style={{ height: HOUR }} onClick={() => onSlot(iso(d), `${String(h).padStart(2, "0")}:00`)} />)}
                {sameDay(d, today) && <div className="gcal-now" style={{ top: (nowMin / 60) * HOUR }}><span /></div>}
                {evs.map((e) => (
                  <div key={e.id} className="gcal-ev" style={{ top: (e.mins / 60) * HOUR, height: HOUR * 0.92, ["--c" as string]: COLOR(e.cal) }} title={e.title}>
                    <b>{e.title}</b>
                    <span>{fmt12(e.mins)}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const DURATIONS = [15, 30, 45, 60, 90, 120];

function CreateModal({ init, onClose, onSave }: { init: { date: string; time: string }; onClose: () => void; onSave: (ev: { title: string; date: string; time: string; duration: number; invitees: string[] }) => void }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(init.date);
  const [time, setTime] = useState(init.time);
  const [duration, setDuration] = useState(30);
  const [inviteeText, setInviteeText] = useState("");

  const invitees = inviteeText.split(",").map((s) => s.trim()).filter(Boolean);
  const endTime = (() => {
    const [h, m] = time.split(":").map(Number);
    const end = new Date(0, 0, 0, h, m + duration);
    return `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`;
  })();

  return (
    <div className="gcal-modal-wrap" onClick={onClose}>
      <div className="gcal-modal" onClick={(e) => e.stopPropagation()}>
        <div className="gcal-modal-h">
          <input className="gcal-modal-title" placeholder="Add title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          <button className="gcal-modal-x" onClick={onClose}>×</button>
        </div>
        <div className="gcal-modal-body">
          <div className="gcal-field-row">
            <label className="gcal-field"><span>Date</span><input className="ui-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
            <label className="gcal-field"><span>Start</span><input className="ui-input" type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>
          </div>
          <label className="gcal-field">
            <span>Duration <small style={{ color: "var(--faint)", fontWeight: 500 }}>· ends {endTime}</small></span>
            <div className="gcal-dur">
              {DURATIONS.map((d) => (
                <button key={d} className={duration === d ? "on" : ""} onClick={() => setDuration(d)}>{d >= 60 && d % 60 === 0 ? `${d / 60}h` : `${d}m`}</button>
              ))}
            </div>
          </label>
          <label className="gcal-field">
            <span>Invitees <small style={{ color: "var(--faint)", fontWeight: 500 }}>· comma-separated emails or names</small></span>
            <input className="ui-input" placeholder="alex@client.com, Priya…" value={inviteeText} onChange={(e) => setInviteeText(e.target.value)} />
          </label>
          {invitees.length > 0 && (
            <div className="gcal-chips">{invitees.map((p, i) => <span className="gcal-invitee" key={i}>{p}</span>)}</div>
          )}
        </div>
        <div className="gcal-modal-foot">
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={() => title.trim() && onSave({ title: title.trim(), date, time, duration, invitees })}>Save</button>
        </div>
      </div>
    </div>
  );
}
