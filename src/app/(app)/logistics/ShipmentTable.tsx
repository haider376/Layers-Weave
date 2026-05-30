"use client";

import { Fragment, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/components/Toast";
import { setOrderStageAction, setFulfilmentFieldAction } from "./actions";

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
  raghouse: string | null;
  lastMileCourier: string | null;
  purchaseOrderUrl: string;
  consigneeAddress: string;
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

  function saveField(s: Shipment, field: "purchaseOrderUrl" | "consigneeAddress", value: string) {
    startTransition(async () => {
      try {
        await setFulfilmentFieldAction(s.id, field, value);
        showToast("Saved");
        router.refresh();
      } catch {
        showToast("Save failed");
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
                    <div className="ship-detail">
                      <div className="sd-item">
                        <span className="sd-k">Pickup source</span>
                        <span className="sd-v">
                          {s.raghouse ? (
                            <>
                              <svg fill="none" strokeWidth={2} viewBox="0 0 24 24" style={{ width: 13, height: 13, stroke: "var(--neon)" }}><path d="M20 7l-8-4-8 4 8 4 8-4z" /><path d="M4 7v10l8 4 8-4V7" /></svg>
                              {s.raghouse}
                            </>
                          ) : (
                            <span style={{ color: "var(--faint)" }}>hidden</span>
                          )}
                        </span>
                      </div>
                      <div className="sd-item">
                        <span className="sd-k">Units</span>
                        <span className="sd-v">{s.totalUnits.toLocaleString("en-US")}</span>
                      </div>
                      <div className="sd-item">
                        <span className="sd-k">Freight</span>
                        <span className="sd-v">{s.orderType}</span>
                      </div>
                      <div className="sd-item">
                        <span className="sd-k">Last-mile</span>
                        <span className="sd-v">{s.lastMileCourier ?? "—"}</span>
                      </div>
                      <div className="sd-item" style={{ minWidth: 220 }}>
                        <span className="sd-k">Purchase order (Supply)</span>
                        <input
                          className="ed"
                          style={{ border: "1px solid var(--line-2)", minWidth: 200 }}
                          defaultValue={s.purchaseOrderUrl}
                          placeholder="PO number or document URL"
                          onClick={(e) => e.stopPropagation()}
                          onBlur={(e) =>
                            e.target.value !== s.purchaseOrderUrl &&
                            saveField(s, "purchaseOrderUrl", e.target.value)
                          }
                        />
                      </div>
                      <div className="sd-item" style={{ minWidth: 220 }}>
                        <span className="sd-k">Consignee address</span>
                        <input
                          className="ed"
                          style={{ border: "1px solid var(--line-2)", minWidth: 200 }}
                          defaultValue={s.consigneeAddress}
                          placeholder="Delivery address"
                          onClick={(e) => e.stopPropagation()}
                          onBlur={(e) =>
                            e.target.value !== s.consigneeAddress &&
                            saveField(s, "consigneeAddress", e.target.value)
                          }
                        />
                      </div>
                    </div>
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
