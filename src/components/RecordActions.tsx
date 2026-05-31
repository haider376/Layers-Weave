"use client";

import NavPunk from "./NavPunk";

const ACTS = [
  { k: "note", label: "Note", icon: <NavPunk name="note" size={16} /> },
  { k: "email", label: "Email", icon: <NavPunk name="mail" size={16} /> },
  { k: "call", label: "Call", icon: <NavPunk name="phone" size={16} /> },
  { k: "meeting", label: "Meeting", icon: <NavPunk name="calendar" size={16} /> },
] as const;

export default function RecordActions() {
  function go(k: string) {
    window.dispatchEvent(new CustomEvent("lw-compose", { detail: k }));
  }
  return (
    <div className="rec-actions">
      {ACTS.map((a) => (
        <button key={a.k} className="rec-act" onClick={() => go(a.k)}>
          <span className="rec-act-ic">{a.icon}</span>
          {a.label}
        </button>
      ))}
    </div>
  );
}
