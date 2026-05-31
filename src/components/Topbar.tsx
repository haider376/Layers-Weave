import Link from "next/link";
import Integrations from "./Integrations";
import SearchBox from "./SearchBox";
import NotificationBell from "./NotificationBell";
import SignOutButton from "./SignOutButton";

export default function Topbar({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="topbar">
      <div className="ph">
        <h1>{title}</h1>
        <p>{sub}</p>
      </div>
      <div className="topbar-actions">
        <SearchBox />
        <Integrations />
        <NotificationBell />
        <Link href="/settings" className="itg-btn" title="Settings" aria-label="Settings">
          <svg fill="none" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg>
        </Link>
        <SignOutButton />
      </div>
    </div>
  );
}
