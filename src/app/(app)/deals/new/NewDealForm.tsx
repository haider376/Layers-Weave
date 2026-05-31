"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/components/Toast";
import Select from "@/components/ui/Select";
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
            <Select value={companyId} options={companies.map((c) => ({ value: c.id, label: c.name }))} onValueChange={(v) => { setCompanyId(v); setContactId(""); }} />
          </div>
          <div className="dg-row">
            <span className="dg-label">Contact</span>
            <Select value={contactId} options={[{ value: "", label: "—" }, ...contacts.map((c) => ({ value: c.id, label: c.name }))]} onValueChange={setContactId} />
          </div>
          <div className="dg-row">
            <span className="dg-label">Deal name</span>
            <input className="ui-input" placeholder={`${companyName} × Layers`} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="dg-row">
            <span className="dg-label">Amount ($)</span>
            <input className="ui-input" type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value) || 0)} />
          </div>
          <div className="dg-row">
            <span className="dg-label">Stage</span>
            <Select value={stage} options={STAGES} onValueChange={setStage} />
          </div>
          <div className="dg-row">
            <span className="dg-label">Request type</span>
            <Select value={requestType} options={[{ value: "", label: "—" }, { value: "Bulk", label: "Bulk" }, { value: "Handpick", label: "Handpick" }]} onValueChange={setRequestType} />
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
