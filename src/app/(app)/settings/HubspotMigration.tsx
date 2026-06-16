"use client";

import { useRef, useState } from "react";
import { showToast } from "@/components/Toast";
import { wipeCrmAction, importCompaniesChunk, importContactsChunk } from "@/app/actions/migrate";

// Proper CSV parser (state machine) — handles quoted fields with embedded
// commas and newlines, which HubSpot exports contain. Returns row objects keyed
// by lowercased, trimmed headers.
function parseCSV(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let field = "", row: string[] = [], inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  if (!rows.length) return [];
  const headers = rows[0].map((h) => h.toLowerCase().trim());
  return rows.slice(1).map((r) => {
    const o: Record<string, string> = {};
    headers.forEach((h, i) => (o[h] = (r[i] ?? "").trim()));
    return o;
  });
}

const CHUNK = 500;

export default function HubspotMigration() {
  const companiesRef = useRef<HTMLInputElement>(null);
  const contactsRef = useRef<HTMLInputElement>(null);
  const [companiesFile, setCompaniesFile] = useState<File | null>(null);
  const [contactsFile, setContactsFile] = useState<File | null>(null);
  const [wipe, setWipe] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState("");
  const [log, setLog] = useState<string[]>([]);

  const addLog = (s: string) => setLog((l) => [...l, s]);

  async function readFile(f: File): Promise<Record<string, string>[]> {
    const text = await f.text();
    return parseCSV(text);
  }

  async function runImport<T extends { created: number; skipped: number }>(
    label: string, rows: Record<string, string>[], fn: (chunk: Record<string, string>[]) => Promise<T>,
  ) {
    let created = 0, skipped = 0;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK);
      const res = await fn(chunk);
      created += res.created; skipped += res.skipped;
      setProgress(`${label}: ${Math.min(i + CHUNK, rows.length).toLocaleString()} / ${rows.length.toLocaleString()}`);
    }
    addLog(`${label} → ${created.toLocaleString()} created, ${skipped.toLocaleString()} skipped/duplicate`);
    return { created, skipped };
  }

  async function run() {
    if (!companiesFile && !contactsFile) { showToast("Pick at least one CSV"); return; }
    if (wipe && confirm !== "DELETE") { showToast('Type DELETE to confirm the wipe'); return; }
    setRunning(true); setLog([]); setProgress("");
    try {
      if (wipe) {
        setProgress("Wiping existing data…");
        const r = await wipeCrmAction(confirm);
        addLog(`Wiped: ${r.cleared.join(", ")}`);
      }
      // Companies first so contacts can associate to them.
      if (companiesFile) {
        setProgress("Reading companies CSV…");
        const rows = await readFile(companiesFile);
        addLog(`Companies CSV: ${rows.length.toLocaleString()} rows`);
        await runImport("Companies", rows, importCompaniesChunk);
      }
      if (contactsFile) {
        setProgress("Reading contacts CSV…");
        const rows = await readFile(contactsFile);
        addLog(`Contacts CSV: ${rows.length.toLocaleString()} rows`);
        await runImport("Contacts", rows, importContactsChunk);
      }
      setProgress("Done ✓");
      showToast("Migration complete");
    } catch (e) {
      addLog(`Error: ${e instanceof Error ? e.message : String(e)}`);
      showToast("Migration failed — see log");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="set-row" style={{ flexDirection: "column", alignItems: "stretch", gap: 14 }}>
      <div>
        <div className="set-row-t">HubSpot migration (CSV)</div>
        <div className="set-row-s">Import Companies &amp; Contacts exported from HubSpot. Companies import first so contacts link to them. Re-runs are dedupe-safe (companies by HubSpot Record ID, contacts by email).</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <input ref={companiesRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => setCompaniesFile(e.target.files?.[0] ?? null)} />
          <button className="btn ghost" style={{ width: "100%" }} disabled={running} onClick={() => companiesRef.current?.click()}>
            {companiesFile ? `🏢 ${companiesFile.name}` : "Choose Companies CSV"}
          </button>
        </div>
        <div>
          <input ref={contactsRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => setContactsFile(e.target.files?.[0] ?? null)} />
          <button className="btn ghost" style={{ width: "100%" }} disabled={running} onClick={() => contactsRef.current?.click()}>
            {contactsFile ? `👤 ${contactsFile.name}` : "Choose Contacts CSV"}
          </button>
        </div>
      </div>

      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--muted)" }}>
        <input type="checkbox" checked={wipe} onChange={(e) => setWipe(e.target.checked)} disabled={running} />
        Wipe ALL existing companies, contacts &amp; deals first (recommended for a clean production start)
      </label>
      {wipe && (
        <input className="compose-input" style={{ maxWidth: 240 }} placeholder='Type DELETE to confirm' value={confirm} onChange={(e) => setConfirm(e.target.value)} disabled={running} />
      )}

      <div className="compose-actions" style={{ justifyContent: "flex-start" }}>
        <button className="btn primary" style={{ flex: "none" }} disabled={running} onClick={run}>
          {running ? "Migrating…" : "Run migration"}
        </button>
        {progress && <span style={{ fontSize: 12, color: "var(--muted)" }}>{progress}</span>}
      </div>

      {log.length > 0 && (
        <pre style={{ background: "var(--panel-2)", border: "1px solid var(--line-2)", borderRadius: 8, padding: 12, fontSize: 11.5, color: "var(--muted)", whiteSpace: "pre-wrap", margin: 0 }}>
          {log.join("\n")}
        </pre>
      )}
    </div>
  );
}
