"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { getDealDrawerAction, updateDealAction } from "@/app/(app)/sales/record-actions";
import { celebrate } from "./Celebration";
import { showToast } from "./Toast";

type Deal = Awaited<ReturnType<typeof getDealDrawerAction>>;
const STAGES = ["Appointment Scheduled", "Showed up", "No Show / Reschedule", "Initiation", "Handpick / Bulk Vintage", "Closed Won", "Closed Lost", "Disqualified"];
const money = (n: number) => "$" + n.toLocaleString("en-US");

function ago(s: string) { const m = Math.round((Date.now() - +new Date(s)) / 60000); if (m < 60) return `${m}m`; const h = Math.round(m / 60); return h < 24 ? `${h}h` : `${Math.round(h / 24)}d`; }

export default function DealDrawer() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const id = params.get("deal");
  const [deal, setDeal] = useState<Deal>(null);
  const [loading, setLoading] = useState(false);
  const [, start] = useTransition();

  useEffect(() => {
    let alive = true;
    if (!id) { setDeal(null); return; }
    setLoading(true);
    getDealDrawerAction(id).then((d) => { if (alive) { setDeal(d); setLoading(false); } }).catch(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [id]);

  function close() {
    const p = new URLSearchParams(params.toString());
    p.delete("deal");
    router.replace(`${pathname}${p.toString() ? `?${p}` : ""}`, { scroll: false });
  }
  function setStage(stage: string) {
    if (!deal) return;
    setDeal({ ...deal, stage });
    start(async () => {
      try { await updateDealAction(deal.id, { stage }); if (stage === "Closed Won") celebrate("won"); else showToast(`→ ${stage}`); router.refresh(); }
      catch { showToast("Failed"); }
    });
  }

  return (
    <AnimatePresence>
      {id && (
        <motion.div className="drawer-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close}>
          <motion.aside className="drawer" onClick={(e) => e.stopPropagation()}
            initial={{ x: 420 }} animate={{ x: 0 }} exit={{ x: 420 }} transition={{ type: "spring", stiffness: 320, damping: 34 }}>
            <div className="drawer-h">
              <span className="eyebrow">Deal</span>
              <button className="drawer-x" onClick={close}>✕</button>
            </div>
            {loading && <div className="q-note" style={{ padding: 20 }}>Loading…</div>}
            {!loading && !deal && <div className="q-note" style={{ padding: 20 }}>Deal not found.</div>}
            {deal && (
              <div className="drawer-body">
                <div className="drawer-title font-display">{deal.name}</div>
                <div className="drawer-amt">{money(deal.amount)} <span className="q-id" style={{ marginLeft: 8 }}>{deal.dealId}</span></div>

                <div className="drawer-kv">
                  <div><span>Stage</span>
                    <select className="dg-input" value={deal.stage} onChange={(e) => setStage(e.target.value)}>{STAGES.map((s) => <option key={s}>{s}</option>)}</select>
                  </div>
                  <div><span>Company</span><Link href={`/companies/${deal.company.id}`} onClick={close} className="drawer-link">{deal.company.name}</Link></div>
                  <div><span>Contact</span><b>{deal.contact?.name ?? "—"}</b></div>
                  <div><span>Owner</span><b>{deal.owner}</b></div>
                  {deal.requestType && <div><span>Type</span><b>{deal.requestType}</b></div>}
                </div>

                {deal.quotes.length > 0 && (
                  <div className="drawer-sec"><div className="eyebrow">Quotes</div>{deal.quotes.map((q) => <div className="drawer-quote" key={q.quoteId}><span className="q-id">{q.quoteId}</span><span>{q.type} · {q.status}</span></div>)}</div>
                )}

                <div className="drawer-sec"><div className="eyebrow">Recent activity</div>
                  {deal.events.length === 0 && <div className="set-row-s">No activity yet.</div>}
                  {deal.events.map((e, i) => <div className="drawer-ev" key={i}><span className={`drawer-ev-dot ${e.kind}`} /><span style={{ flex: 1 }}>{e.text}</span><span className="drawer-ev-at">{ago(e.at)}</span></div>)}
                </div>

                <Link href={`/deals/${deal.id}`} className="btn primary" style={{ display: "block", textAlign: "center", textDecoration: "none", marginTop: 6 }} onClick={close}>Open full record</Link>
              </div>
            )}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
