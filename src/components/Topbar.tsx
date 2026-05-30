import Integrations from "./Integrations";
import SearchBox from "./SearchBox";
import NotificationBell from "./NotificationBell";

export default function Topbar({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="topbar">
      <div className="ph">
        <h1>{title}</h1>
        <p>{sub}</p>
      </div>
      <SearchBox />
      <NotificationBell />
      <Integrations />
    </div>
  );
}
