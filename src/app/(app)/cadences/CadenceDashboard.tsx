"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Sparkline from "@/components/Sparkline";
import { showToast } from "@/components/Toast";
import { STEP_META, type StepType, type DueStep } from "@/lib/cadences";
import { completeStepAction } from "@/app/actions/cadences";
import DialPad from "./DialPad";
import CadenceList, { type CadenceRow } from "./CadenceList";
import CreateCadenceButton from "./CreateCadenceButton";

type FeedItem = { id: string; kind: "call" | "meeting"; who: string; detail: string; connected: boolean; at: string; ago: string; agent: string };
type Stats = { prioritized: number; completedToday: number; callsThisMonth: number; oppsCreated: number };

const BUCKETS = [
  { k: "all", label: "All open" },
  { k: "overdue", label: "Overdue" },
  { k: "today", label: "Due today" },
  { k: "thisweek", label: "Due this week" },
  { k: "later", label: "Upcoming" },
] as const;

export default function CadenceDashboard({ cadences, dueSteps, feed, me, stats }: {
  cadences: CadenceRow[]; dueSteps: DueStep[]; feed: FeedItem[]; me: string; stats: Stats;
}) {
  const router = useRouter();
  const [, start] = useTransition();
  const [tab, setTab] = useState<"rhythm" | "cadences">("rhythm");
  const [bucket, setBucket] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [mineOnly, setMineOnly] = useState(false);
  const [q, setQ] = useState("");
  const [dial, setDial] = useState<DueStep | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: dueSteps.length, overdue: 0, today: 0, thisweek: 0, later: 0 };
    for (const d of dueSteps) c[d.bucket]++;
    return c;
  }, [dueSteps]);

  const filtered = useMemo(() => {
    return dueSteps.filter((d) => {
      if (bucket !== "all" && d.bucket !== bucket) return false;
      if (typeFilter !== "all" && d.stepType !== typeFilter) return false;
      if (mineOnly && d.assignee !== me) return false;
      if (q.trim()) { const t = q.toLowerCase(); if (![d.contactName, d.company, d.cadenceName].some((x) => x.toLowerCase().includes(t))) return false; }
      return true;
    });
  }, [dueSteps, bucket, typeFilter, mineOnly, q, me]);

  // little 14-pt activity spark from the feed (calls/day proxy)
  const spark = useMemo(() => {
    const days = Array(14).fill(0);
    const now = Date.now();
    for (const f of feed) { const idx = 13 - Math.min(13, Math.floor((now - new Date(f.at).getTime()) / 86400000)); if (idx >= 0) days[idx]++; }
    return days;
  }, [feed]);

  function runStep(d: DueStep, outcome?: string) {
    start(async () => {
      try { await completeStepAction(d.membershipId, outcome); showToast(`${d.stepType === "call" ? "Call logged" : "Step completed"} · ${d.contactName}`); setDial(null); router.refresh(); }
      catch { showToast("Couldn't complete step"); }
    });
  }


  return (
    <div className="cad">
      {/* ── Header stat strip (Salesloft Rhythm/Activities/Outcomes) ── */}
      <div className="cad-strip">
        <div className="cad-stat">
          <div className="cad-stat-eyebrow">Today&apos;s rhythm</div>
          <div className="cad-stat-row">
            <div><div className="cad-stat-v">{stats.prioritized}</div><div className="cad-stat-l">Prioritized</div></div>
            <div><div className="cad-stat-v">{stats.completedToday}</div><div className="cad-stat-l">Completed</div></div>
          </div>
        </div>
        <div className="cad-stat">
          <div className="cad-stat-eyebrow">Activity</div>
          <div className="cad-stat-row">
            <div><div className="cad-stat-v">{stats.callsThisMonth}</div><div className="cad-stat-l">Calls · this month</div></div>
            <div className="cad-spark"><Sparkline data={spark} height={42} /></div>
          </div>
        </div>
        <div className="cad-stat">
          <div className="cad-stat-eyebrow">Outcomes</div>
          <div className="cad-stat-row">
            <div><div className="cad-stat-v">{stats.oppsCreated}</div><div className="cad-stat-l">Opportunities · this month</div></div>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="cad-tabs">
        <button className={tab === "rhythm" ? "on" : ""} onClick={() => setTab("rhythm")}>Rhythm</button>
        <button className={tab === "cadences" ? "on" : ""} onClick={() => setTab("cadences")}>Cadences</button>
        <span style={{ flex: 1 }} />
        <CreateCadenceButton />
      </div>

      {tab === "rhythm" ? (
        <div className="cad-body">
          {/* Task queue */}
          <div className="cad-queue">
            <div className="cad-q-toolbar">
              <div className="cad-chips">
                {BUCKETS.map((b) => (
                  <button key={b.k} className={`cad-chip${bucket === b.k ? " on" : ""}`} onClick={() => setBucket(b.k)}>
                    {b.label}<span className="cad-chip-n">{counts[b.k] ?? 0}</span>
                  </button>
                ))}
              </div>
              <div className="cad-q-filters">
                <input className="ui-input" style={{ maxWidth: 200 }} placeholder="Search people…" value={q} onChange={(e) => setQ(e.target.value)} />
                <div className="cad-type-seg">
                  <button className={typeFilter === "all" ? "on" : ""} onClick={() => setTypeFilter("all")}>All</button>
                  {(["call", "email", "linkedin", "task"] as StepType[]).map((t) => (
                    <button key={t} className={typeFilter === t ? "on" : ""} onClick={() => setTypeFilter(t)} title={STEP_META[t].label}>{STEP_META[t].label}</button>
                  ))}
                </div>
                <label className="cad-mine"><input type="checkbox" className="lv-check" checked={mineOnly} onChange={(e) => setMineOnly(e.target.checked)} /> Mine</label>
              </div>
            </div>

            <div className="cad-list-head">
              <span>Step</span><span>Person</span><span>Cadence</span><span>Due</span><span className="cad-run-h">Action</span>
            </div>
            <div className="cad-list">
              {filtered.map((d) => {
                const m = STEP_META[d.stepType];
                return (
                  <div className={`cad-row b-${d.bucket}`} key={d.membershipId}>
                    <span className="cad-step">
                      <span className="cad-step-ic" style={{ background: m.color }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={m.icon} /></svg>
                      </span>
                      <span className="cad-step-t"><b>{d.stepSubject || m.label}</b><small>{d.stepLabel}</small></span>
                    </span>
                    <span className="cad-person">
                      <Link href={`/contacts/${d.contactId}`} className="cad-person-n">{d.contactName}</Link>
                      <small>{d.company}</small>
                    </span>
                    <span className="cad-cad"><Link href={`/cadences/${d.cadenceId}`}>{d.cadenceName}</Link></span>
                    <span className={`cad-due b-${d.bucket}`}>{d.bucket === "overdue" ? "Overdue" : d.bucket === "today" ? "Today" : new Date(d.due).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                    <span className="cad-run">
                      {d.stepType === "call"
                        ? <button className="cad-dial" onClick={() => setDial(d)} title="Quick dial"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d={STEP_META.call.icon} /></svg>Dial</button>
                        : <button className="cad-done" onClick={() => runStep(d)}>Complete</button>}
                    </span>
                  </div>
                );
              })}
              {filtered.length === 0 && <div className="q-note" style={{ padding: 40 }}>Nothing due here. 🎉</div>}
            </div>
          </div>

          {/* Live feed */}
          <aside className="cad-feed">
            <div className="cad-feed-h">Live feed</div>
            <div className="cad-feed-list">
              {feed.map((f) => (
                <div className="cad-feed-i" key={f.id}>
                  <span className={`cad-feed-dot ${f.kind}${f.connected ? " ok" : ""}`} />
                  <div className="cad-feed-b">
                    <div className="cad-feed-t"><b>{f.who}</b> · {f.detail}</div>
                    <div className="cad-feed-m">{f.agent ? `${f.agent.split(" ")[0]} · ` : ""}{f.ago}</div>
                  </div>
                </div>
              ))}
              {feed.length === 0 && <div className="q-note" style={{ padding: 24 }}>No activity yet.</div>}
            </div>
          </aside>
        </div>
      ) : (
        <CadenceList cadences={cadences} />
      )}

      {dial && <DialPad step={dial} onClose={() => setDial(null)} onLog={(outcome) => runStep(dial, outcome)} />}
    </div>
  );
}
