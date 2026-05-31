"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "./Toast";
import Select from "./ui/Select";

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
            <Select value={f.value} disabled={pending} options={f.options ?? []} onValueChange={(v) => save(f.key, v, f.value)} className="dg-select" />
          ) : f.type === "textarea" ? (
            <textarea className="ui-textarea" rows={3} defaultValue={f.value} onBlur={(e) => save(f.key, e.target.value, f.value)} />
          ) : (
            <input className="ui-input" type={f.type === "number" ? "number" : "text"} defaultValue={f.value} onBlur={(e) => save(f.key, e.target.value, f.value)} />
          )}
        </div>
      ))}
    </div>
  );
}
