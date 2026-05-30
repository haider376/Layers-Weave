"use client";

import { Fragment, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/components/Toast";
import { setOrderStageAction } from "./actions";

export type Shipment = {
  id: string;
  quoteId: string;
  from: string;
  destination: string;
  carrier: string;
  orderType: string;
  totalUnits: number;
  orderStage: string;
  statusNote: string;
  eta: string;
};

// Spec §3.8 order stages
const STAGES = ["Preparing", "Under Quality Check", "Partially Closed", "Handed Over", "Delivered"];

function statusMeta(stage: string, note: string): { cls: string; label: string } {
  const overdue = /overdue|delay/i.test(note);
  switch (stage) {
    case "Delivered":
      return { cls: "go", label: "Delivered" };
    case "Handed Over":
      return overdue ? { cls: "bad", label: "Delayed" } : { cls: "work", label: "In transit" };
    case "Partially Closed":
      return overdue ? { cls: "bad", label: "Delayed" } : { cls: "work", label: "Partially closed" };
    case "Under Quality Check":
      return { cls: "wait", label: "In QC" };
    default:
      return { cls: "wait", label: "Preparing" };
  }
}

const ck = (
  <svg fill="none" strokeWidth={2.4} viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" /></svg>
);
const cd = (
  <svg fill="none" strokeWidth={2.4} viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /></svg>
);

export default function ShipmentTable({ shipments }: { shipments: Shipment[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState<string | null>(null);

  function advance(s: Shipment, stage: string) {
    startTransition(async () => {
      try {
        await setOrderStageAction(s.id, stage);
        showToast(stage === "Delivered" ? `${s.quoteId} delivered — client notified` : `${s.quoteId} → ${stage}`);
        router.refresh();
      } catch {
        showToast("Update failed");
      }
    });
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Quote ID</th>
          <th>Route</th>
          <th>3PL</th>
          <th>Freight</th>
          <th>Status</th>
          <th>Stage</th>
          <th>ETA</th>
        </tr>
      </thead>
      <tbody>
        {shipments.map((s) => {
          const meta = statusMeta(s.orderStage, s.statusNote);
          const cur = Math.max(0, STAGES.indexOf(s.orderStage));
          const isOpen = open === s.id;
          return (
            <Fragment key={s.id}>
              <tr className="row" onClick={() => setOpen(isOpen ? null : s.id)}>
                <td><span className="qtag">{s.quoteId}</span></td>
                <td>
                  <span className="route">
                    <svg fill="none" strokeWidth={2} viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                    {s.from} → {s.destination}
                  </span>
                </td>
                <td>{s.carrier}</td>
                <td><span className="grade" title={`${s.totalUnits.toLocaleString("en-US")} units`}>{s.orderType}</span></td>
                <td><span className={`st ${meta.cls}`}><span className="d" />{meta.label}</span></td>
                <td>
                  <select
                    className="ed"
                    value={s.orderStage}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => advance(s, e.target.value)}
                  >
                    {STAGES.map((st) => (
                      <option key={st}>{st}</option>
                    ))}
                  </select>
                </td>
                <td><span className="eta">{s.eta}<small>{s.statusNote}</small></span></td>
              </tr>
              <tr className={`detail${isOpen ? " open" : ""}`}>
                <td colSpan={7}>
                  <div className="tl-wrap">
                    <div className="tl">
                      {STAGES.map((st, i) => {
                        const cls = i < cur ? "ok" : i === cur ? "cur" : "";
                        return (
                          <div className={`step ${cls}`} key={st}>
                            <div className="nd">{i < cur ? ck : cd}</div>
                            <div className="tx">{st}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </td>
              </tr>
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
}
