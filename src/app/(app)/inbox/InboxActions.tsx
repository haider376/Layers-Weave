"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { markNotificationsReadAction } from "@/app/actions/notifications";
import { showToast } from "@/components/Toast";

export default function InboxActions({ hasUnread }: { hasUnread: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  if (!hasUnread) return null;
  return (
    <button className="addq" onClick={() => start(async () => { await markNotificationsReadAction(); showToast("Marked all read"); router.refresh(); })} disabled={pending}>
      Mark all read
    </button>
  );
}
