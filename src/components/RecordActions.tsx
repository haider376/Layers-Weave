"use client";

const ACTS = [
  { k: "note", label: "Note", icon: <svg fill="none" strokeWidth={2} viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z" /></svg> },
  { k: "email", label: "Email", icon: <svg fill="none" strokeWidth={2} viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 7l-10 6L2 7" /></svg> },
  { k: "call", label: "Call", icon: <svg fill="none" strokeWidth={2} viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0122 16.92z" /></svg> },
  { k: "meeting", label: "Meeting", icon: <svg fill="none" strokeWidth={2} viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg> },
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
