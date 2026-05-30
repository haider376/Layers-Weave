"use client";

import { Fragment, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/components/Toast";
import { celebrate } from "@/components/Celebration";
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
  lastMileCourier: string;
  purchaseOrderUrl: string;
  consigneeAddress: string;
  awbNo: string;
  invoiceNo3pl: string;
  layersOrderId: string;
  paymentStatus: string;
  goodsDescription: string;
  boxesBales: string;
  estimateWeight: string;
  chargeableWeight: string;
  totalChargedAmount: string;
  perKgAmount: string;
  perKgPkr: string;
  lmTid: string;
};

const STAGES = ["Preparing", "Under Quality Check", "Partially Closed", "Handed Over", "Delivered"];

function statusMeta(stage: string, note: string): { cls: string; label: string } {
  const overdue = /overdue|delay/i.test(note);
  switch (stage) {
    case "Delivered": return { cls: "go", label: "Delivered" };
    case "Handed Over": return overdue ? { cls: "bad", label: "Delayed" } : { cls: "work", label: "In transit" };
    case "Partially Closed": return overdue ? { cls: "bad", label: "Delayed" } : { cls: "work", label: "Partially closed" };
    case "Under Quality Check": return { cls: "wait", label: "In QC" };
    default: return { cls: "wait", label: "Preparing" };
  }
}

const ck = <svg fill="none" strokeWidth={2.4} viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" /></svg>;
const cd = <svg fill="none" strokeWidth={2.4} viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /></svg>;

const EDIT_FIELDS: { key: keyof Shipment; label: string; type?: "number" | "select"; options?: string[] }[] = [
  { key: "awbNo", label: "AWB No." },
  { key: "invoiceNo3pl", label: "3PL invoice no." },
  { key: "layersOrderId", label: "Layers order ID" },
  { key: "paymentStatus", label: "Payment status", type: "select", options: ["", "Paid", "Pending", "Partial"] },
  { key: "goodsDescription", label: "Goods description" },
  { key: "boxesBales", label: "Boxes / bales", type: "number" },
  { key: "estimateWeight", label: "Est. weight (kg)", type: "number" },
  { key: "chargeableWeight", label: "Chargeable wt (kg)", type: "number" },
  { key: "totalChargedAmount", label: "Total charged (£)", type: "number" },
  { key: "perKgAmount", label: "Per kg (£)", type: "number" },
  { key: "perKgPkr", label: "Per kg (PKR)", type: "number" },
  { key: "lmTid", label: "LM TID" },
  { key: "lastMileCourier", label: "Courier", type: "select", options: ["", "DPD", "UPS", "Van Delivery", "DPD EU", "DPD UK"] },
  { key: "consigneeAddress", label: "Consignee address" },
  { key: "purchaseOrderUrl", label: "Purchase order (Supply)" },
];

export default function ShipmentTable({ shipments }: { shipments: Shipment[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState<string | null>(null);

  function advance(s: Shipment, stage: string) {
    startTransition(async () => {
      try {
        await setOrderStageAction(s.id, stage);
        if (stage === "Delivered") celebrate("delivered");
        else showToast(`${s.quoteId} → ${stage}`);
        router.refresh();
      } catch { showToast("Update failed"); }
    });
  }

  function saveField(s: Shipment, field: string, value: string, original: string) {
    if (value === original) return;
    startTransition(async () => {
      try {
        await setFulfilmentFieldAction(s.id, field, value);
        showToast("Saved");
        router.refresh();
      } catch { showToast("Save failed"); }
    });
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Quote ID</th><th>Route</th><th>3PL</th><th>Freight</th><th>Payment</th><th>Status</th><th>Stage</th><th>ETA</th>
        </tr>
      </thead>
      <tbody>
        {shipments.map((s) => {
          const meta = statusMeta(s.orderStage, s.statusNote);
          const cur = Math.max(0, STAGES.indexOf(s.orderStage));
          const isOpen = open === s.id;
          const payCls = s.paymentStatus === "Paid" ? "go" : s.paymentStatus === "Partial" ? "wait" : "bad";
          return (
            <Fragment key={s.id}>
              <tr className="row" onClick={() => setOpen(isOpen ? null : s.id)}>
                <td><span className="qtag">{s.quoteId}</span></td>
                <td><span className="route"><svg fill="none" strokeWidth={2} viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></svg>{s.from} → {s.destination}</span></td>
                <td>{s.carrier}</td>
                <td><span className="grade" title={`${s.totalUnits.toLocaleString("en-US")} units`}>{s.orderType}</span></td>
                <td>{s.paymentStatus ? <span className={`st ${payCls}`}><span className="d" />{s.paymentStatus}</span> : <span style={{ color: "var(--faint)" }}>—</span>}</td>
                <td><span className={`st ${meta.cls}`}><span className="d" />{meta.label}</span></td>
                <td>
                  <select className="ed" value={s.orderStage} onClick={(e) => e.stopPropagation()} onChange={(e) => advance(s, e.target.value)}>
                    {STAGES.map((st) => <option key={st}>{st}</option>)}
                  </select>
                </td>
                <td><span className="eta">{s.eta}<small>{s.statusNote}</small></span></td>
              </tr>
              <tr className={`detail${isOpen ? " open" : ""}`}>
                <td colSpan={8}>
                  <div className="tl-wrap" style={{ maxHeight: isOpen ? 600 : 0 }}>
                    <div className="tl">
                      {STAGES.map((st, i) => {
                        const cls = i < cur ? "ok" : i === cur ? "cur" : "";
                        return <div className={`step ${cls}`} key={st}><div className="nd">{i < cur ? ck : cd}</div><div className="tx">{st}</div></div>;
                      })}
                    </div>
                    {s.raghouse !== null && (
                      <div className="supplier-note" style={{ paddingTop: 0 }}>
                        <svg fill="none" strokeWidth={2} viewBox="0 0 24 24"><path d="M20 7l-8-4-8 4 8 4 8-4z" /><path d="M4 7v10l8 4 8-4V7" /></svg>
                        Pickup source: <b style={{ color: "var(--text)" }}>{s.raghouse}</b>
                      </div>
                    )}
                    <div className="ship-edit" onClick={(e) => e.stopPropagation()}>
                      {EDIT_FIELDS.map((f) => (
                        <label className="se-field" key={String(f.key)}>
                          <span className="se-label">{f.label}</span>
                          {f.type === "select" ? (
                            <select className="se-input" defaultValue={String(s[f.key] ?? "")} onChange={(e) => saveField(s, String(f.key), e.target.value, String(s[f.key] ?? ""))}>
                              {f.options!.map((o) => <option key={o} value={o}>{o || "—"}</option>)}
                            </select>
                          ) : (
                            <input className="se-input" type={f.type === "number" ? "number" : "text"} defaultValue={String(s[f.key] ?? "")} onBlur={(e) => saveField(s, String(f.key), e.target.value, String(s[f.key] ?? ""))} />
                          )}
                        </label>
                      ))}
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
