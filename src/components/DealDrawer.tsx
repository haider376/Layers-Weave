"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  getDealDrawerAction, getCompanyDrawerAction, getContactDrawerAction,
  updateDealAction, createDealAction,
} from "@/app/(app)/sales/record-actions";
import { celebrate } from "./Celebration";
import { showToast } from "./Toast";
import Select from "./ui/Select";

const STAGES = ["Appointment Scheduled", "Showed up", "No Show / Reschedule", "Initiation", "Closed Won", "Closed Lost", "Disqualified"];
const money = (n: number) => "$" + n.toLocaleString("en-US");
function ago(s: string) { const m = Math.round((Date.now() - +new Date(s)) / 60000); if (m < 60) return `${m}m`; const h = Math.round(m / 60); return h < 24 ? `${h}h` : `${Math.round(h / 24)}d`; }

type Kind = "deal" | "company" | "contact";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Data = any;

function EventList({ events }: { events: { kind: string; text: string; at: string }[] }) {
  return (
    <div className="drawer-sec"><div className="eyebrow">Recent activity</div>
      {events.length === 0 && <div className="set-row-s">No activity yet.</div>}
      {events.map((e, i) => <div className="drawer-ev" key={i}><span className={`drawer-ev-dot ${e.kind}`} /><span style={{ flex: 1 }}>{e.text}</span><span className="drawer-ev-at">{ago(e.at)}</span></div>)}
    </div>
  );
}

