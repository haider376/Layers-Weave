"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/components/Toast";
import { savePermissionsAction } from "@/app/actions/config";
import { CAPABILITIES, SALES_ROLE_LIST, type PermissionMatrix } from "@/lib/appConfig";
import { ROLE_LABEL } from "@/lib/permissions";

const SHORT: Record<string, string> = {
  CRO: "CRO", "Sales Manager": "Mgr", "AE/QA": "AE/QA", AE: "AE",
  "AE (Probation)": "AE-P", BDR: "BDR", "Lead Gen/CRM": "CRM",
};

// Admin permission matrix — capability rows × role columns, toggle any cell.
export default function PermissionsSettings({ initial }: { initial: PermissionMatrix }) {
  const router = useRouter();
  const [matrix, setMatrix] = useState<PermissionMatrix>(initial);
  const [pending, start] = useTransition();

  const has = (cap: keyof PermissionMatrix, role: string) => matrix[cap].includes(role as never);
  const toggle = (cap: keyof PermissionMatrix, role: string) =>
    setMatrix((m) => {
      const set = new Set(m[cap] as string[]);
      if (set.has(role)) set.delete(role); else set.add(role);
      return { ...m, [cap]: [...set] as PermissionMatrix[typeof cap] };
    });

  function save() {
    start(async () => {
      try { await savePermissionsAction(matrix); showToast("Permissions saved"); router.refresh(); }
      catch { showToast("Not permitted"); }
    });
  }

  return (
    <div className="perm">
      <div className="set-row-s" style={{ marginBottom: 14 }}>Control exactly what each role can do. Changes apply across the app immediately after saving.</div>
      <div className="perm-scroll">
        <table className="perm-table">
          <thead>
            <tr>
              <th className="perm-cap-h">Capability</th>
              {SALES_ROLE_LIST.map((r) => <th key={r} title={ROLE_LABEL[r]}>{SHORT[r] ?? r}</th>)}
            </tr>
          </thead>
          <tbody>
            {CAPABILITIES.map((c) => (
              <tr key={c.key}>
                <td className="perm-cap"><div className="perm-cap-t">{c.label}</div><div className="perm-cap-d">{c.desc}</div></td>
                {SALES_ROLE_LIST.map((r) => (
                  <td key={r} className="perm-cell">
                    <button className={`perm-dot${has(c.key, r) ? " on" : ""}`} onClick={() => toggle(c.key, r)} aria-label={`${c.label} for ${r}`}>
                      {has(c.key, r) && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
        <button className="btn ghost" style={{ flex: "none", padding: "10px 18px" }} onClick={() => setMatrix(initial)} disabled={pending}>Reset</button>
        <button className="btn primary" style={{ flex: "none", padding: "10px 22px" }} onClick={save} disabled={pending}>{pending ? "Saving…" : "Save permissions"}</button>
      </div>
    </div>
  );
}
