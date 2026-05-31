"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { addTaskAction, toggleTaskAction, deleteTaskAction } from "@/app/(app)/tasks/actions";
import { showToast } from "./Toast";

export type RTask = { id: string; title: string; type: string; priority: string; done: boolean; dueDate: string | null };

export default function RecordTasks({ companyId, contactId, tasks }: { companyId?: string; contactId?: string; tasks: RTask[] }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [title, setTitle] = useState("");

  function run(fn: () => Promise<unknown>, toast?: string) {
    start(async () => { try { await fn(); if (toast) showToast(toast); router.refresh(); } catch { showToast("Failed"); } });
  }
  function add() {
    if (!title.trim()) return;
    run(() => addTaskAction({ title, type: "To-do", priority: "Medium", companyId, contactId }), "Task added");
    setTitle("");
  }

  const open = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);

  return (
    <section className="panel">
      <div className="panel-h"><h2>Tasks</h2><span className="count">{open.length} open</span></div>
      <div style={{ padding: "10px 14px" }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          <input className="ed" style={{ border: "1px solid var(--line-2)", flex: 1 }} placeholder="Add a task for this record…" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
          <button className="btn primary" style={{ flex: "none", padding: "7px 14px" }} disabled={!title.trim()} onClick={add}>Add</button>
        </div>
        <AnimatePresence initial={false}>
          {[...open, ...done].map((t) => (
            <motion.div key={t.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }} className={`task-row${t.done ? " done" : ""}`} style={{ padding: "8px 2px" }}>
              <button className={`task-check${t.done ? " on" : ""}`} onClick={() => run(() => toggleTaskAction(t.id))}>{t.done && <svg fill="none" strokeWidth={3} viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" /></svg>}</button>
              <span className={`prio-dot ${t.priority.toLowerCase()}`} />
              <span className="task-title" style={{ flex: 1, fontSize: 12.5 }}>{t.title}</span>
              {t.dueDate && <span className="task-due">{new Date(t.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>}
              <button className="rm" onClick={() => run(() => deleteTaskAction(t.id))}>×</button>
            </motion.div>
          ))}
        </AnimatePresence>
        {tasks.length === 0 && <div className="q-note" style={{ padding: 10 }}>No tasks yet.</div>}
      </div>
    </section>
  );
}
