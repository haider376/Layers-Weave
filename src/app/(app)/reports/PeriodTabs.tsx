"use client";

import Link from "next/link";

export default function PeriodTabs({ period, basePath = "/reports" }: { period: string; basePath?: string }) {
  const tabs = [
    { k: "daily", label: "Daily" },
    { k: "weekly", label: "Weekly" },
    { k: "monthly", label: "Monthly" },
  ];
  return (
    <div className="seg" style={{ marginBottom: 18 }}>
      {tabs.map((t) => (
        <Link key={t.k} href={`${basePath}?period=${t.k}`} className={period === t.k ? "on" : ""}>
          {t.label}
        </Link>
      ))}
    </div>
  );
}
