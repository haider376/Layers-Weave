"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/components/Toast";
import { celebrate } from "@/components/Celebration";
import Select from "@/components/ui/Select";
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
        <input className="ui-input" defaultValue={name} onBlur={(e) => e.target.value !== name && save({ name: e.target.value })} />
      </div>
      <div className="dg-row">
        <span className="dg-label">Amount ($)</span>
        <input className="ui-input" type="number" defaultValue={amount} onBlur={(e) => Number(e.target.value) !== amount && save({ amount: Number(e.target.value) })} />
      </div>
      <div className="dg-row">
        <span className="dg-label">Stage</span>
        <Select value={stage} disabled={pending} options={STAGES} onValueChange={(v) => save({ stage: v }, `Stage → ${v}`, v === "Closed Won")} />
      </div>
      <div className="dg-row">
        <span className="dg-label">Request type</span>
        <Select value={requestType} disabled={pending} options={[{ value: "", label: "—" }, { value: "Bulk", label: "Bulk" }, { value: "Handpick", label: "Handpick" }]} onValueChange={(v) => save({ requestType: v })} />
      </div>
      <div className="dg-row">
        <span className="dg-label">Primary contact</span>
        <Select value={contactId} disabled={pending} options={[{ value: "", label: "—" }, ...contacts.map((c) => ({ value: c.id, label: c.name }))]} onValueChange={(v) => save({ contactId: v })} />
      </div>
    </div>
  );
}