export default function DealDrawer() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const dealId = params.get("deal"); const companyId = params.get("company"); const contactId = params.get("contact");
  const kind: Kind | null = dealId ? "deal" : companyId ? "company" : contactId ? "contact" : null;
  const activeId = dealId || companyId || contactId;

  const [data, setData] = useState<Data>(null);
  const [loading, setLoading] = useState(false);
  const [, start] = useTransition();
  // inline create-deal (company drawer)
  const [creating, setCreating] = useState(false);
  const [nd, setNd] = useState({ name: "", amount: 500, stage: "Appointment Scheduled", contactId: "" });

  useEffect(() => {
    let alive = true;
    setCreating(false);
    if (!kind || !activeId) { setData(null); return; }
    setLoading(true);
    const fn = kind === "deal" ? getDealDrawerAction : kind === "company" ? getCompanyDrawerAction : getContactDrawerAction;
    fn(activeId).then((d) => { if (alive) { setData(d); setLoading(false); } }).catch(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [kind, activeId]);

  function close() {
    const p = new URLSearchParams(params.toString());
    p.delete("deal"); p.delete("company"); p.delete("contact");
    router.replace(`${pathname}${p.toString() ? `?${p}` : ""}`, { scroll: false });
  }
  function setStage(stage: string) {
    setData({ ...data, stage });
    start(async () => { try { await updateDealAction(data.id, { stage }); if (stage === "Closed Won") celebrate("won"); else showToast(`→ ${stage}`); router.refresh(); } catch { showToast("Failed"); } });
  }
  function createDeal() {
    start(async () => {
      try {
        const r = await createDealAction({ name: nd.name.trim() || `${data.name} × Layers`, companyId: data.id, contactId: nd.contactId || undefined, amount: nd.amount, stage: nd.stage });
        showToast("Deal created");
        router.replace(`${pathname}?deal=${r.id}`, { scroll: false });
        router.refresh();
      } catch { showToast("Couldn't create deal"); }
    });
  }

  const label = kind === "deal" ? "Deal" : kind === "company" ? "Company" : "Contact";

  return (
    <AnimatePresence>
      {kind && (
        <motion.div className="drawer-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close}>
          <motion.aside className="drawer" onClick={(e) => e.stopPropagation()} initial={{ x: -440 }} animate={{ x: 0 }} exit={{ x: -440 }} transition={{ type: "spring", stiffness: 320, damping: 34 }}>
            <div className="drawer-h"><span className="eyebrow">{label}</span><button className="drawer-x" onClick={close}>✕</button></div>
            {loading && <div className="q-note" style={{ padding: 20 }}>Loading…</div>}
            {!loading && !data && <div className="q-note" style={{ padding: 20 }}>Not found.</div>}

            {data && kind === "deal" && (
              <div className="drawer-body">
                <div className="drawer-title font-display">{data.name}</div>
                <div className="drawer-amt">{money(data.amount)} <span className="q-id" style={{ marginLeft: 8 }}>{data.dealId}</span></div>
                <div className="drawer-kv">
                  <div><span>Stage</span><Select value={data.stage} options={STAGES} onValueChange={setStage} /></div>
                  <div><span>Company</span><Link href={`?company=${data.company.id}`} className="drawer-link">{data.company.name}</Link></div>
                  <div><span>Contact</span><b>{data.contact?.name ?? "—"}</b></div>
                  <div><span>Owner</span><b>{data.owner}</b></div>
                </div>
                {data.quotes.length > 0 && <div className="drawer-sec"><div className="eyebrow">Quotes</div>{data.quotes.map((q: Data) => <div className="drawer-quote" key={q.quoteId}><span className="q-id">{q.quoteId}</span><span>{q.type} · {q.status}</span></div>)}</div>}
                <EventList events={data.events} />
                <Link href={`/deals/${data.id}`} className="btn primary" style={{ display: "block", textAlign: "center", textDecoration: "none", marginTop: 6 }} onClick={close}>Open full record</Link>
              </div>
            )}

            {data && kind === "company" && (
              <div className="drawer-body">
                <div className="drawer-title font-display">{data.name}</div>
                <div style={{ marginTop: 6 }}><span className="st work"><span className="d" />{data.leadStatus}</span></div>
                <div className="drawer-kv">
                  <div><span>Owner</span><b>{data.owner}</b></div>
                  <div><span>BDR</span><b>{data.bdr}</b></div>
                  <div><span>Tier</span><b>{data.tier}</b></div>
                  <div><span>Type</span><b>{data.type}</b></div>
                  <div><span>Country</span><b>{data.country}</b></div>
                </div>
                <div className="drawer-sec"><div className="eyebrow">Contacts ({data.contacts.length})</div>
                  {data.contacts.map((c: Data) => <Link href={`?contact=${c.id}`} key={c.id} className="drawer-quote" style={{ textDecoration: "none" }}><span className="mini-av">{c.name.slice(0, 2).toUpperCase()}</span><span style={{ color: "var(--text)" }}>{c.name}<small style={{ color: "var(--faint)", marginLeft: 6 }}>{c.title}</small></span></Link>)}
                </div>
                <div className="drawer-sec">
                  <div className="eyebrow" style={{ display: "flex", justifyContent: "space-between" }}>Deals ({data.deals.length}) <button className="addq" style={{ marginLeft: "auto", padding: "3px 10px" }} onClick={() => setCreating((v) => !v)}>+ New</button></div>
                  {creating && (
                    <div className="answer-form" style={{ padding: 12, borderRadius: 9, marginBottom: 8 }}>
                      <input className="ed" style={{ border: "1px solid var(--line-2)", width: "100%", marginBottom: 6 }} placeholder={`${data.name} × Layers`} value={nd.name} onChange={(e) => setNd({ ...nd, name: e.target.value })} />
                      <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                        <input className="ed num" style={{ border: "1px solid var(--line-2)", flex: 1 }} type="number" value={nd.amount} onChange={(e) => setNd({ ...nd, amount: +e.target.value || 0 })} />
                        <Select value={nd.contactId} options={[{ value: "", label: "No contact" }, ...data.contacts.map((c: Data) => ({ value: c.id, label: c.name }))]} onValueChange={(v) => setNd({ ...nd, contactId: v })} className="ui-grow" />
                      </div>
                      <Select value={nd.stage} options={STAGES.slice(0, 5)} onValueChange={(v) => setNd({ ...nd, stage: v })} className="ui-block" />
                      <button className="btn primary" style={{ width: "100%" }} onClick={createDeal}>Create deal</button>
                    </div>
                  )}
                  {data.deals.map((d: Data) => <Link href={`?deal=${d.id}`} key={d.id} className="drawer-quote" style={{ textDecoration: "none" }}><span style={{ flex: 1, color: "var(--text)" }}>{d.name}<small style={{ color: "var(--faint)", marginLeft: 6 }}>{d.stage}</small></span><span style={{ color: "var(--neon)", fontWeight: 700 }}>{money(d.amount)}</span></Link>)}
                </div>
                <EventList events={data.events} />
                <Link href={`/companies/${data.id}`} className="btn primary" style={{ display: "block", textAlign: "center", textDecoration: "none", marginTop: 6 }} onClick={close}>Open full record</Link>
              </div>
            )}

            {data && kind === "contact" && (
              <div className="drawer-body">
                <div className="drawer-title font-display">{data.name}</div>
                <div className="drawer-amt" style={{ color: "var(--muted)" }}>{data.title}</div>
                <div className="drawer-kv">
                  <div><span>Company</span><Link href={`?company=${data.company.id}`} className="drawer-link">{data.company.name}</Link></div>
                  <div><span>Email</span><b>{data.email}</b></div>
                  <div><span>Phone</span><b>{data.phone}</b></div>
                </div>
                <div className="drawer-sec"><div className="eyebrow">Deals ({data.deals.length})</div>
                  {data.deals.map((d: Data) => <Link href={`?deal=${d.id}`} key={d.id} className="drawer-quote" style={{ textDecoration: "none" }}><span style={{ flex: 1, color: "var(--text)" }}>{d.name}<small style={{ color: "var(--faint)", marginLeft: 6 }}>{d.stage}</small></span><span style={{ color: "var(--neon)", fontWeight: 700 }}>{money(d.amount)}</span></Link>)}
                </div>
                <EventList events={data.events} />
                <Link href={`/contacts/${data.id}`} className="btn primary" style={{ display: "block", textAlign: "center", textDecoration: "none", marginTop: 6 }} onClick={close}>Open full record</Link>
              </div>
            )}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
