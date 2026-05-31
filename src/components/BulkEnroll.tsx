"use client";

import * as Popover from "@radix-ui/react-popover";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/components/Toast";
import { enrollContactsAction, enrollCompaniesAction } from "@/app/actions/cadences";

export type CadenceOpt = { id: string; name: string; function: string };

// A compact "Add N to cadence" control for list views (People/Leads bulk select).
// `mode="company"` enrolls every contact under the selected company/lead ids.
export default function BulkEnroll({ cadences, ids, mode = "contact", onDone }: { cadences: CadenceOpt[]; ids: string[]; mode?: "contact" | "company"; onDone?: () => void }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const list = cadences.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()));
  const noun = mode === "company" ? "leads" : "people";

  function enroll(cadenceId: string) {
    if (!ids.length) { showToast(`Select ${noun} first`); return; }
    start(async () => {
      try {
        const r = mode === "company" ? await enrollCompaniesAction(cadenceId, ids) : await enrollContactsAction(cadenceId, ids);
        showToast(r.added ? `Added ${r.added} to cadence` : "Already enrolled / no contacts");
        setOpen(false); onDone?.(); router.refresh();
      } catch { showToast("Couldn't enroll — try again"); }
    });
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button className="btn primary lv-btn" disabled={!ids.length}>+ Add to cadence{ids.length ? ` (${ids.length})` : ""}</button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="fbar-pop enroll-pop" sideOffset={6} align="end">
          <div className="ui-select-anim">
            <input className="ui-input" style={{ marginBottom: 8 }} placeholder="Search cadences…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
            <div className="enroll-list">
              {list.length === 0 && <div className="q-note" style={{ padding: 8, fontSize: 11 }}>No cadences. Create one first.</div>}
              {list.map((c) => (
                <button key={c.id} className="enroll-cad" onClick={() => enroll(c.id)}>
                  <span>{c.name}</span><span className="enroll-fn">{c.function}</span>
                </button>
              ))}
            </div>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
