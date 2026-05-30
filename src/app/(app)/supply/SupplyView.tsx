"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/components/Toast";
import {
  addLineItemAction,
  addQuoteAction,
  removeLineItemAction,
  setLineItemAction,
  setQuoteFieldAction,
  answerDemandAction,
} from "./actions";

export type SupplyItem = { id: string; item: string; quantity: number; targetPrice: number };
export type SupplyQuote = {
  quoteId: string; clientName: string; type: string; status: string; priority: string;
  grade: string; raghouseId: string | null; sellingPriceTotal: number | null; buyingPriceTotal: number | null;
  items: SupplyItem[];
};
export type Sourced = {
  id: string; itemName: string; quoteRefs: string; totalQty: number; availabilityQty: number;
  buyingPricePerItem: number | null; grade: string | null; mixSpecs: string | null; salesMessage: string | null;
  status: string; createdBy: string | null; createdAt: string;
};

const BULK_STATUS = ["In Progress", "Awaiting video", "Closed/Won", "Delivered"];
const HP_STATUS = ["In Progress", "Pending confirm", "Closed/Won", "Cancelled"];
const withCurrent = (list: string[], cur: string) => (list.includes(cur) ? list : [cur, ...list]);

export default function SupplyView({
  quotes, raghouses, canRag, canMargin, handpickOnlyDemand = false, responses = [],
}: {
  quotes: SupplyQuote[];
  raghouses: { id: string; name: string }[];
  canRag: boolean; canMargin: boolean; roleName: string; handpickOnlyDemand?: boolean;
  responses?: Sourced[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [answering, setAnswering] = useState<string | null>(null);
  const [form, setForm] = useState({ buy: "", grade: "A", avail: "", specs: "", msg: "", rag: "" });

  function persist(fn: () => Promise<unknown>, toast?: string) {
    startTransition(async () => {
      try { await fn(); if (toast) showToast(toast); router.refresh(); }
      catch (e) { showToast(e instanceof Error && e.message.includes("FORBIDDEN") ? "Not permitted for your role" : "Save failed"); }
    });
  }

  const demand = useMemo(() => {
    const map = new Map<string, { name: string; total: number; refs: { id: string; qty: number }[]; tsum: number; tn: number }>();
    const source = handpickOnlyDemand ? quotes.filter((q) => q.type === "Handpick") : quotes;
    for (const q of source) for (const it of q.items) {
      const key = (it.item || "").trim().toLowerCase();
      if (!key || !it.quantity) continue;
      const cur = map.get(key) ?? { name: it.item.trim(), total: 0, refs: [], tsum: 0, tn: 0 };
      cur.total += it.quantity; cur.refs.push({ id: q.quoteId, qty: it.quantity });
      if (it.targetPrice) { cur.tsum += it.targetPrice * it.quantity; cur.tn += it.quantity; }
      map.set(key, cur);
    }
    return [...map.values()].sort((a, b) => b.refs.length - a.refs.length || b.total - a.total);
  }, [quotes, handpickOnlyDemand]);

  function openAnswer(name: string, total: number) {
    setAnswering(answering === name ? null : name);
    setForm({ buy: "", grade: "A", avail: String(total), specs: "", msg: "", rag: "" });
  }
  function submitAnswer(name: string, total: number, refs: string[]) {
    persist(async () => {
      await answerDemandAction({
        itemName: name, quoteRefs: refs, totalQty: total,
        availabilityQty: Number(form.avail) || total, buyingPricePerItem: Number(form.buy) || 0,
        grade: form.grade, mixSpecs: form.specs, salesMessage: form.msg, raghouseId: form.rag || undefined,
      });
      setAnswering(null);
      showToast(`Sourced ${name} — Sales notified to negotiate`);
    });
  }

  return (
    <>
      <section className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-h">
          <h2>Quotes</h2>
          <span className="count">client name shown with every Quote ID · tap any field to edit</span>
          <button className="addq" onClick={() => persist(async () => { const r = (await addQuoteAction()) as { quoteId: string }; showToast(`Quote ${r.quoteId} created`); })}>+ New quote</button>
        </div>
        <div>
          {quotes.map((q) => {
            const isHP = q.type === "Handpick";
            const opts = withCurrent(isHP ? HP_STATUS : BULK_STATUS, q.status);
            return (
              <div className="q" key={q.quoteId}>
                <div className="q-top">
                  <span className="q-id">{q.quoteId}</span>
                  <span className="q-client-tag" title="Client">{q.clientName}</span>
                  <select className={`q-type ed ${isHP ? "hp" : ""}`} style={{ appearance: "none", fontWeight: 700 }} value={q.type} onChange={(e) => persist(() => setQuoteFieldAction(q.quoteId, "type", e.target.value), "Quote routed to " + e.target.value)}>
                    <option>Bulk</option><option>Handpick</option>
                  </select>
                  <input className="ed client" defaultValue={q.clientName} onBlur={(e) => e.target.value !== q.clientName && persist(() => setQuoteFieldAction(q.quoteId, "clientName", e.target.value))} />
                  {!isHP && (
                    <select className="ed" style={{ width: 58 }} value={q.grade} onChange={(e) => persist(() => setQuoteFieldAction(q.quoteId, "grade", e.target.value))}><option>A</option><option>B</option></select>
                  )}
                  <select className="ed" value={q.status} onChange={(e) => persist(() => setQuoteFieldAction(q.quoteId, "status", e.target.value))}>
                    {opts.map((s) => <option key={s}>{s}</option>)}
                  </select>
                  {canRag && (
                    <span className="rag-wrap">
                      <span className="tagico">Raghouse</span>
                      <select className="ed" value={q.raghouseId ?? ""} onChange={(e) => persist(() => setQuoteFieldAction(q.quoteId, "raghouseId", e.target.value))}>
                        <option value="">—</option>
                        {raghouses.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    </span>
                  )}
                  {canMargin && q.buyingPriceTotal != null && (
                    <span className="lock" style={{ marginLeft: "auto", color: "var(--neon)" }} title="Margin-walled">
                      <svg fill="none" strokeWidth={2} viewBox="0 0 24 24"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>
                      Buy ${Math.round(q.buyingPriceTotal).toLocaleString("en-US")} · Sell ${Math.round(q.sellingPriceTotal ?? 0).toLocaleString("en-US")}
                    </span>
                  )}
                </div>
                <div className="litems">
                  <div className="lhead"><span>Item</span><span className="req">Qty</span><span className="req">Client target $/item</span><span /></div>
                  {q.items.map((it) => (
                    <div className="litem" key={it.id}>
                      <input className="ed" defaultValue={it.item} placeholder="e.g. Carhartt jackets" onBlur={(e) => e.target.value !== it.item && persist(() => setLineItemAction(it.id, "item", e.target.value))} />
                      <input className="ed num" type="number" min={0} defaultValue={it.quantity} onBlur={(e) => Number(e.target.value) !== it.quantity && persist(() => setLineItemAction(it.id, "quantity", e.target.value))} />
                      <input className="ed num" type="number" min={0} step={0.01} style={{ width: 108 }} defaultValue={it.targetPrice} onBlur={(e) => Number(e.target.value) !== it.targetPrice && persist(() => setLineItemAction(it.id, "targetPrice", e.target.value))} />
                      <button className="rm" title="Remove" onClick={() => persist(() => removeLineItemAction(it.id))}>×</button>
                    </div>
                  ))}
                  <button className="addline" onClick={() => persist(() => addLineItemAction(q.quoteId))}>+ Add item</button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-h">
          <h2>{handpickOnlyDemand ? "Handpick demand" : "Consolidated demand"}</h2>
          <span className="count">answer demand → record sourcing → notify Sales to negotiate</span>
        </div>
        <div>
          {demand.map((m) => {
            const multi = m.refs.length > 1;
            const avg = m.tn ? `avg target $${(m.tsum / m.tn).toFixed(2)}/item` : "";
            const isOpen = answering === m.name;
            return (
              <div key={m.name}>
                <div className={`dem-row${multi ? " multi" : ""}`}>
                  <div className="it">
                    {m.name}
                    {multi && <span style={{ fontSize: 9, fontWeight: 700, color: "var(--neon)", textTransform: "uppercase", letterSpacing: ".05em", marginLeft: 6 }}>{m.refs.length} quotes</span>}
                    <small>{avg}</small>
                  </div>
                  <div className="qty">{m.total.toLocaleString("en-US")}</div>
                  <div className="srcs">{m.refs.map((r) => <span className="chip-q" key={r.id}>{r.id} · {r.qty}</span>)}</div>
                  <button className="neg" onClick={() => openAnswer(m.name, m.total)}>{isOpen ? "Close" : "Answer demand"}</button>
                </div>
                {isOpen && (
                  <div className="answer-form">
                    <div className="af-grid">
                      {canMargin && (
                        <label className="se-field"><span className="se-label">Buying price / item (supplier) 🔒</span>
                          <input className="se-input" type="number" step="0.01" placeholder="0.00" value={form.buy} onChange={(e) => setForm({ ...form, buy: e.target.value })} /></label>
                      )}
                      <label className="se-field"><span className="se-label">Grade</span>
                        <select className="se-input" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })}><option>A</option><option>B</option><option>A/B mix</option></select></label>
                      <label className="se-field"><span className="se-label">Available qty</span>
                        <input className="se-input" type="number" value={form.avail} onChange={(e) => setForm({ ...form, avail: e.target.value })} /></label>
                      {canRag && (
                        <label className="se-field"><span className="se-label">Raghouse</span>
                          <select className="se-input" value={form.rag} onChange={(e) => setForm({ ...form, rag: e.target.value })}><option value="">—</option>{raghouses.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
                      )}
                      <label className="se-field" style={{ gridColumn: "1 / -1" }}><span className="se-label">Mix / composition specs (visible to Sales)</span>
                        <input className="se-input" placeholder="e.g. 60% jackets / 40% overshirts, 90s–Y2K, mixed colourways" value={form.specs} onChange={(e) => setForm({ ...form, specs: e.target.value })} /></label>
                      <label className="se-field" style={{ gridColumn: "1 / -1" }}><span className="se-label">Message to Sales</span>
                        <input className="se-input" placeholder="Ready to negotiate — confirm grade & qty with client" value={form.msg} onChange={(e) => setForm({ ...form, msg: e.target.value })} /></label>
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
                      <button className="btn ghost" style={{ flex: "none", padding: "8px 14px" }} onClick={() => setAnswering(null)}>Cancel</button>
                      <button className="btn primary" style={{ flex: "none", padding: "8px 16px" }} onClick={() => submitAnswer(m.name, m.total, m.refs.map((r) => r.id))}>Source &amp; notify Sales</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {demand.length === 0 && <div className="q-note" style={{ padding: 16 }}>No open demand.</div>}
        </div>
      </section>

      <section className="panel">
        <div className="panel-h"><h2>Sourcing answered</h2><span className="count">{responses.length} responses · Sales notified</span></div>
        <div>
          {responses.map((r) => (
            <div className="sourced-row" key={r.id}>
              <div className="it" style={{ minWidth: 160 }}>{r.itemName}<small>{r.grade ? `Grade ${r.grade} · ` : ""}{r.availabilityQty.toLocaleString("en-US")} available</small></div>
              <div style={{ flex: 1, fontSize: 11.5, color: "var(--muted)" }}>{r.mixSpecs || r.salesMessage || "—"}</div>
              <div className="srcs">{r.quoteRefs.split(",").filter(Boolean).map((id) => <span className="chip-q" key={id}>{id}</span>)}</div>
              {canMargin && r.buyingPricePerItem != null && <span className="lock" style={{ color: "var(--neon)" }}>buy ${r.buyingPricePerItem.toFixed(2)}/item</span>}
              <span className={`st ${r.status === "Confirmed" ? "go" : "work"}`}><span className="d" />{r.status}</span>
            </div>
          ))}
          {responses.length === 0 && <div className="q-note" style={{ padding: 16 }}>No demand answered yet — use “Answer demand” above.</div>}
        </div>
      </section>
    </>
  );
}
