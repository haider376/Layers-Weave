"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "./Toast";
import { celebrate } from "./Celebration";
import {
  logNoteAction,
  sendEmailAction,
  logCallAction,
  bookMeetingForCompanyAction,
} from "@/app/(app)/sales/record-actions";

export type TLEvent = { id: string; kind: string; title: string; body?: string; actor?: string; at: string; meta?: string };

const ICONS: Record<string, React.ReactNode> = {
  note: <svg fill="none" strokeWidth={2} viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z" /></svg>,
  email: <svg fill="none" strokeWidth={2} viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 7l-10 6L2 7" /></svg>,
  call: <svg fill="none" strokeWidth={2} viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0122 16.92z" /></svg>,
  meeting: <svg fill="none" strokeWidth={2} viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>,
  system: <svg fill="none" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>,
};

const CALL_OUTCOMES = ["Connected", "No answer", "Left voicemail", "Meeting Booked", "Not Interested", "Call Back Later"];

function timeAgo(d: Date) {
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export default function ActivityPanel({
  companyId,
  dealId,
  events,
  contact,
}: {
  companyId: string;
  dealId?: string;
  events: TLEvent[];
  contact?: { id: string; name: string; email?: string | null; phone?: string | null } | null;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"note" | "email" | "call" | "meeting">("note");
  const [pending, start] = useTransition();
  const [note, setNote] = useState("");
  const [subject, setSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [callOutcome, setCallOutcome] = useState("Connected");
  const [callNotes, setCallNotes] = useState("");

  function run(fn: () => Promise<unknown>, after?: () => void, toast?: string) {
    start(async () => {
      try {
        await fn();
        if (toast) showToast(toast);
        after?.();
        router.refresh();
      } catch {
        showToast("Action failed");
      }
    });
  }

  // Quick-action buttons (left column) dispatch this to jump to a compose tab.
  useEffect(() => {
    function onCompose(e: Event) {
      const t = (e as CustomEvent<typeof tab>).detail;
      if (t) setTab(t);
      document.getElementById("activity-anchor")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    window.addEventListener("lw-compose", onCompose);
    return () => window.removeEventListener("lw-compose", onCompose);
  }, []);

  return (
    <section className="panel" id="activity-anchor">
      <div className="panel-h">
        <h2>Activity</h2>
        <div className="compose-tabs">
          {(["note", "email", "call", "meeting"] as const).map((t) => (
            <button key={t} className={`ct-tab${tab === t ? " on" : ""}`} onClick={() => setTab(t)}>
              {t === "note" ? "Note" : t === "email" ? "Email" : t === "call" ? "Call" : "Meeting"}
            </button>
          ))}
        </div>
      </div>

      <div className="compose">
        {tab === "note" && (
          <>
            <textarea className="compose-input" rows={3} placeholder="Log a note about this account…" value={note} onChange={(e) => setNote(e.target.value)} />
            <div className="compose-actions">
              <button className="btn primary" disabled={pending || !note.trim()} onClick={() => run(() => logNoteAction({ companyId, dealId, contactId: contact?.id, body: note }), () => setNote(""), "Note logged")}>Log note</button>
            </div>
          </>
        )}
        {tab === "email" && (
          <>
            <div style={{ fontSize: 11, color: "var(--faint)", marginBottom: 8 }}>To: {contact?.email ?? "client@example.com"}</div>
            <input className="compose-input" style={{ marginBottom: 8 }} placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
            <textarea className="compose-input" rows={4} placeholder="Write your email…" value={emailBody} onChange={(e) => setEmailBody(e.target.value)} />
            <div className="compose-actions">
              <button className="btn primary" disabled={pending || (!subject.trim() && !emailBody.trim())} onClick={() => run(() => sendEmailAction({ companyId, dealId, contactId: contact?.id, toAddr: contact?.email ?? "", subject, body: emailBody }), () => { setSubject(""); setEmailBody(""); }, "Email sent ✉️")}>Send email</button>
            </div>
          </>
        )}
        {tab === "call" && (
          <>
            <div className="call-row">
              <a className="dial-btn" href={contact?.phone ? `tel:${contact.phone}` : undefined} onClick={() => showToast(`Dialing ${contact?.phone ?? ""} via Zoom Phone…`)}>
                <span className="dot" /> Dial {contact?.phone ?? "—"} via Zoom
              </a>
              <select className="ed" style={{ border: "1px solid var(--line-2)" }} value={callOutcome} onChange={(e) => setCallOutcome(e.target.value)}>
                {CALL_OUTCOMES.map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
            <textarea className="compose-input" rows={2} placeholder="Call notes…" value={callNotes} onChange={(e) => setCallNotes(e.target.value)} />
            <div className="compose-actions">
              <button className="btn primary" disabled={pending || !contact} onClick={() => run(() => logCallAction({ companyId, dealId, contactId: contact!.id, number: contact?.phone ?? "", outcome: callOutcome, notes: callNotes }), () => setCallNotes(""), "Call logged")}>Log call</button>
            </div>
          </>
        )}
        {tab === "meeting" && (
          <div className="compose-actions" style={{ justifyContent: "flex-start" }}>
            <button className="btn primary" disabled={pending} onClick={() => run(() => bookMeetingForCompanyAction(companyId), undefined, "Meeting booked — deal created")}>
              Book meeting (creates deal + meeting)
            </button>
            <button className="btn ghost" style={{ flex: "none" }} onClick={() => celebrate("sql")}>Preview celebration 🎉</button>
          </div>
        )}
      </div>

      <div className="timeline">
        {events.length === 0 && <div className="q-note" style={{ padding: 16 }}>No activity yet — log a note, email or call above.</div>}
        {events.map((e) => (
          <div className={`tl-ev ${e.kind}`} key={e.id}>
            <div className="tl-ic">{ICONS[e.kind] ?? ICONS.system}</div>
            <div className="tl-bd">
              <div className="tl-title">{e.title}{e.meta && <span className="tl-meta"> · {e.meta}</span>}</div>
              {e.body && <div className="tl-body">{e.body}</div>}
              <div className="tl-when">{e.actor ? `${e.actor} · ` : ""}{timeAgo(new Date(e.at))}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
