"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/components/Toast";
import { initials } from "@/components/Logo";
import FilterBar, { type FilterDef, type FilterState } from "@/components/ui/FilterBar";
import { importPeopleAction } from "../sales/record-actions";

export type Person = {
  id: string; name: string; title: string; email: string; phone: string; primary: boolean;
  company: string; companyId: string; owner: string; leadStatus: string; createdAt: string;
};

const BADGE = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
const fmtD = (s: string) => new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" });

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const split = (l: string) => l.match(/(".*?"|[^,]+)(?=,|$)/g)?.map((x) => x.replace(/^"|"$/g, "").trim()) ?? [];
  const headers = split(lines[0]).map((h) => h.toLowerCase());
  return lines.slice(1).map((l) => { const cells = split(l); const o: Record<string, string> = {}; headers.forEach((h, i) => (o[h] = cells[i] ?? "")); return o; });
}

export default function PeopleView({ people }: { people: Person[] }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [view, setView] = useState<"table" | "board" | "report">("table");
  const [q, setQ] = useState("");
  const [fstate, setFstate] = useState<FilterState>({});
  const [sortKey, setSortKey] = useState<keyof Person>("name");
  const [dir, setDir] = useState<1 | -1>(1);
  const fileRef = useRef<HTMLInputElement>(null);

  const filterDefs: FilterDef[] = useMemo(() => {
    const uniq = (arr: string[]) => [...new Set(arr.filter((x) => x && x !== "—"))].sort();
    return [
      { key: "leadStatus", label: "Lead status", type: "multi", options: uniq(people.map((p) => p.leadStatus)).map((s) => ({ value: s, label: s, badge: BADGE(s) })) },
      { key: "owner", label: "Owner", type: "multi", options: uniq(people.map((p) => p.owner)).map((o) => ({ value: o, label: o })) },
      { key: "company", label: "Company", type: "multi", options: uniq(people.map((p) => p.company)).map((c) => ({ value: c, label: c })) },
      { key: "primary", label: "Type", type: "multi", options: [{ value: "primary", label: "Primary contact" }, { value: "secondary", label: "Secondary" }] },
      { key: "createdAt", label: "Create date", type: "date" },
    ];
  }, [people]);

  const filtered = useMemo(() => {
    let r = people;
    for (const def of filterDefs) {
      const v = fstate[def.key];
      const key: string = def.key;
      if (def.type === "multi" && Array.isArray(v) && v.length) {
        if (key === "primary") r = r.filter((p) => v.includes(p.primary ? "primary" : "secondary"));
        else r = r.filter((p) => v.includes(String((p as unknown as Record<string, string>)[key])));
      } else if (def.type === "date" && v && !Array.isArray(v) && (v.from || v.to)) {
        r = r.filter((p) => {
          const raw = (p as unknown as Record<string, string | null>)[def.key];
          if (!raw) return false;
          const d = raw.slice(0, 10);
          if (v.from && d < v.from) return false;
          if (v.to && d > v.to) return false;
          return true;
        });
      }
    }
    if (q.trim()) { const t = q.toLowerCase(); r = r.filter((p) => p.name.toLowerCase().includes(t) || p.company.toLowerCase().includes(t) || p.email.toLowerCase().includes(t)); }
    return [...r].sort((a, b) => { const av = a[sortKey] ?? ""; const bv = b[sortKey] ?? ""; return av < bv ? -dir : av > bv ? dir : 0; });
  }, [people, q, fstate, filterDefs, sortKey, dir]);

  function sortBy(k: keyof Person) { if (sortKey === k) setDir((d) => (d === 1 ? -1 : 1)); else { setSortKey(k); setDir(1); } }
  function exportCSV() {
    const cols: (keyof Person)[] = ["name", "title", "company", "email", "phone", "owner", "createdAt"];
    const csv = cols.join(",") + "\n" + filtered.map((p) => cols.map((c) => `"${String(p[c] ?? "")}"`).join(",")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = "people.csv"; a.click();
    showToast(`Exported ${filtered.length} people`);
  }
  function importCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const rows = parseCSV(String(reader.result)).map((r) => ({ name: r.name || "", email: r.email || "", phone: r.phone || "", title: r.title || r.role || "", company: r.company || r["company name"] || "" }));
      start(async () => { const res = await importPeopleAction(rows); showToast(`Imported ${res.imported} people`); router.refresh(); });
    };
    reader.readAsText(f); e.target.value = "";
  }

  const SortTh = ({ k, label }: { k: keyof Person; label: string }) => (
    <th onClick={() => sortBy(k)} style={{ cursor: "pointer", userSelect: "none" }}>{label}{sortKey === k ? (dir === 1 ? " ▲" : " ▼") : ""}</th>
  );

  const owners = useMemo(() => Object.entries(filtered.reduce((m, p) => { (m[p.owner] ??= []).push(p); return m; }, {} as Record<string, Person[]>)).sort((a, b) => b[1].length - a[1].length), [filtered]);

  return (
    <div>
      <div className="lv-toolbar">
        <div className="seg">{(["table", "board", "report"] as const).map((v) => <button key={v} className={view === v ? "on" : ""} onClick={() => setView(v)}>{v[0].toUpperCase() + v.slice(1)}</button>)}</div>
        <input className="ed lv-search" style={{ border: "1px solid var(--line-2)" }} placeholder="Filter people…" value={q} onChange={(e) => setQ(e.target.value)} />
        <span style={{ flex: 1 }} />
        <button className="btn ghost lv-btn" onClick={() => fileRef.current?.click()}>Import</button>
        <button className="btn ghost lv-btn" onClick={exportCSV}>Export</button>
        <input ref={fileRef} type="file" accept=".csv" hidden onChange={importCSV} />
      </div>

      <FilterBar filters={filterDefs} state={fstate} onChange={(k, v) => setFstate((s) => ({ ...s, [k]: v }))} onClear={() => setFstate({})} />

      {view === "table" && (
        <section className="panel">
          <div className="panel-h"><h2>All people</h2><span className="count">{filtered.length} shown</span></div>
          <table>
            <thead><tr><SortTh k="name" label="Name" /><SortTh k="title" label="Title" /><SortTh k="company" label="Company" /><SortTh k="owner" label="Owner" /><SortTh k="email" label="Email" /><SortTh k="createdAt" label="Created" /></tr></thead>
            <tbody>
              {filtered.map((p) => (
                <tr className="row" key={p.id}>
                  <td><Link href={`?contact=${p.id}`} style={{ fontWeight: 600, textDecoration: "none" }}><span className="mini-av" style={{ marginRight: 8 }}>{initials(p.name)}</span>{p.name}{p.primary && <span className="q-type" style={{ marginLeft: 8 }}>PRIMARY</span>}</Link></td>
                  <td>{p.title}</td>
                  <td><Link href={`?company=${p.companyId}`} style={{ color: "var(--violet-br)", textDecoration: "none" }}>{p.company}</Link></td>
                  <td>{p.owner.split(" ")[0]}</td><td>{p.email}</td><td>{fmtD(p.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {view === "board" && (
        <div className="board">
          {owners.map(([owner, ppl]) => (
            <div className="col" key={owner}>
              <div className="col-h"><span className="accent" /><span className="t">{owner}</span><span className="c">{ppl.length}</span></div>
              <div className="col-b">
                {ppl.map((p) => (
                  <div className="deal" key={p.id}>
                    <Link className="dn dn-link" href={`?contact=${p.id}`} scroll={false}>{p.name}</Link>
                    <div className="own">{p.company}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {view === "report" && (
        <div className="an-grid">
          <div className="kpis" style={{ gridColumn: "1 / -1", gridTemplateColumns: "repeat(3,1fr)" }}>
            <div className="kpi"><span className="bar" /><div className="lbl">Total people</div><div className="val neon">{filtered.length}</div><div className="delta">filtered</div></div>
            <div className="kpi v"><span className="bar" /><div className="lbl">Primary contacts</div><div className="val vio">{filtered.filter((p) => p.primary).length}</div><div className="delta">decision makers</div></div>
            <div className="kpi"><span className="bar" /><div className="lbl">With email</div><div className="val neon">{filtered.filter((p) => p.email && p.email !== "—").length}</div><div className="delta">reachable</div></div>
          </div>
          <section className="an-card wide"><div className="an-h"><h2>People per owner</h2></div><div className="an-body">{owners.map(([o, ppl]) => { const max = Math.max(1, ...owners.map((x) => x[1].length)); return <div className="rbar" key={o}><span className="rbar-l">{o}</span><div className="rbar-track"><i style={{ width: `${(ppl.length / max) * 100}%`, background: "var(--neon)" }} /></div><span className="rbar-v">{ppl.length}</span></div>; })}</div></section>
        </div>
      )}
    </div>
  );
}
