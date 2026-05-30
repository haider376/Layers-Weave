"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "./Toast";

export type FieldDef = {
  key: string;
  label: string;
  value: string;
  type?: "text" | "select" | "number" | "textarea";
  options?: string[];
};

export default function EditableDetails({
  id,
  fields,
  action,
}: {
  id: string;
  fields: FieldDef[];
  action: (id: string, data: Record<string, string>) => Promise<void>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function save(key: string, value: string, original: string) {
    if (value === original) return;
    start(async () => {
      try {
        await action(id, { [key]: value });
        showToast("Saved");
        router.refresh();
      } catch {
        showToast("Save failed");
      }
    });
  }

  return (
    <div className="detail-grid">
      {fields.map((f) => (
        <div className="dg-row" key={f.key}>
          <span className="dg-label">{f.label}</span>
          {f.type === "select" ? (
            <select className="dg-input" defaultValue={f.value} disabled={pending} onChange={(e) => save(f.key, e.target.value, f.value)}>
              {f.options?.map((o) => <option key={o} value={o}>{o || "—"}</option>)}
            </select>
          ) : f.type === "textarea" ? (
            <textarea className="dg-input" rows={3} defaultValue={f.value} onBlur={(e) => save(f.key, e.target.value, f.value)} />
          ) : (
            <input className="dg-input" type={f.type === "number" ? "number" : "text"} defaultValue={f.value} onBlur={(e) => save(f.key, e.target.value, f.value)} />
          )}
        </div>
      ))}
    </div>
  );
}
