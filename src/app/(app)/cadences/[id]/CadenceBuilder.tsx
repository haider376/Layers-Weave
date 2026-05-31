"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Select from "@/components/ui/Select";
import NumberInput from "@/components/ui/NumberInput";
import { showToast } from "@/components/Toast";
import { STEP_META, STEP_TYPES, FUNCTIONS, type StepType } from "@/lib/cadences";
import { updateCadenceAction, deleteCadenceAction, saveCadenceStepsAction, removeMemberAction } from "@/app/actions/cadences";

type Step = { id: string; day: number; type: string; subject: string };
type Person = { membershipId: string; name: string; company: string; title: string; status: string; step: string; due: string | null; bucket: string; assignee: string; contactId: string };
type Cad = { id: string; name: string; function: string; priority: string; active: boolean };

const uid = () => "tmp_" + Math.random().toString(36).slice(2, 9);

export default function CadenceBuilder({ cadence, steps: initial, people }: { cadence: Cad; steps: Step[]; people: Person[] }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [tab, setTab] = useState<"overview" | "people">("overview");
  const [name, setName] = useState(cadence.name);
  const [func, setFunc] = useState(cadence.function);
  const [active, setActive] = useState(cadence.active);
  const [steps, setSteps] = useState<Step[]>(initial.length ? initial : [{ id: uid(), day: 0, type: "call", subject: "First touch" }]);
  const [dirty, setDirty] = useState(false);

  const mark = () => setDirty(true);
  const patchStep = (id: string, p: Partial<Step>) => { setSteps((s) => s.map((x) => (x.id === id ? { ...x, ...p } : x))); mark(); };
  const addStep = () => { const last = steps[steps.length - 1]; setSteps((s) => [...s, { id: uid(), day: (last?.day ?? 0) + 1, type: "call", subject: "" }]); mark(); };
  const delStep = (id: string) => { setSteps((s) => s.filter((x) => x.id !== id)); mark(); };
  const move = (id: string, dir: -1 | 1) => {
    setSteps((s) => { const i = s.findIndex((x) => x.id === id); const j = i + dir; if (j < 0 || j >= s.length) return s; const n = [...s]; [n[i], n[j]] = [n[j], n[i]]; return n; });
    mark();
  };

  function saveMeta(patch: Partial<Cad>) { start(async () => { await updateCadenceAction(cadence.id, patch); router.refresh(); }); }
  function saveSteps() {
    start(async () => {
      await saveCadenceStepsAction(cadence.id, steps.map((s) => ({ day: s.day, type: s.type, subject: s.subject })));
      setDirty(false); showToast("Cadence saved"); router.refresh();
    });
  }
  function removeCadence() {
    if (!confirm("Delete this cadence? People will be unenrolled.")) return;
    start(async () => { await deleteCadenceAction(cadence.id); showToast("Cadence deleted"); router.push("/cadences"); });
  }
  function unenroll(mid: string) { start(async () => { await removeMemberAction(mid); showToast("Removed from cadence"); router.refresh(); }); }

  const totalDays = Math.max(0, ...steps.map((s) => s.day));
  const calls = steps.filter((s) => s.type === "call").length;

  return (
    <div className="cadb">
      <div className="cadb-head">
        <input className="seq-name" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => name !== cadence.name && saveMeta({ name })} />
        <div className="cadb-head-actions">
          <div style={{ width: 140 }}><Select size="sm" value={func} options={[...FUNCTIONS]} onValueChange={(v) => { setFunc(v); saveMeta({ function: v }); }} /></div>
          <button className={`switch${active ? " on" : ""}`} onClick={() => { setActive(!active); saveMeta({ active: !active }); }} title={active ? "Active" : "Paused"}><span className="knob" /></button>
          <span className="set-row-s">{active ? "Active" : "Paused"}</span>
          <button className="seq-del" onClick={removeCadence}>Delete</button>
        </div>
      </div>

      <div className="seq-stats">
        <div><span className="seq-stat-v">{steps.length}</span><span className="seq-stat-l">Steps</span></div>
        <div><span className="seq-stat-v">{totalDays}d</span><span className="seq-stat-l">Duration</span></div>
        <div><span className="seq-stat-v">{people.filter((p) => p.status === "active").length}</span><span className="seq-stat-l">Active</span></div>
        <div><span className="seq-stat-v">{people.length}</span><span className="seq-stat-l">Total people</span></div>
        <div><span className="seq-stat-v">{calls}</span><span className="seq-stat-l">Calls</span></div>
      </div>

      <div className="cad-tabs" style={{ marginTop: 16 }}>
        <button className={tab === "overview" ? "on" : ""} onClick={() => setTab("overview")}>Overview</button>
        <button className={tab === "people" ? "on" : ""} onClick={() => setTab("people")}>People <span className="cad-chip-n">{people.length}</span></button>
        <span style={{ flex: 1 }} />
        {tab === "overview" && dirty && <button className="btn primary" style={{ flex: "none", padding: "8px 16px" }} onClick={saveSteps}>Save steps</button>}
      </div>

      {tab === "overview" ? (
        <section className="panel" style={{ padding: 20 }}>
          <div className="seq-steps" style={{ padding: 0 }}>
            {steps.map((s, i) => {
              const m = STEP_META[s.type as StepType] ?? STEP_META.task;
              return (
                <div className="seq-step" key={s.id}>
                  <div className="seq-step-rail">
                    <span className="seq-step-ic" style={{ background: m.color }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={m.icon} /></svg>
                    </span>
                    {i < steps.length - 1 && <span className="seq-step-line" />}
                  </div>
                  <div className="seq-step-body">
                    <div className="seq-step-top">
                      <span className="seq-step-n">Step {i + 1}</span>
                      <div className="seq-step-when">Day <NumberInput className="seq-day" value={s.day} onValueChange={(v) => patchStep(s.id, { day: v })} min={0} /></div>
                      <div style={{ width: 140 }}><Select size="sm" value={s.type} options={STEP_TYPES.map((t) => ({ value: t, label: STEP_META[t].label }))} onValueChange={(v) => patchStep(s.id, { type: v })} /></div>
                      <span className="cadb-move">
                        <button onClick={() => move(s.id, -1)} disabled={i === 0} title="Move up">↑</button>
                        <button onClick={() => move(s.id, 1)} disabled={i === steps.length - 1} title="Move down">↓</button>
                      </span>
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
      ) : (
        <section className="panel">
          <div className="panel-h"><h2>People in this cadence</h2><span className="count">{people.length}</span></div>
          <table>
            <thead><tr><th>Name</th><th>Company</th><th>Current step</th><th>Due</th><th>Assignee</th><th>Status</th><th /></tr></thead>
            <tbody>
              {people.map((p) => (
                <tr className="row" key={p.membershipId}>
                  <td><Link href={`/contacts/${p.contactId}`} style={{ fontWeight: 600, textDecoration: "none" }}>{p.name}</Link><small style={{ display: "block", color: "var(--faint)" }}>{p.title}</small></td>
                  <td>{p.company}</td>
                  <td>{p.step}</td>
                  <td className={`cad-due b-${p.bucket}`}>{p.due ? new Date(p.due).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—"}</td>
                  <td>{p.assignee.split(" ")[0]}</td>
                  <td><span className={`st ${p.status === "active" ? "go" : p.status === "completed" ? "init" : "bad"}`}><span className="d" />{p.status}</span></td>
                  <td>{p.status === "active" && <button className="seq-step-x" onClick={() => unenroll(p.membershipId)} title="Remove">×</button>}</td>
                </tr>
              ))}
              {people.length === 0 && <tr><td colSpan={7}><div className="q-note" style={{ padding: 36 }}>No one enrolled yet. Add people from a company or contact page.</div></td></tr>}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
