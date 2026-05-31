"use client";

import * as Popover from "@radix-ui/react-popover";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/components/Toast";
import { enrollContactsAction } from "@/app/actions/cadences";

type Cad = { id: string; name: string; function: string };

// Enroll a single contact (contact page) or pick contacts (company page) into a cadence.
export default function EnrollCadence({
  cadences, contactId, contacts, label = "+ Add to cadence",
}: {
  cadences: Cad[];
  contactId?: string;                                  // single-contact mode
  contacts?: { id: string; name: string }[];           // company mode (choose who)
  label?: string;
}) {
  const router = useRouter();
  const [, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>(contactId ? [contactId] : []);

  const isCompanyMode = !!contacts;

  function enroll(cadenceId: string) {
    const ids = contactId ? [contactId] : picked;
    if (!ids.length) { showToast("Pick at least one contact"); return; }
    start(async () => {
      const r = await enrollContactsAction(cadenceId, ids);
      showToast(r.added ? `Added ${r.added} to cadence` : "Already enrolled");
      setOpen(false); setPicked(contactId ? [contactId] : []); router.refresh();
    });
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild><button className="addline">{label}</button></Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="fbar-pop enroll-pop" sideOffset={6} align="start">
          <div className="ui-select-anim">
            {isCompanyMode && (
              <div className="enroll-people">
                <div className="enroll-h">Choose contacts</div>
                {contacts!.length === 0 && <div className="q-note" style={{ padding: 8, fontSize: 11 }}>No contacts on this account.</div>}
                {contacts!.map((c) => (
                  <label key={c.id} className="enroll-person">
                    <input type="checkbox" className="lv-check" checked={picked.includes(c.id)} onChange={(e) => setPicked((p) => e.target.checked ? [...p, c.id] : p.filter((x) => x !== c.id))} />
                    {c.name}
                  </label>
                ))}
              </div>
            )}
            <div className="enroll-h">Select cadence</div>
            <div className="enroll-list">
              {cadences.length === 0 && <div className="q-note" style={{ padding: 8, fontSize: 11 }}>No cadences yet.</div>}
              {cadences.map((c) => (
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
