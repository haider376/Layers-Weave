"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setCompanyOwnerAction } from "../../sales/record-actions";
import { showToast } from "@/components/Toast";
import Select from "@/components/ui/Select";

export default function OwnerSelect({ companyId, field, value, users }: { companyId: string; field: "ownerId" | "bdrId"; value: string; users: { id: string; name: string }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [val, setVal] = useState(value);
  return (
    <Select
      value={val}
      disabled={pending}
      size="sm"
      options={[{ value: "", label: "—" }, ...users.map((u) => ({ value: u.id, label: u.name }))]}
      onValueChange={(v) => { setVal(v); start(async () => { try { await setCompanyOwnerAction(companyId, field, v); showToast("Owner updated"); router.refresh(); } catch { showToast("Not permitted"); } }); }}
    />
  );
}
