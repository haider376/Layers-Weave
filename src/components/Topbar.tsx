import Link from "next/link";
import Integrations from "./Integrations";
import SearchBox from "./SearchBox";
import NotificationBell from "./NotificationBell";
import SignOutButton from "./SignOutButton";
import ThemeToggle from "./ThemeToggle";
import NavPunk from "./NavPunk";

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
        <ThemeToggle />
        <Link href="/settings" className="itg-btn" title="Settings" aria-label="Settings">
          <NavPunk name="gear" size={19} />
        </Link>
        <SignOutButton />
      </div>
    </div>
  );
}
