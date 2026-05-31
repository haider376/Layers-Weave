"use client";

import { useEffect, useRef, useState } from "react";
import { showToast } from "./Toast";
import NavPunk from "./NavPunk";

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
        <NavPunk name="phone" size={19} />
      </button>
      <button className={`itg-btn${open === "email" ? " on" : ""}`} title="Email / inbox" onClick={() => setOpen(open === "email" ? null : "email")}>
        <NavPunk name="mail" size={19} />
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
