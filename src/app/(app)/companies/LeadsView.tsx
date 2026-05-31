"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/components/Toast";
import { initials } from "@/components/Logo";
import Select from "@/components/ui/Select";
import { createLeadAction, importLeadsAction, updateCompanyAction } from "../sales/record-actions";

export type Lead = {
  id: string; name: string; clientId: string; owner: string; bdr: string; leadStatus: string;
  country: string; tier: string; type: string; createdAt: string; lastActivity: string | null;
  ownerAssignedAt: string | null; deals: number; contacts: number;
};

const STATUSES = ["New", "In Progress", "Open Deal", "Cool Off", "Data Quality", "Do Not Contact"];
function statusCls(s: string) {
  if (s === "Open Deal") return "go"; if (s === "Do Not Contact") return "bad";
  if (s === "Cool Off" || s === "Data Quality") return "wait"; return "work";
}
const fmtD = (s: string | null) => (s ? new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" }) : "—");

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const split = (l: string) => l.match(/(".*?"|[^,]+)(?=,|$)/g)?.map((x) => x.replace(/^"|"$/g, "").trim()) ?? [];
  const headers = split(lines[0]).map((h) => h.toLowerCase());
  return lines.slice(1).map((l) => { const cells = split(l); const o: Record<string, string> = {}; headers.forEach((h, i) => (o[h] = cells[i] ?? "")); return o; });
}

