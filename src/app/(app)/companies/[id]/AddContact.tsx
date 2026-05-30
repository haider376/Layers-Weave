"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addContactAction } from "../../sales/record-actions";
import { showToast } from "@/components/Toast";

export default function AddContact({ companyId }: { companyId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  function add() {
    if (!name.trim()) return;
    start(async () => {
      await addContactAction(companyId, name);
      setName("");
      setOpen(false);
      showToast("Contact added");
      router.refresh();
    });
  }

  return (
    <div style={{ padding: "8px 16px" }}>
      {open ? (
        <div style={{ display: "flex", gap: 8 }}>
          <input className="ed" style={{ border: "1px solid var(--line-2)", flex: 1 }} placeholder="Contact name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} autoFocus />
          <button className="btn primary" style={{ flex: "none", padding: "8px 14px" }} disabled={pending} onClick={add}>Add</button>
        </div>
      ) : (
        <button className="addline" onClick={() => setOpen(true)}>+ Add contact</button>
      )}
    </div>
  );
}
