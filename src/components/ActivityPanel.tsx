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
import NavPunk from "./NavPunk";

export type TLEvent = { id: string; kind: string; title: string; body?: string; actor?: string; at: string; meta?: string };

const ICONS: Record<string, React.ReactNode> = {
  note: <NavPunk name="note" size={15} />,
  email: <NavPunk name="mail" size={15} />,
  call: <NavPunk name="phone" size={15} />,
  meeting: <NavPunk name="calendar" size={15} />,
  system: <NavPunk name="check" size={15} />,
};

// Two-step disposition (tones map to brand badge colours)
const CONNECTED_SENT = [
  { k: "SQL Booked", tone: "go" },
  { k: "Interested / Follow up", tone: "go" },
  { k: "Call Back Later", tone: "warn" },
  { k: "Not Interested", tone: "bad" },
];
const NOT_CONNECTED_SENT = [
  { k: "Left Voicemail", tone: "violet" },
  { k: "No Answer", tone: "neutral" },
  { k: "Stopped at Gatekeeper", tone: "warn" },
  { k: "Wrong Number", tone: "bad" },
];

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
  const [callConnected, setCallConnected] = useState<boolean | null>(null);
  const [callSentiment, setCallSentiment] = useState<string | null>(null);
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
            </div>
            {/* Step 1 — outcome */}
            <div className="disp-label">Outcome</div>
            <div className="disp-step">
              {([["Connected", true], ["Not connected", false]] as const).map(([lbl, val]) => (
                <button key={lbl} className={`disp-pill${callConnected === val ? (val ? " on-go" : " on-bad") : ""}`} onClick={() => { setCallConnected(val); setCallSentiment(null); }}>{lbl}</button>
              ))}
            </div>
            {/* Step 2 — sentiment (depends on outcome) */}
            {callConnected !== null && (
              <>
                <div className="disp-label">Disposition</div>
                <div className="disp-step wrap">
                  {(callConnected ? CONNECTED_SENT : NOT_CONNECTED_SENT).map((s) => (
                    <button key={s.k} className={`disp-pill sent ${s.tone}${callSentiment === s.k ? " on" : ""}`} onClick={() => setCallSentiment(s.k)}>{s.k}</button>
                  ))}
                </div>
              </>
            )}
            <textarea className="compose-input" style={{ marginTop: 10 }} rows={2} placeholder="Call notes…" value={callNotes} onChange={(e) => setCallNotes(e.target.value)} />
            <div className="compose-actions">
              <button className="btn primary" disabled={pending || !contact || callConnected === null || !callSentiment}
                onClick={() => run(
                  () => logCallAction({ companyId, dealId, contactId: contact!.id, number: contact?.phone ?? "", connected: callConnected!, sentiment: callSentiment!, notes: callNotes }),
                  () => { if (callSentiment === "SQL Booked") celebrate("sql"); setCallNotes(""); setCallConnected(null); setCallSentiment(null); },
                  callSentiment === "SQL Booked" ? undefined : "Call logged",
                )}>
                Log call
              </button>
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
