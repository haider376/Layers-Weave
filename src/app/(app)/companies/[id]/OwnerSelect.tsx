"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setCompanyOwnerAction } from "../../sales/record-actions";
import { showToast } from "@/components/Toast";

export default function OwnerSelect({ companyId, field, value, users }: { companyId: string; field: "ownerId" | "bdrId"; value: string; users: { id: string; name: string }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <select
      className="dg-input"
      style={{ maxWidth: 160 }}
      defaultValue={value}
      disabled={pending}
      onChange={(e) => start(async () => { try { await setCompanyOwnerAction(companyId, field, e.target.value); showToast("Owner updated"); router.refresh(); } catch { showToast("Not permitted"); } })}
    >
      <option value="">—</option>
      {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
    </select>
  );
}
