"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "./Toast";
import {
  scanCompanyDuplicatesAction, scanContactDuplicatesAction,
  mergeCompaniesAction, mergeContactsAction,
} from "@/app/actions/dedupe";
import type { DupeGroup } from "@/lib/dedupe";

// Merge & dedupe panel (Koalify-style) for Leads (company) and People (contact).
// Scans for likely duplicates, lets you choose a master per group, and merges
// every related record into it.
export default function MergeDuplicates({ kind }: { kind: "company" | "contact" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<DupeGroup[] | null>(null);
  const [master, setMaster] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const label = kind === "company" ? "companies" : "contacts";

  async function scan() {
    setOpen(true);
    setLoading(true);
    try {
      const g = kind === "company" ? await scanCompanyDuplicatesAction() : await scanContactDuplicatesAction();
      setGroups(g);
      // Default master = the most-complete record (already sorted first).
      setMaster(Object.fromEntries(g.map((grp) => [grp.key, grp.records[0].id])));
    } catch {
      showToast("Couldn't scan for duplicates");
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }

  async function mergeGroup(grp: DupeGroup) {
    const masterId = master[grp.key] ?? grp.records[0].id;
    const dupeIds = grp.records.map((r) => r.id).filter((id) => id !== masterId);
    if (!dupeIds.length) return;
    setBusy(grp.key);
    try {
      const fn = kind === "company" ? mergeCompaniesAction : mergeContactsAction;
      const r = await fn(masterId, dupeIds);
      showToast(`Merged ${r.merged} ${kind === "company" ? "companies" : "contacts"} into 1`);
      setGroups((gs) => (gs ?? []).filter((x) => x.key !== grp.key));
      router.refresh();
    } catch {
      showToast("Merge failed");
    } finally {
      setBusy(null);
    }
  }

  const total = groups?.reduce((s, g) => s + g.records.length - 1, 0) ?? 0;

  return (
    <>
      <button className="btn ghost lv-btn" onClick={scan} title="Find & merge duplicates">
        <span className="dedupe-ic" aria-hidden>⧉</span> Merge duplicates
      </button>

      {open && (
        <div className="dd-wrap" onClick={() => setOpen(false)}>
          <div className="dd" onClick={(e) => e.stopPropagation()}>
            <div className="dd-h">
              <div>
                <div className="eyebrow">Merge &amp; dedupe</div>
                <h2 className="font-display">{kind === "company" ? "Company" : "People"} duplicates {groups && <span className="dd-count">{groups.length} groups · {total} to merge</span>}</h2>
              </div>
              <button className="dd-x" onClick={() => setOpen(false)} aria-label="Close">×</button>
            </div>

            <div className="dd-body">
              {loading && <div className="q-note" style={{ padding: 30, textAlign: "center" }}>Scanning {label} for duplicates…</div>}
              {!loading && groups && groups.length === 0 && (
                <div className="dd-clean">✓ No duplicates found — your {label} look clean.</div>
              )}
              {!loading && groups && groups.map((grp) => (
                <div className="dd-group" key={grp.key}>
                  <div className="dd-group-h">
                    <span className="dd-reason">{grp.reason}</span>
                    <span className="dd-n">{grp.records.length} records</span>
                  </div>
                  <div className="dd-recs">
                    {grp.records.map((r) => {
                      const isMaster = (master[grp.key] ?? grp.records[0].id) === r.id;
                      return (
                        <label key={r.id} className={`dd-rec${isMaster ? " master" : ""}`}>
                          <input type="radio" name={`m-${grp.key}`} checked={isMaster} onChange={() => setMaster((m) => ({ ...m, [grp.key]: r.id }))} />
                          <div className="dd-rec-bd">
                            <div className="dd-rec-t">{r.primary} {isMaster && <span className="dd-keep">KEEP</span>}</div>
                            <div className="dd-rec-s">{r.secondary}{r.meta ? ` · ${r.meta}` : ""}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  <div className="dd-group-f">
                    <span className="dd-hint">Other {grp.records.length - 1} merge into the kept record · history preserved</span>
                    <button className="btn primary" disabled={busy === grp.key} onClick={() => mergeGroup(grp)}>
                      {busy === grp.key ? "Merging…" : "Merge group"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
