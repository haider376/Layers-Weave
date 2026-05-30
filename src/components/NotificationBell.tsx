"use client";

import { useEffect, useRef, useState } from "react";
import { getMyNotificationsAction, markNotificationsReadAction } from "@/app/actions/notifications";

type Note = { id: string; audience: string; body: string; read: boolean; at: string };

function timeAgo(d: Date) {
  const m = Math.round((Date.now() - d.getTime()) / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

export default function NotificationBell() {
  const [items, setItems] = useState<Note[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  async function refresh() {
    try {
      const r = await getMyNotificationsAction();
      setItems(r.items);
      setUnread(r.unread);
    } catch { /* ignore */ }
  }

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 20000);
    function onDoc(e: MouseEvent) { if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", onDoc);
    return () => { clearInterval(t); document.removeEventListener("mousedown", onDoc); };
  }, []);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      await markNotificationsReadAction();
      setUnread(0);
      setItems((xs) => xs.map((x) => ({ ...x, read: true })));
    }
  }

  return (
    <div className="integrations" ref={wrap}>
      <button className={`itg-btn${open ? " on" : ""}`} title="Notifications" onClick={toggle} style={{ position: "relative" }}>
        <svg fill="none" strokeWidth={2} viewBox="0 0 24 24"><path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>
        {unread > 0 && <span className="bell-badge">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <div className="itg-pop" style={{ width: 300 }}>
          <div className="itg-h">Notifications</div>
          {items.length === 0 && <div className="q-note" style={{ padding: 12 }}>You're all caught up.</div>}
          {items.map((n) => (
            <div className="note-row" key={n.id}>
              <span className={`note-tag tag-${n.audience.toLowerCase()}`}>{n.audience}</span>
              <span className="note-body">{n.body}</span>
              <span className="note-at">{timeAgo(new Date(n.at))}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
