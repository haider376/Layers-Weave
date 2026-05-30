"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/components/Toast";
import { celebrate } from "@/components/Celebration";
import { updateDealAction } from "../../sales/record-actions";

const STAGES = ["Appointment Scheduled", "Showed up", "No Show / Reschedule", "Initiation", "Handpick / Bulk Vintage", "Closed Won", "Closed Lost", "Disqualified"];

export default function DealEditor({
  dealId, name, amount, stage, requestType, contactId, contacts,
}: {
  dealId: string; name: string; amount: number; stage: string; requestType: string; contactId: string;
  contacts: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function save(data: Parameters<typeof updateDealAction>[1], toast = "Saved", celebrateWon = false) {
    start(async () => {
      try {
        await updateDealAction(dealId, data);
        if (celebrateWon) celebrate("won");
        else showToast(toast);
        router.refresh();
      } catch {
        showToast("Save failed");
      }
    });
  }

  return (
    <div className="detail-grid">
      <div className="dg-row">
        <span className="dg-label">Deal name</span>
        <input className="dg-input" defaultValue={name} onBlur={(e) => e.target.value !== name && save({ name: e.target.value })} />
      </div>
      <div className="dg-row">
        <span className="dg-label">Amount ($)</span>
        <input className="dg-input" type="number" defaultValue={amount} onBlur={(e) => Number(e.target.value) !== amount && save({ amount: Number(e.target.value) })} />
      </div>
      <div className="dg-row">
        <span className="dg-label">Stage</span>
        <select className="dg-input" defaultValue={stage} disabled={pending} onChange={(e) => save({ stage: e.target.value }, `Stage → ${e.target.value}`, e.target.value === "Closed Won")}>
          {STAGES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      <div className="dg-row">
        <span className="dg-label">Request type</span>
        <select className="dg-input" defaultValue={requestType} disabled={pending} onChange={(e) => save({ requestType: e.target.value })}>
          <option value="">—</option>
          <option>Bulk</option>
          <option>Handpick</option>
        </select>
      </div>
      <div className="dg-row">
        <span className="dg-label">Primary contact</span>
        <select className="dg-input" defaultValue={contactId} disabled={pending} onChange={(e) => save({ contactId: e.target.value })}>
          <option value="">—</option>
          {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
    </div>
  );
}
