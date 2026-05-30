"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Logo, { initials } from "./Logo";
import { logoutAction, updateAvatarAction, setViewAsAction } from "@/app/actions/session";
import { ROLE_LABEL, type Role } from "@/lib/permissions";

type NavItem = { href: string; label: string; icon: React.ReactNode; pill?: number; show: boolean };

export default function Sidebar({
  user,
  salesCount,
  access,
  viewableRoles,
}: {
  user: { name: string; role: string; realRole: string; isAdmin: boolean; viewingAs: string | null; avatarUrl: string | null };
  salesCount: number;
  access: { sales: boolean; supply: boolean; logistics: boolean };
  viewableRoles: { value: string; label: string }[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatar, setAvatar] = useState(user.avatarUrl);

  async function onViewAs(role: string) {
    await setViewAsAction(role === user.realRole ? null : role);
    router.refresh();
  }

  const items: NavItem[] = [
    {
      href: "/dashboard",
      label: "Dashboard",
      show: true,
      icon: (
        <svg fill="none" strokeWidth={2} viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></svg>
      ),
    },
    {
      href: "/sales",
      label: "Pipeline",
      pill: salesCount,
      show: access.sales,
      icon: (
        <svg fill="none" strokeWidth={2} viewBox="0 0 24 24"><path d="M3 3v18h18" /><rect x="7" y="11" width="3" height="6" /><rect x="12" y="7" width="3" height="10" /><rect x="17" y="13" width="3" height="4" /></svg>
      ),
    },
    {
      href: "/companies",
      label: "Companies",
      show: access.sales,
      icon: (
        <svg fill="none" strokeWidth={2} viewBox="0 0 24 24"><path d="M3 21h18" /><path d="M5 21V7l8-4v18" /><path d="M19 21V11l-6-4" /><path d="M9 9v0M9 13v0M9 17v0" /></svg>
      ),
    },
    {
      href: "/contacts",
      label: "Contacts",
      show: access.sales,
      icon: (
        <svg fill="none" strokeWidth={2} viewBox="0 0 24 24"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0z" /><path d="M4 21v-1a6 6 0 0112 0v1" /></svg>
      ),
    },
    {
      href: "/supply",
      label: "Supply",
      show: access.supply,
      icon: (
        <svg fill="none" strokeWidth={2} viewBox="0 0 24 24"><path d="M20 7l-8-4-8 4 8 4 8-4z" /><path d="M4 7v10l8 4 8-4V7" /><path d="M12 11v10" /></svg>
      ),
    },
    {
      href: "/logistics",
      label: "Logistics",
      show: access.logistics,
      icon: (
        <svg fill="none" strokeWidth={2} viewBox="0 0 24 24"><path d="M3 7h11v8H3z" /><path d="M14 10h4l3 3v2h-7z" /><circle cx="7" cy="17" r="2" /><circle cx="17" cy="17" r="2" /></svg>
      ),
    },
  ];

  async function onAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const url = String(reader.result);
      setAvatar(url);
      try {
        await updateAvatarAction(url);
      } catch {
        /* ignore in demo */
      }
    };
    reader.readAsDataURL(f);
  }

  const roleLabel = ROLE_LABEL[user.role as Role] ?? user.role;

  return (
    <aside className="side">
      <div className="logo-wrap">
        <Logo />
        <div className="logo-sub">Layers Weave</div>
      </div>

      <div>
        <div className="nav-label">Overview</div>
        <nav className="nav">
          <Link href="/dashboard" className={pathname === "/dashboard" ? "active" : ""}>
            {items[0].icon}
            Dashboard
          </Link>
          <Link href="/reports" className={pathname.startsWith("/reports") ? "active" : ""}>
            <svg fill="none" strokeWidth={2} viewBox="0 0 24 24"><path d="M3 3v18h18" /><path d="M18 9l-5 5-3-3-4 4" /></svg>
            Reports
          </Link>
        </nav>
      </div>

      <div>
        <div className="nav-label">Teams</div>
        <nav className="nav">
          {items.slice(1).filter((i) => i.show).map((i) => (
            <Link key={i.href} href={i.href} className={pathname.startsWith(i.href) ? "active" : ""}>
              {i.icon}
              {i.label}
              {i.pill ? <span className="pill">{i.pill}</span> : null}
            </Link>
          ))}
        </nav>
      </div>

      <div>
        <div className="nav-label">Tools</div>
        <nav className="nav">
          <Link href="/calculator" className={pathname.startsWith("/calculator") ? "active" : ""}>
            <svg fill="none" strokeWidth={2} viewBox="0 0 24 24"><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M8 6h8M8 10h2M8 14h2M14 10h2v8h-6" /></svg>
            Price Calculator
          </Link>
          <button
            onClick={() => logoutAction()}
            className=""
            style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 11px", borderRadius: 9, color: "var(--muted)", background: "none", border: "1px solid transparent", font: "inherit", fontSize: 13, fontWeight: 500, cursor: "pointer", width: "100%" }}
          >
            <svg fill="none" strokeWidth={2} viewBox="0 0 24 24" style={{ width: 17, height: 17, stroke: "currentColor" }}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></svg>
            Sign out
          </button>
        </nav>
      </div>

      {user.isAdmin && (
        <div>
          <div className="nav-label">View as</div>
          <select
            className="viewas-select"
            value={user.viewingAs ?? user.realRole}
            onChange={(e) => onViewAs(e.target.value)}
          >
            {viewableRoles.map((r) => (
              <option key={r.value} value={r.value}>
                {r.value === user.realRole ? `${r.label} (you)` : r.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="side-foot">
        <label
          className="ava"
          title="Upload photo"
          style={avatar ? { backgroundImage: `url(${avatar})` } : undefined}
          onClick={() => fileRef.current?.click()}
        >
          {!avatar && <span>{initials(user.name)}</span>}
          <span className="cam">
            <svg fill="none" strokeWidth={2} viewBox="0 0 24 24"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" /><circle cx="12" cy="13" r="4" /></svg>
          </span>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onAvatarChange} />
        </label>
        <div>
          <div className="nm">{user.name}</div>
          <div className="rl">{roleLabel}</div>
        </div>
      </div>
    </aside>
  );
}
