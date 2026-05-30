"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/components/Toast";
import { createDealAction } from "../../sales/record-actions";

const STAGES = ["Appointment Scheduled", "Showed up", "Initiation", "Handpick / Bulk Vintage", "Closed Won"];

export default function NewDealForm({
  companies,
  preselect,
}: {
  companies: { id: string; name: string; contacts: { id: string; name: string }[] }[];
  preselect: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [companyId, setCompanyId] = useState(preselect || companies[0]?.id || "");
  const [name, setName] = useState("");
  const [contactId, setContactId] = useState("");
  const [amount, setAmount] = useState(500);
  const [stage, setStage] = useState("Appointment Scheduled");
  const [requestType, setRequestType] = useState("");

  const contacts = useMemo(() => companies.find((c) => c.id === companyId)?.contacts ?? [], [companies, companyId]);
  const companyName = companies.find((c) => c.id === companyId)?.name ?? "";

  function create() {
    if (!companyId) return showToast("Pick a company");
    start(async () => {
      try {
        const r = await createDealAction({
          name: name.trim() || `${companyName} × Layers`,
          companyId,
          contactId: contactId || undefined,
          amount,
          stage,
          requestType: requestType || undefined,
        });
        showToast("Deal created");
        router.push(`/deals/${r.id}`);
      } catch {
        showToast("Couldn't create deal");
      }
    });
  }

  return (
    <div className="calc" style={{ maxWidth: 560 }}>
      <div className="ccard">
        <div className="detail-grid">
          <div className="dg-row">
            <span className="dg-label">Company *</span>
            <select className="dg-input" value={companyId} onChange={(e) => { setCompanyId(e.target.value); setContactId(""); }}>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="dg-row">
            <span className="dg-label">Contact</span>
            <select className="dg-input" value={contactId} onChange={(e) => setContactId(e.target.value)}>
              <option value="">—</option>
              {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="dg-row">
            <span className="dg-label">Deal name</span>
            <input className="dg-input" placeholder={`${companyName} × Layers`} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="dg-row">
            <span className="dg-label">Amount ($)</span>
            <input className="dg-input" type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value) || 0)} />
          </div>
          <div className="dg-row">
            <span className="dg-label">Stage</span>
            <select className="dg-input" value={stage} onChange={(e) => setStage(e.target.value)}>
              {STAGES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="dg-row">
            <span className="dg-label">Request type</span>
            <select className="dg-input" value={requestType} onChange={(e) => setRequestType(e.target.value)}>
              <option value="">—</option>
              <option>Bulk</option>
              <option>Handpick</option>
            </select>
          </div>
        </div>
        <div className="cact">
          <button className="btn ghost" onClick={() => router.back()} disabled={pending}>Cancel</button>
          <button className="btn primary" onClick={create} disabled={pending || !companyId}>Create deal</button>
        </div>
      </div>
    </div>
  );
}
