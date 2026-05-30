"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { showToast } from "@/components/Toast";
import { celebrate } from "@/components/Celebration";
import { bookMeetingAction, moveDealAction } from "./actions";

export type BoardDeal = {
  id: string;
  name: string;
  amount: number;
  stage: string;
  ownerInitials: string;
  quoteId: string | null;
};

const STAGES = [
  "Appointment Scheduled",
  "Showed up",
  "No Show / Reschedule",
  "Initiation",
  "Handpick / Bulk Vintage",
  "Closed Won",
  "Closed Lost",
  "Disqualified",
];

const COLUMN_CLS: Record<string, string> = {
  "No Show / Reschedule": "noshow",
  Initiation: "init",
  "Handpick / Bulk Vintage": "work",
  "Closed Won": "won",
  "Closed Lost": "lost",
  Disqualified: "dq",
};

export default function Board({ deals }: { deals: BoardDeal[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<string | null>(null);
  const [showBook, setShowBook] = useState(false);
  const [clientName, setClientName] = useState("");

  function changeStage(deal: BoardDeal, stage: string) {
    if (deal.stage === stage) return;
    startTransition(async () => {
      try {
        await moveDealAction(deal.id, stage);
        if (stage === "Closed Won") celebrate("won");
        else showToast(`${deal.name} → ${stage}`);
        router.refresh();
      } catch {
        showToast("Couldn't move deal");
      }
    });
  }

  function book() {
    const name = clientName.trim();
    if (!name) return;
    startTransition(async () => {
      try {
        await bookMeetingAction(name);
        celebrate("sql");
        setClientName("");
        setShowBook(false);
        router.refresh();
      } catch {
        showToast("Couldn't book meeting");
      }
    });
  }

  return (
    <>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <button className="addq" style={{ marginLeft: 0 }} onClick={() => setShowBook((s) => !s)}>
          + Book meeting (SQL)
        </button>
        {showBook && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              className="ed"
              style={{ border: "1px solid var(--line-2)", minWidth: 200 }}
              placeholder="Client / company name"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && book()}
              autoFocus
            />
            <button className="btn primary" style={{ padding: "8px 14px", flex: "none" }} disabled={!clientName.trim() || pending} onClick={book}>
              Create deal + meeting
            </button>
          </div>
        )}
        <span style={{ fontSize: 11, color: "var(--faint)" }}>
          Booking creates the deal + meeting together · change stage with the dropdown or drag a card
        </span>
      </div>

      <div className="board">
        {STAGES.map((stage) => {
          const colDeals = deals.filter((d) => d.stage === stage);
          return (
            <div
              key={stage}
              className={`col ${COLUMN_CLS[stage] ?? ""}${overStage === stage ? " dragover" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setOverStage(stage);
              }}
              onDragLeave={() => setOverStage((s) => (s === stage ? null : s))}
              onDrop={() => {
                const deal = dragId ? deals.find((d) => d.id === dragId) : null;
                setOverStage(null);
                setDragId(null);
                if (deal) changeStage(deal, stage);
              }}
            >
              <div className="col-h">
                <span className="accent" />
                <span className="t">{stage}</span>
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
                    <a className="dn dn-link" href={`?deal=${d.id}`}>{d.name}</a>
                    <div className="meta">
                      <span className="amt">${d.amount.toLocaleString("en-US")}</span>
                      {d.quoteId && <span className="qid">{d.quoteId}</span>}
                    </div>
                    <div className="own">
                      <span className="av">{d.ownerInitials}</span>
                      Owner
                    </div>
                    <select
                      className="stage-select"
                      value={d.stage}
                      disabled={pending}
                      onChange={(e) => changeStage(d, e.target.value)}
                    >
                      {STAGES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
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
