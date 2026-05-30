import Integrations from "./Integrations";

export default function Topbar({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="topbar">
      <div className="ph">
        <h1>{title}</h1>
        <p>{sub}</p>
      </div>
      <div className="search">
        <svg fill="none" strokeWidth={2} viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
        <input placeholder="Search client, quote ID…" />
      </div>
      <Integrations />
    </div>
  );
}
