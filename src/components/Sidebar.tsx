"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import Logo, { initials } from "./Logo";
import { updateAvatarAction } from "@/app/actions/session";
import AvatarCropper from "./AvatarCropper";
import NavPunk from "./NavPunk";
import type { PunkName } from "./PunkMark";
import { showToast } from "./Toast";

// Punk-asset icon per nav item — same hand-drawn graffiti family as the brand pack.
const PUNK: Record<string, PunkName> = {
  dash: "diamond", analytics: "arrow", revenue: "dollar", forecast: "target",
  pipeline: "tag", companies: "globe", contacts: "smiley", cadences: "headset", tasks: "bolt",
  calendar: "clock", inbox: "chat", activity: "flame", calls: "phone", trophy: "trophy", goals: "rocket",
};
const punkIcon = (key: string): React.ReactNode => <NavPunk name={PUNK[key] ?? "star"} />;

export default function Sidebar({
  user,
  salesCount,
}: {
  user: { name: string; avatarUrl: string | null };
  salesCount: number;
}) {
  const pathname = usePathname();
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatar, setAvatar] = useState(user.avatarUrl);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  function onAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setCropSrc(String(reader.result));
    reader.readAsDataURL(f);
    e.target.value = "";
  }
  async function onCropSave(dataUrl: string) {
    setAvatar(dataUrl);
    setCropSrc(null);
    try { await updateAvatarAction(dataUrl); showToast("Profile photo updated"); }
    catch { showToast("Couldn't save photo"); }
  }

  const Nav = ({ href, label, icon, pill }: { href: string; label: string; icon: React.ReactNode; pill?: number }) => (
    <Link href={href} className={pathname === href || (href !== "/dashboard" && pathname.startsWith(href)) ? "active" : ""}>
      {icon}
      {label}
      {pill ? <span className="pill">{pill}</span> : null}
    </Link>
  );

  return (
    <aside className="side">
      <div className="logo-wrap logo-row">
        <div className="logo-text"><Logo /><div className="logo-sub">Weave</div></div>
      </div>

      <div className="side-scroll">
      <div className="nav-group">
        <div className="nav-label">Overview</div>
        <nav className="nav">
          <Nav href="/dashboard" label="Dashboard" icon={punkIcon("dash")} />
          <Nav href="/reports" label="Sales Analytics" icon={punkIcon("analytics")} />
          <Nav href="/revenue" label="Revenue Analytics" icon={punkIcon("revenue")} />
          <Nav href="/forecast" label="Forecast" icon={punkIcon("forecast")} />
        </nav>
      </div>

      <div className="nav-group">
        <div className="nav-label">Sales</div>
        <nav className="nav">
          <Nav href="/sales" label="Deals" icon={punkIcon("pipeline")} pill={salesCount} />
          <Nav href="/companies" label="Leads" icon={punkIcon("companies")} />
          <Nav href="/contacts" label="People" icon={punkIcon("contacts")} />
          <Nav href="/cadences" label="Cadences" icon={punkIcon("cadences")} />
          <Nav href="/tasks" label="Tasks" icon={punkIcon("tasks")} />
        </nav>
      </div>

      <div className="nav-group">
        <div className="nav-label">Workspace</div>
        <nav className="nav">
          <Nav href="/calendar" label="Calendar" icon={punkIcon("calendar")} />
          <Nav href="/inbox" label="Inbox" icon={punkIcon("inbox")} />
          <Nav href="/activity" label="Activity Feed" icon={punkIcon("activity")} />
          <Nav href="/calls" label="Coaching" icon={punkIcon("calls")} />
          <Nav href="/leaderboard" label="Leaderboard" icon={punkIcon("trophy")} />
          <Nav href="/goals" label="Goals" icon={punkIcon("goals")} />
        </nav>
      </div>

      </div>

      <div className="side-foot">
        <button type="button" className="ava" title="Upload photo" style={avatar ? { backgroundImage: `url(${avatar})` } : undefined} onClick={() => fileRef.current?.click()}>
          {!avatar && <span>{initials(user.name)}</span>}
          <span className="cam"><svg fill="none" strokeWidth={2} viewBox="0 0 24 24"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" /><circle cx="12" cy="13" r="4" /></svg></span>
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onAvatarChange} />
        <div className="side-foot-id">
          <div className="nm">{user.name}</div>
        </div>
      </div>

      {cropSrc && <AvatarCropper src={cropSrc} onCancel={() => setCropSrc(null)} onSave={onCropSave} />}
    </aside>
  );
}
