"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { showToast } from "@/components/Toast";
import {
  bookMeetingAction,
  moveDealAction,
  requestQuoteAction,
  setMeetingStatusAction,
} from "./actions";

export type BoardDeal = {
  id: string;
  name: string;
  amount: number;
  stage: string;
  ownerInitials: string;
  quoteId: string | null;
};

const COLUMNS: { stage: string; cls: string }[] = [
  { stage: "Appointment Scheduled", cls: "" },
  { stage: "Showed up", cls: "" },
  { stage: "No Show / Reschedule", cls: "noshow" },
  { stage: "Initiation", cls: "init" },
  { stage: "Handpick / Bulk Vintage", cls: "work" },
  { stage: "Closed Won", cls: "won" },
  { stage: "Closed Lost", cls: "lost" },
  { stage: "Disqualified", cls: "dq" },
];

export default function Board({ deals }: { deals: BoardDeal[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<string | null>(null);
  const [showBook, setShowBook] = useState(false);
  const [clientName, setClientName] = useState("");

  function run(fn: () => Promise<unknown>, toast?: string) {
    startTransition(async () => {
      try {
        const r = await fn();
        if (toast) showToast(toast);
        if (r && typeof r === "object" && "quoteId" in r && (r as { quoteId: string }).quoteId) {
          showToast(`Quote ${(r as { quoteId: string }).quoteId} created · deal → Initiation`);
        }
        router.refresh();
      } catch {
        showToast("Action failed");
      }
    });
  }

  function onDrop(stage: string) {
    if (!dragId) return;
    const deal = deals.find((d) => d.id === dragId);
    setOverStage(null);
    setDragId(null);
    if (!deal || deal.stage === stage) return;
    run(() => moveDealAction(deal.id, stage), `${deal.name} → ${stage}`);
  }

  return (
    <>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center" }}>
        <button className="addq" style={{ marginLeft: 0 }} onClick={() => setShowBook((s) => !s)}>
          + Book meeting (SQL)
        </button>
        {showBook && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              className="ed"
              style={{ border: "1px solid var(--line-2)", minWidth: 180 }}
              placeholder="Client / company name"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && clientName.trim()) {
                  run(() => bookMeetingAction(clientName), `Deal + meeting created for ${clientName}`);
                  setClientName("");
                  setShowBook(false);
                }
              }}
            />
            <button
              className="btn primary"
              style={{ padding: "8px 14px", flex: "none" }}
              disabled={!clientName.trim() || pending}
              onClick={() => {
                run(() => bookMeetingAction(clientName), `Deal + meeting created for ${clientName}`);
                setClientName("");
                setShowBook(false);
              }}
            >
              Create
            </button>
          </div>
        )}
        <span style={{ fontSize: 11, color: "var(--faint)" }}>
          Booking creates the deal + meeting in one step · drag cards to advance stages
        </span>
      </div>

      <div className="board">
        {COLUMNS.map((col) => {
          const colDeals = deals.filter((d) => d.stage === col.stage);
          return (
            <div
              key={col.stage}
              className={`col ${col.cls}${overStage === col.stage ? " dragover" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setOverStage(col.stage);
              }}
              onDragLeave={() => setOverStage((s) => (s === col.stage ? null : s))}
              onDrop={() => onDrop(col.stage)}
            >
              <div className="col-h">
                <span className="accent" />
                <span className="t">{col.stage}</span>
                <span className="c">{colDeals.length}</span>
              </div>
              <div className="col-b">
                {colDeals.map((d) => (
                  <div
                    key={d.id}
                    className={`deal${dragId === d.id ? " drag" : ""}`}
                    draggable
                    onDragStart={() => setDragId(d.id)}
                    onDragEnd={() => {
                      setDragId(null);
                      setOverStage(null);
                    }}
                  >
                    <div className="dn">{d.name}</div>
                    <div className="meta">
                      <span className="amt">${d.amount.toLocaleString("en-US")}</span>
                      {d.quoteId && <span className="qid">{d.quoteId}</span>}
                    </div>
                    <div className="own">
                      <span className="av">{d.ownerInitials}</span>
                      Owner
                    </div>

                    {col.stage === "Showed up" && (
                      <button
                        className="price-btn"
                        onClick={() => run(() => requestQuoteAction(d.id))}
                        disabled={pending}
                      >
                        Requested a quote →
                      </button>
                    )}
                    {col.stage === "Appointment Scheduled" && (
                      <button
                        className="price-btn"
                        onClick={() => run(() => setMeetingStatusAction(d.id, "Showed up"), `${d.name} showed up`)}
                        disabled={pending}
                      >
                        Mark showed up
                      </button>
                    )}
                    {(col.stage === "Initiation" || col.stage === "Handpick / Bulk Vintage") && (
                      <a className="price-btn" href={d.quoteId ? `/calculator?quote=${d.quoteId}` : "/calculator"}>
                        <svg fill="none" strokeWidth={2} viewBox="0 0 24 24"><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M8 6h8M8 10h2M14 14h2" /></svg>
                        Price quote
                      </a>
                    )}
                  </div>
                ))}
                {colDeals.length === 0 && <div style={{ fontSize: 11, color: "var(--faint)", padding: 4 }}>—</div>}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