export default function LeadsView({ leads }: { leads: Lead[] }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [view, setView] = useState<"table" | "board" | "report">("table");
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortKey, setSortKey] = useState<keyof Lead>("createdAt");
  const [dir, setDir] = useState<1 | -1>(-1);
  const [adding, setAdding] = useState(false);
  const [nl, setNl] = useState({ name: "", country: "", type: "Wholesaler", leadStatus: "New", tier: "B" });
  const [dragId, setDragId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    let r = leads;
    if (statusFilter !== "All") r = r.filter((l) => l.leadStatus === statusFilter);
    if (q.trim()) { const t = q.toLowerCase(); r = r.filter((l) => l.name.toLowerCase().includes(t) || l.owner.toLowerCase().includes(t) || l.country.toLowerCase().includes(t)); }
    return [...r].sort((a, b) => { const av = a[sortKey] ?? ""; const bv = b[sortKey] ?? ""; return av < bv ? -dir : av > bv ? dir : 0; });
  }, [leads, q, statusFilter, sortKey, dir]);

  function sortBy(k: keyof Lead) { if (sortKey === k) setDir((d) => (d === 1 ? -1 : 1)); else { setSortKey(k); setDir(1); } }

  function exportCSV() {
    const cols: (keyof Lead)[] = ["name", "owner", "bdr", "leadStatus", "country", "tier", "type", "createdAt", "lastActivity", "deals", "contacts"];
    const csv = cols.join(",") + "\n" + filtered.map((l) => cols.map((c) => `"${String(l[c] ?? "")}"`).join(",")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = "leads.csv"; a.click();
    showToast(`Exported ${filtered.length} leads`);
  }
  function importCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const rows = parseCSV(String(reader.result)).map((r) => ({ name: r.name || r.company || r["company name"] || "", country: r.country || r.region || "", leadStatus: r["lead status"] || r.leadstatus || r.status || "", type: r.type || "", tier: r.tier || "" }));
      start(async () => { const res = await importLeadsAction(rows); showToast(`Imported ${res.imported} leads`); router.refresh(); });
    };
    reader.readAsText(f); e.target.value = "";
  }
  function addLead() {
    if (!nl.name.trim()) return;
    start(async () => { await createLeadAction(nl); setAdding(false); setNl({ name: "", country: "", type: "Wholesaler", leadStatus: "New", tier: "B" }); showToast("Lead created"); router.refresh(); });
  }
  function moveStatus(id: string, leadStatus: string) {
    start(async () => { await updateCompanyAction(id, { leadStatus }); showToast(`→ ${leadStatus}`); router.refresh(); });
  }

  const SortTh = ({ k, label }: { k: keyof Lead; label: string }) => (
    <th onClick={() => sortBy(k)} style={{ cursor: "pointer", userSelect: "none" }}>{label}{sortKey === k ? (dir === 1 ? " ▲" : " ▼") : ""}</th>
  );

  return (
    <div>
      <div className="lv-toolbar">
        <div className="seg">{(["table", "board", "report"] as const).map((v) => <button key={v} className={view === v ? "on" : ""} onClick={() => setView(v)}>{v[0].toUpperCase() + v.slice(1)}</button>)}</div>
        <input className="ed lv-search" style={{ border: "1px solid var(--line-2)" }} placeholder="Filter leads…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select value={statusFilter} options={["All", ...STATUSES]} onValueChange={setStatusFilter} />
        <span style={{ flex: 1 }} />
        <button className="btn ghost lv-btn" onClick={() => fileRef.current?.click()}>Import</button>
        <button className="btn ghost lv-btn" onClick={exportCSV}>Export</button>
        <button className="btn primary lv-btn" onClick={() => setAdding((a) => !a)}>+ Add lead</button>
        <input ref={fileRef} type="file" accept=".csv" hidden onChange={importCSV} />
      </div>

      {adding && (
        <div className="answer-form" style={{ marginBottom: 14, borderRadius: 11 }}>
          <div className="af-grid">
            <input className="ed" style={{ border: "1px solid var(--line-2)" }} placeholder="Company name *" value={nl.name} onChange={(e) => setNl({ ...nl, name: e.target.value })} />
            <input className="ed" style={{ border: "1px solid var(--line-2)" }} placeholder="Country" value={nl.country} onChange={(e) => setNl({ ...nl, country: e.target.value })} />
            <Select value={nl.leadStatus} options={STATUSES} onValueChange={(v) => setNl({ ...nl, leadStatus: v })} />
            <Select value={nl.type} options={["Wholesaler", "Retailer", "Reseller"]} onValueChange={(v) => setNl({ ...nl, type: v })} />
            <Select value={nl.tier} options={["A", "B", "C"]} onValueChange={(v) => setNl({ ...nl, tier: v })} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
            <button className="btn ghost" style={{ flex: "none", padding: "8px 14px" }} onClick={() => setAdding(false)}>Cancel</button>
            <button className="btn primary" style={{ flex: "none", padding: "8px 16px" }} onClick={addLead}>Create lead</button>
          </div>
        </div>
      )}

      {view === "table" && (
        <section className="panel">
          <div className="panel-h"><h2>All leads</h2><span className="count">{filtered.length} shown</span></div>
          <table>
            <thead><tr><SortTh k="name" label="Company" /><SortTh k="owner" label="Owner" /><SortTh k="bdr" label="BDR" /><SortTh k="leadStatus" label="Lead status" /><SortTh k="country" label="Country" /><SortTh k="createdAt" label="Created" /><SortTh k="lastActivity" label="Last activity" /></tr></thead>
            <tbody>
              {filtered.map((l) => (
                <tr className="row" key={l.id}>
                  <td><Link href={`?company=${l.id}`} style={{ fontWeight: 600, textDecoration: "none" }}>{l.name}<small style={{ display: "block", color: "var(--faint)", fontWeight: 500 }}>{l.clientId}</small></Link></td>
                  <td><span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span className="mini-av">{initials(l.owner)}</span>{l.owner.split(" ")[0]}</span></td>
                  <td>{l.bdr.split(" ")[0]}</td>
                  <td><span className={`st ${statusCls(l.leadStatus)}`}><span className="d" />{l.leadStatus}</span></td>
                  <td>{l.country}</td><td>{fmtD(l.createdAt)}</td><td>{fmtD(l.lastActivity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {view === "board" && (
        <div className="board">
          {STATUSES.map((s) => {
            const items = filtered.filter((l) => l.leadStatus === s);
            return (
              <div key={s} className={`col${dragId ? " can-drop" : ""}`} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (dragId) moveStatus(dragId, s); setDragId(null); }}>
                <div className="col-h"><span className="accent" /><span className="t">{s}</span><span className="c">{items.length}</span></div>
                <div className="col-b">
                  {items.map((l) => (
                    <div className="deal" key={l.id} draggable onDragStart={() => setDragId(l.id)} onDragEnd={() => setDragId(null)}>
                      <Link className="dn dn-link" href={`?company=${l.id}`} scroll={false}>{l.name}</Link>
                      <div className="own"><span className="av">{initials(l.owner)}</span>{l.country}</div>
                    </div>
                  ))}
                  {items.length === 0 && <div style={{ fontSize: 11, color: "var(--faint)", padding: 4 }}>—</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === "report" && <LeadsReport leads={filtered} />}
    </div>
  );
}

function LeadsReport({ leads }: { leads: Lead[] }) {
  const byStatus = STATUSES.map((s) => [s, leads.filter((l) => l.leadStatus === s).length] as [string, number]);
  const byOwner = Object.entries(leads.reduce((m, l) => { m[l.owner] = (m[l.owner] ?? 0) + 1; return m; }, {} as Record<string, number>)).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const byCountry = Object.entries(leads.reduce((m, l) => { m[l.country] = (m[l.country] ?? 0) + 1; return m; }, {} as Record<string, number>)).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const max = (arr: [string, number][]) => Math.max(1, ...arr.map((x) => x[1]));
  const Bars = ({ rows }: { rows: [string, number][] }) => (<>{rows.map(([k, v]) => <div className="rbar" key={k}><span className="rbar-l">{k}</span><div className="rbar-track"><i style={{ width: `${(v / max(rows)) * 100}%`, background: "var(--neon)" }} /></div><span className="rbar-v">{v}</span></div>)}</>);
  return (
    <div className="an-grid">
      <div className="kpis" style={{ gridColumn: "1 / -1", gridTemplateColumns: "repeat(4,1fr)" }}>
        <div className="kpi"><span className="bar" /><div className="lbl">Total leads</div><div className="val neon">{leads.length}</div><div className="delta">filtered</div></div>
        <div className="kpi v"><span className="bar" /><div className="lbl">Open deals</div><div className="val vio">{leads.filter((l) => l.leadStatus === "Open Deal").length}</div><div className="delta">qualified</div></div>
        <div className="kpi"><span className="bar" /><div className="lbl">In progress</div><div className="val neon">{leads.filter((l) => l.leadStatus === "In Progress").length}</div><div className="delta">working</div></div>
        <div className="kpi a"><span className="bar" /><div className="lbl">Do not contact</div><div className="val">{leads.filter((l) => l.leadStatus === "Do Not Contact").length}</div><div className="delta">suppressed</div></div>
      </div>
      <section className="an-card"><div className="an-h"><h2>By lead status</h2></div><div className="an-body"><Bars rows={byStatus} /></div></section>
      <section className="an-card"><div className="an-h"><h2>By owner</h2></div><div className="an-body"><Bars rows={byOwner} /></div></section>
      <section className="an-card"><div className="an-h"><h2>By country</h2></div><div className="an-body"><Bars rows={byCountry} /></div></section>
    </div>
  );
}
