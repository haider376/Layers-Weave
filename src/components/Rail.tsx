import Avatar from "./Avatar";

export type RailRow = { label: string; value: string; sub?: string; pct?: number; rank?: number; avatarUrl?: string | null };

export function RailPanel({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="panel rail-panel">
      <div className="panel-h"><h2>{title}</h2>{hint && <span className="count">{hint}</span>}</div>
      <div className="rail-body">{children}</div>
    </section>
  );
}

export function RailLeaderboard({ rows, avatars = false }: { rows: RailRow[]; avatars?: boolean }) {
  const max = Math.max(1, ...rows.map((r) => r.pct ?? 0));
  return (
    <div className="rail-lb">
      {rows.map((r, i) => (
        <div className="rail-lrow" key={r.label + i}>
          {avatars ? <Avatar name={r.label} avatarUrl={r.avatarUrl} className="mini-av" /> : <span className="rail-rank">{r.rank ?? i + 1}</span>}
          <span className="rail-nm">{r.label}{r.sub && <small>{r.sub}</small>}</span>
          <div className="rail-bar"><i style={{ width: `${Math.max(4, ((r.pct ?? 0) / max) * 100)}%` }} /></div>
          <span className="rail-val">{r.value}</span>
        </div>
      ))}
      {rows.length === 0 && <div className="q-note" style={{ padding: 14 }}>No data yet.</div>}
    </div>
  );
}
