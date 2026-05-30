"use client";

import { useEffect, useRef, useState } from "react";
import { showToast } from "./Toast";

type Panel = "phone" | "email" | null;

export default function Integrations() {
  const [open, setOpen] = useState<Panel>(null);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(null);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function connect(name: string) {
    showToast(`Connecting ${name}… (OAuth)`);
    setOpen(null);
  }

  return (
    <div className="integrations" ref={wrap}>
      <button className={`itg-btn${open === "phone" ? " on" : ""}`} title="Phone / calling" onClick={() => setOpen(open === "phone" ? null : "phone")}>
        <svg fill="none" strokeWidth={2} viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0122 16.92z" /></svg>
      </button>
      <button className={`itg-btn${open === "email" ? " on" : ""}`} title="Email / inbox" onClick={() => setOpen(open === "email" ? null : "email")}>
        <svg fill="none" strokeWidth={2} viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 7l-10 6L2 7" /></svg>
      </button>

      {open === "phone" && (
        <div className="itg-pop">
          <div className="itg-h">Calling</div>
          <button className="itg-row" onClick={() => connect("Zoom Phone")}>
            <span className="itg-ic zoom">Z</span>
            <span className="itg-nm">Zoom Phone<small>Click-to-call + call logging</small></span>
            <span className="itg-cta">Connect</span>
          </button>
          <button className="itg-row" onClick={() => connect("Dialpad")}>
            <span className="itg-ic">D</span>
            <span className="itg-nm">Dialpad<small>Alternative dialer</small></span>
            <span className="itg-cta">Connect</span>
          </button>
        </div>
      )}
      {open === "email" && (
        <div className="itg-pop">
          <div className="itg-h">Email</div>
          <button className="itg-row" onClick={() => connect("Gmail")}>
            <span className="itg-ic gmail">G</span>
            <span className="itg-nm">Gmail<small>2-way sync to timelines</small></span>
            <span className="itg-cta">Connect</span>
          </button>
          <button className="itg-row" onClick={() => connect("Outlook")}>
            <span className="itg-ic outlook">O</span>
            <span className="itg-nm">Outlook<small>2-way sync to timelines</small></span>
            <span className="itg-cta">Connect</span>
          </button>
        </div>
      )}
    </div>
  );
}
