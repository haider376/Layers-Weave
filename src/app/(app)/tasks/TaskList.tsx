"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { showToast } from "@/components/Toast";
import { addTaskAction, toggleTaskAction, deleteTaskAction } from "./actions";

export type TaskRow = { id: string; title: string; type: string; priority: string; done: boolean; dueDate: string | null; company: string | null; dealId: string | null };

const TYPES = ["To-do", "Call", "Email", "Follow-up", "Meeting"];
const PRIOS = ["High", "Medium", "Low"];

function bucketOf(due: string | null, done: boolean) {
  if (done) return "Done";
  if (!due) return "No date";
  const d = new Date(due); d.setHours(0, 0, 0, 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (d < today) return "Overdue";
  if (d.getTime() === today.getTime()) return "Today";
  return "Upcoming";
}
const ORDER = ["Overdue", "Today", "Upcoming", "No date", "Done"];

export default function TaskList({ tasks }: { tasks: TaskRow[] }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [title, setTitle] = useState("");
  const [type, setType] = useState("To-do");
  const [prio, setPrio] = useState("Medium");
  const [due, setDue] = useState("");

  function run(fn: () => Promise<unknown>, toast?: string) {
    start(async () => { try { await fn(); if (toast) showToast(toast); router.refresh(); } catch { showToast("Failed"); } });
  }

  const buckets = ORDER.map((b) => ({ b, items: tasks.filter((t) => bucketOf(t.dueDate, t.done) === b) })).filter((x) => x.items.length);
  const open = tasks.filter((t) => !t.done).length;

  return (
    <div>
      <div className="task-add">
        <input className="ed" style={{ border: "1px solid var(--line-2)", flex: 1, minWidth: 220 }} placeholder="Add a task…" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && title.trim()) { run(() => addTaskAction({ title, type, priority: prio, dueDate: due || undefined }), "Task added"); setTitle(""); setDue(""); } }} />
        <select className="ed" style={{ border: "1px solid var(--line-2)" }} value={type} onChange={(e) => setType(e.target.value)}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select>
        <select className="ed" style={{ border: "1px solid var(--line-2)" }} value={prio} onChange={(e) => setPrio(e.target.value)}>{PRIOS.map((p) => <option key={p}>{p}</option>)}</select>
        <input className="ed" style={{ border: "1px solid var(--line-2)" }} type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        <button className="btn primary" style={{ flex: "none", padding: "9px 18px" }} disabled={!title.trim()} onClick={() => { run(() => addTaskAction({ title, type, priority: prio, dueDate: due || undefined }), "Task added"); setTitle(""); setDue(""); }}>Add</button>
      </div>

      <div style={{ fontSize: 12, color: "var(--muted)", margin: "4px 2px 14px" }}>{open} open · {tasks.length - open} done</div>

      {buckets.map(({ b, items }) => (
        <section className="panel" style={{ marginBottom: 14 }} key={b}>
          <div className="panel-h"><h2>{b}</h2><span className="count">{items.length}</span></div>
          <div style={{ padding: "4px 0" }}>
            <AnimatePresence initial={false}>
              {items.map((t) => (
                <motion.div key={t.id} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, height: 0 }} className={`task-row${t.done ? " done" : ""}`}>
                  <button className={`task-check${t.done ? " on" : ""}`} onClick={() => run(() => toggleTaskAction(t.id))}>
                    {t.done && <svg fill="none" strokeWidth={3} viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" /></svg>}
                  </button>
                  <span className={`prio-dot ${t.priority.toLowerCase()}`} title={t.priority} />
                  <div className="task-main">
                    <span className="task-title">{t.title}</span>
                    {t.company && <span className="task-meta">{t.dealId ? <Link href={`?deal=${t.dealId}`}>{t.company}</Link> : t.company}</span>}
                  </div>
                  <span className="task-type">{t.type}</span>
                  {t.dueDate && <span className="task-due">{new Date(t.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>}
                  <button className="rm" onClick={() => run(() => deleteTaskAction(t.id))}>×</button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </section>
      ))}
      {tasks.length === 0 && <div className="q-note" style={{ padding: 20 }}>No tasks yet — add one above.</div>}
    </div>
  );
}
