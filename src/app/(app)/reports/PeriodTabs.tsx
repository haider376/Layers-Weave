"use client";

import Link from "next/link";

export default function PeriodTabs({ period }: { period: string }) {
  const tabs = [
    { k: "daily", label: "Daily" },
    { k: "weekly", label: "Weekly" },
    { k: "monthly", label: "Monthly" },
  ];
  return (
    <div className="roles" style={{ marginBottom: 18 }}>
      {tabs.map((t) => (
        <Link key={t.k} href={`/reports?period=${t.k}`} className={`rl${period === t.k ? " on" : ""}`}>
          {t.label}
        </Link>
      ))}
    </div>
  );
}
