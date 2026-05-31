"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import Logo, { initials } from "./Logo";
import { updateAvatarAction } from "@/app/actions/session";
import AvatarCropper from "./AvatarCropper";
import WeaveMark from "./WeaveMark";
import { showToast } from "./Toast";

const ICONS = {
  dash: <svg fill="none" strokeWidth={2} viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></svg>,
  analytics: <svg fill="none" strokeWidth={2} viewBox="0 0 24 24"><path d="M3 3v18h18" /><path d="M18 9l-5 5-3-3-4 4" /></svg>,
  revenue: <svg fill="none" strokeWidth={2} viewBox="0 0 24 24"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>,
  goals: <svg fill="none" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></svg>,
  activity: <svg fill="none" strokeWidth={2} viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>,
  pipeline: <svg fill="none" strokeWidth={2} viewBox="0 0 24 24"><path d="M3 3v18h18" /><rect x="7" y="11" width="3" height="6" /><rect x="12" y="7" width="3" height="10" /><rect x="17" y="13" width="3" height="4" /></svg>,
  companies: <svg fill="none" strokeWidth={2} viewBox="0 0 24 24"><path d="M3 21h18" /><path d="M5 21V7l8-4v18" /><path d="M19 21V11l-6-4" /></svg>,
  contacts: <svg fill="none" strokeWidth={2} viewBox="0 0 24 24"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0z" /><path d="M4 21v-1a6 6 0 0112 0v1" /></svg>,
  calendar: <svg fill="none" strokeWidth={2} viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>,
  calls: <svg fill="none" strokeWidth={2} viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0122 16.92z" /></svg>,
  trophy: <svg fill="none" strokeWidth={2} viewBox="0 0 24 24"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0z" /><path d="M5 4H3v2a3 3 0 003 3M19 4h2v2a3 3 0 01-3 3" /></svg>,
  tasks: <svg fill="none" strokeWidth={2} viewBox="0 0 24 24"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></svg>,
  inbox: <svg fill="none" strokeWidth={2} viewBox="0 0 24 24"><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" /></svg>,
  calc: <svg fill="none" strokeWidth={2} viewBox="0 0 24 24"><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M8 6h8M8 10h2M8 14h2M14 10h2v8h-6" /></svg>,
  weight: <svg fill="none" strokeWidth={2} viewBox="0 0 24 24"><path d="M6 7h12l3 13H3z" /><circle cx="12" cy="4" r="2" /><path d="M8.5 11a3.5 3.5 0 007 0" /></svg>,
  settings: <svg fill="none" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg>,
  signout: <svg fill="none" strokeWidth={2} viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></svg>,
};

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
        <WeaveMark size={28} />
        <div className="logo-text"><Logo /><div className="logo-sub">Weave</div></div>
      </div>

      <div className="side-scroll">
      <div className="nav-group">
        <div className="nav-label">Overview</div>
        <nav className="nav">
          <Nav href="/dashboard" label="Dashboard" icon={ICONS.dash} />
          <Nav href="/reports" label="Sales Analytics" icon={ICONS.analytics} />
          <Nav href="/revenue" label="Revenue Analytics" icon={ICONS.revenue} />
        </nav>
      </div>

      <div className="nav-group">
        <div className="nav-label">Sales</div>
        <nav className="nav">
          <Nav href="/sales" label="Deals" icon={ICONS.pipeline} pill={salesCount} />
          <Nav href="/companies" label="Leads" icon={ICONS.companies} />
          <Nav href="/contacts" label="People" icon={ICONS.contacts} />
          <Nav href="/tasks" label="Tasks" icon={ICONS.tasks} />
        </nav>
      </div>

      <div className="nav-group">
        <div className="nav-label">Workspace</div>
        <nav className="nav">
          <Nav href="/calendar" label="Calendar" icon={ICONS.calendar} />
          <Nav href="/inbox" label="Inbox" icon={ICONS.inbox} />
          <Nav href="/activity" label="Activity Feed" icon={ICONS.activity} />
          <Nav href="/calls" label="Coaching" icon={ICONS.calls} />
          <Nav href="/leaderboard" label="Leaderboard" icon={ICONS.trophy} />
          <Nav href="/goals" label="Goals" icon={ICONS.goals} />
        </nav>
      </div>

      <div className="nav-group">
        <div className="nav-label">Tools</div>
        <nav className="nav">
          <Nav href="/calculator" label="Price Calculator" icon={ICONS.calc} />
          <Nav href="/weight" label="Weight Calculator" icon={ICONS.weight} />
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
