"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import NavPunk from "./NavPunk";

export default function SearchBox() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  }

  return (
    <form className={`search-c${open ? " open" : ""}`} onSubmit={submit}>
      <button type="button" className="search-btn" aria-label="Search" onClick={() => { setOpen(true); setTimeout(() => ref.current?.focus(), 20); }}>
        <NavPunk name="search" size={18} />
      </button>
      <input
        ref={ref}
        className="search-inp"
        placeholder="Search leads, people, deals…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onBlur={() => { if (!q.trim()) setOpen(false); }}
      />
    </form>
  );
}
