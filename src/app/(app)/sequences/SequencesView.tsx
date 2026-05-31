"use client";

import { useEffect, useMemo, useState } from "react";
import Select from "@/components/ui/Select";
import NumberInput from "@/components/ui/NumberInput";
import { showToast } from "@/components/Toast";

type StepType = "email" | "call" | "linkedin" | "task";
type Step = { id: string; type: StepType; day: number; subject: string };
type Sequence = { id: string; name: string; active: boolean; steps: Step[]; enrolled: number };

const STEP_META: Record<StepType, { label: string; color: string; icon: string }> = {
  email: { label: "Email", color: "#1a73e8", icon: "M2 7l10 6 10-6M2 7v10a2 2 0 002 2h16a2 2 0 002-2V7M2 7a2 2 0 012-2h16a2 2 0 012 2" },
  call: { label: "Call", color: "#0b8043", icon: "M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0122 16.92z" },
  linkedin: { label: "LinkedIn", color: "#7c3aed", icon: "M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-4 0v7h-4v-7a6 6 0 016-6zM2 9h4v12H2zM4 6a2 2 0 100-4 2 2 0 000 4z" },
  task: { label: "Task", color: "#f09300", icon: "M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" },
};

const uid = () => Math.random().toString(36).slice(2, 9);
const KEY = "lw-sequences";

const SEED: Sequence[] = [
  { id: uid(), name: "New wholesale lead — 7 touch", active: true, enrolled: 14, steps: [
    { id: uid(), type: "email", day: 0, subject: "Intro — Layers vintage wholesale" },
    { id: uid(), type: "call", day: 1, subject: "Discovery call" },
    { id: uid(), type: "linkedin", day: 2, subject: "Connect + view profile" },
    { id: uid(), type: "email", day: 4, subject: "Case study: 2k Carhartt pull" },
    { id: uid(), type: "call", day: 6, subject: "Follow-up call" },
  ] },
  { id: uid(), name: "Re-engage cold accounts", active: false, enrolled: 0, steps: [
    { id: uid(), type: "email", day: 0, subject: "Still sourcing vintage?" },
    { id: uid(), type: "task", day: 3, subject: "Review account & tier" },
    { id: uid(), type: "call", day: 5, subject: "Break-up call" },
  ] },
];

export default function SequencesView() {
  const [seqs, setSeqs] = useState<Sequence[]>(SEED);
  const [activeId, setActiveId] = useState<string>(SEED[0].id);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { const s = JSON.parse(raw) as Sequence[]; if (s.length) { setSeqs(s); setActiveId(s[0].id); } }
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);
  useEffect(() => { if (loaded) try { localStorage.setItem(KEY, JSON.stringify(seqs)); } catch { /* ignore */ } }, [seqs, loaded]);

  const active = useMemo(() => seqs.find((s) => s.id === activeId) ?? seqs[0], [seqs, activeId]);

  function patchSeq(id: string, patch: Partial<Sequence>) { setSeqs((ss) => ss.map((s) => (s.id === id ? { ...s, ...patch } : s))); }
  function addSeq() {
    const s: Sequence = { id: uid(), name: "Untitled sequence", active: false, enrolled: 0, steps: [{ id: uid(), type: "email", day: 0, subject: "First touch" }] };
    setSeqs((ss) => [...ss, s]); setActiveId(s.id); showToast("Sequence created");
  }
  function delSeq(id: string) { setSeqs((ss) => { const n = ss.filter((s) => s.id !== id); if (id === activeId && n.length) setActiveId(n[0].id); return n; }); }
  function addStep() { if (!active) return; const last = active.steps[active.steps.length - 1]; patchSeq(active.id, { steps: [...active.steps, { id: uid(), type: "email", day: (last?.day ?? 0) + 2, subject: "" }] }); }
  function patchStep(sid: string, patch: Partial<Step>) { if (!active) return; patchSeq(active.id, { steps: active.steps.map((s) => (s.id === sid ? { ...s, ...patch } : s)) }); }
  function delStep(sid: string) { if (!active) return; patchSeq(active.id, { steps: active.steps.filter((s) => s.id !== sid) }); }

  const totalDays = active ? Math.max(0, ...active.steps.map((s) => s.day)) : 0;

  return (
    <div className="seqs">
      {/* List rail */}
      <aside className="seq-rail">
        <button className="btn primary" style={{ width: "100%", marginBottom: 12 }} onClick={addSeq}>+ New sequence</button>
        {seqs.map((s) => (
          <button key={s.id} className={`seq-item${s.id === activeId ? " on" : ""}`} onClick={() => setActiveId(s.id)}>
            <span className={`seq-status${s.active ? " live" : ""}`} />
            <span className="seq-item-t">
              <span className="seq-item-n">{s.name}</span>
              <span className="seq-item-m">{s.steps.length} steps · {s.enrolled} enrolled</span>
            </span>
          </button>
        ))}
      </aside>

      {/* Builder */}
      {active && (
        <section className="panel seq-builder">
          <div className="seq-head">
            <input className="seq-name" value={active.name} onChange={(e) => patchSeq(active.id, { name: e.target.value })} />
            <div className="seq-head-actions">
              <button className={`switch${active.active ? " on" : ""}`} onClick={() => patchSeq(active.id, { active: !active.active })} title={active.active ? "Active" : "Paused"}><span className="knob" /></button>
              <span className="set-row-s">{active.active ? "Active" : "Paused"}</span>
              <button className="seq-del" onClick={() => delSeq(active.id)} title="Delete sequence">Delete</button>
            </div>
          </div>

          <div className="seq-stats">
            <div><span className="seq-stat-v">{active.steps.length}</span><span className="seq-stat-l">Steps</span></div>
            <div><span className="seq-stat-v">{totalDays}d</span><span className="seq-stat-l">Duration</span></div>
            <div><span className="seq-stat-v">{active.enrolled}</span><span className="seq-stat-l">Enrolled</span></div>
            <div><span className="seq-stat-v">{active.steps.filter((s) => s.type === "email").length}</span><span className="seq-stat-l">Emails</span></div>
            <div><span className="seq-stat-v">{active.steps.filter((s) => s.type === "call").length}</span><span className="seq-stat-l">Calls</span></div>
          </div>

          <div className="seq-steps">
            {active.steps.map((s, i) => {
              const m = STEP_META[s.type];
              return (
                <div className="seq-step" key={s.id}>
                  <div className="seq-step-rail">
                    <span className="seq-step-ic" style={{ background: m.color }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={m.icon} /></svg>
                    </span>
                    {i < active.steps.length - 1 && <span className="seq-step-line" />}
                  </div>
                  <div className="seq-step-body">
                    <div className="seq-step-top">
                      <span className="seq-step-n">Step {i + 1}</span>
                      <div className="seq-step-when">Day <NumberInput className="seq-day" value={s.day} onValueChange={(v) => patchStep(s.id, { day: v })} min={0} /></div>
                      <div style={{ width: 130 }}><Select size="sm" value={s.type} options={(Object.keys(STEP_META) as StepType[]).map((t) => ({ value: t, label: STEP_META[t].label }))} onValueChange={(v) => patchStep(s.id, { type: v as StepType })} /></div>
                      <button className="seq-step-x" onClick={() => delStep(s.id)} title="Remove step">×</button>
                    </div>
                    <input className="ui-input" placeholder={`${m.label} subject / note…`} value={s.subject} onChange={(e) => patchStep(s.id, { subject: e.target.value })} />
                  </div>
                </div>
              );
            })}
            <button className="addline" onClick={addStep}>+ Add step</button>
          </div>
        </section>
      )}
    </div>
  );
}
