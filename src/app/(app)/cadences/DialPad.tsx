"use client";

import { useEffect, useState } from "react";
import { type DueStep } from "@/lib/cadences";

// Salesloft-style quick-dial: shows the contact, a live timer, dispositions,
// and a notes box. Logging the call advances the cadence step.
const DISPOSITIONS = [
  { k: "SQL Booked", connected: true, good: true },
  { k: "Connected", connected: true, good: true },
  { k: "Interested / Follow up", connected: true, good: true },
  { k: "Not Interested", connected: true, good: false },
  { k: "Left Voicemail", connected: false, good: false },
  { k: "No Answer", connected: false, good: false },
  { k: "Wrong Number", connected: false, good: false },
  { k: "Gatekeeper", connected: false, good: false },
];

export default function DialPad({ step, onClose, onLog }: { step: DueStep; onClose: () => void; onLog: (outcome: string) => void }) {
  const [calling, setCalling] = useState(false);
  const [secs, setSecs] = useState(0);
  const [outcome, setOutcome] = useState<string>("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!calling) return;
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [calling]);

  const mmss = `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;
  const initials = step.contactName.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="dial-wrap" onClick={onClose}>
      <div className="dial" onClick={(e) => e.stopPropagation()}>
        <button className="dial-x" onClick={onClose}>×</button>

        <div className="dial-id">
          <div className="dial-av">{initials}</div>
          <div className="dial-nm">{step.contactName}</div>
          <div className="dial-sub">{step.contactTitle || "Contact"} · {step.company}</div>
          <div className="dial-num">{step.contactPhone || "No number on file"}</div>
        </div>

        <div className={`dial-stage${calling ? " live" : ""}`}>
          {calling ? <><span className="dial-pulse" /> Connected · {mmss}</> : "Ready to dial"}
        </div>

        {!calling ? (
          <button className="dial-call" onClick={() => setCalling(true)} disabled={!step.contactPhone}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0122 16.92z" /></svg>
            Call now
          </button>
        ) : (
          <button className="dial-hang" onClick={() => setCalling(false)}>End call</button>
        )}

        <div className="dial-disp-h">Log disposition</div>
        <div className="dial-disps">
          {DISPOSITIONS.map((d) => (
            <button key={d.k} className={`dial-disp${outcome === d.k ? " on" : ""}${d.good ? " good" : ""}`} onClick={() => setOutcome(d.k)}>{d.k}</button>
          ))}
        </div>
        <textarea className="ui-textarea" placeholder="Call notes…" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />

        <div className="dial-foot">
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={!outcome} onClick={() => onLog(outcome)}>Log call &amp; advance</button>
        </div>
      </div>
    </div>
  );
}
