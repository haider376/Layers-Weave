"use client";

import { useState, useTransition } from "react";
import { showToast } from "@/components/Toast";
import { savePricingAction } from "./actions";

const money = (n: number) =>
  "$" + (Math.round(n * 100) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const MARKUPS = [
  { v: 5, tag: "CRO ok", lock: true },
  { v: 15, tag: "Floor" },
  { v: 20, tag: "Disc." },
  { v: 25, tag: "Disc." },
  { v: 30, tag: "Standard" },
];
const HIKES = [5, 10, 15];

export default function Calculator({ quoteId, canMargin }: { quoteId: string | null; canMargin: boolean }) {
  const [buy, setBuy] = useState(10);
  const [qty, setQty] = useState(100);
  const [ship, setShip] = useState(120);
  const [mk, setMk] = useState(30);
  const [sh, setSh] = useState(10);
  const [pending, startTransition] = useTransition();

  const sell = buy * (1 + mk / 100);
  const itemsub = sell * qty;
  const shipout = ship * (1 + sh / 100);
  const margin = (sell - buy) * qty + (shipout - ship);
  const total = itemsub + shipout;
  const locked = mk === 5;

  function save() {
    startTransition(async () => {
      try {
        const r = await savePricingAction({
          quoteId,
          buyingPrice: buy,
          quantity: qty,
          markup: mk,
          shippingCost: ship,
          shippingHike: sh,
        });
        if (r.approval) showToast("Approval request sent to CRO");
        else showToast(r.saved ? `Saved to quote ${quoteId}` : "Estimate calculated");
      } catch {
        showToast("Save failed");
      }
    });
  }

  function reset() {
    setBuy(10);
    setQty(100);
    setShip(120);
    setMk(30);
    setSh(10);
  }

  return (
    <div className="calc">
      <div className="ccard">
        <div className="ccard-h"><span className="n">1</span><h2>Item pricing</h2></div>
        <div className="inrow">
          <div className="field">
            <label>Buying price / item</label>
            <div className="inp">
              <span className="pre">$</span>
              <input type="number" min={0} step={0.01} value={buy} onChange={(e) => setBuy(+e.target.value || 0)} inputMode="decimal" />
            </div>
          </div>
          <div className="field">
            <label>Quantity</label>
            <div className="inp">
              <input type="number" min={1} step={1} value={qty} onChange={(e) => setQty(Math.max(0, Math.round(+e.target.value || 0)))} inputMode="numeric" />
            </div>
          </div>
        </div>
        <div className="field">
          <label>Markup tier</label>
          <div className="tiers">
            {MARKUPS.map((m) => (
              <div
                key={m.v}
                className={`tier${m.lock ? " lk" : ""}${mk === m.v ? " on" : ""}`}
                onClick={() => setMk(m.v)}
              >
                {m.lock && <span className="lkico">🔒</span>}
                <div className="pc">{m.v}%</div>
                <div className="tag">{m.tag}</div>
              </div>
            ))}
          </div>
        </div>
        <div className={`warn${locked ? " show" : ""}`}>
          <svg fill="none" strokeWidth={2} viewBox="0 0 24 24"><path d="M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" /></svg>
          5% is below the 15% floor — needs CRO approval before sending.
        </div>
      </div>

      <div className="ccard">
        <div className="ccard-h"><span className="n">2</span><h2>Shipping</h2></div>
        <div className="field" style={{ marginBottom: 16 }}>
          <label>Shipping cost</label>
          <div className="inp">
            <span className="pre">$</span>
            <input type="number" min={0} step={0.01} value={ship} onChange={(e) => setShip(+e.target.value || 0)} inputMode="decimal" />
          </div>
        </div>
        <div className="field">
          <label>Shipping hike</label>
          <div className="ships">
            {HIKES.map((h) => (
              <div key={h} className={`tier${sh === h ? " on" : ""}`} onClick={() => setSh(h)}>
                <div className="pc">{h}%</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="sum">
        <div className="sum-h">
          {quoteId ? <>Quote summary · <span style={{ color: "var(--violet-br)" }}>{quoteId}</span></> : "General estimate"}
        </div>
        <div className="lines">
          <div className="ln"><span className="k">Selling / item <small>(+{mk}%)</small></span><span className="v">{money(sell)}</span></div>
          <div className="ln"><span className="k">Items subtotal <small>× {qty.toLocaleString("en-US")}</small></span><span className="v">{money(itemsub)}</span></div>
          <div className="ln"><span className="k">Shipping to client <small>(+{sh}%)</small></span><span className="v">{money(shipout)}</span></div>
          {canMargin && (
            <div className="ln margin">
              <span className="k">Your margin <small>{total > 0 ? `(${Math.round((margin / total) * 100)}% of total)` : ""}</small></span>
              <span className="v">{money(margin)}</span>
            </div>
          )}
        </div>
        <div className="total"><span className="k">Client total</span><span className="v">{money(total)}</span></div>
      </div>

      <div className="cact">
        <button className="btn ghost" onClick={reset} disabled={pending}>Reset</button>
        <button className="btn primary" onClick={save} disabled={pending}>
          {locked ? "Request CRO approval" : quoteId ? "Save to quote" : "Save estimate"}
        </button>
      </div>

      <div className="note">
        <svg fill="none" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>
        Buying price &amp; margin are visible to CRO, Sales Manager, Head of Supply &amp; Rija only.
      </div>
    </div>
  );
}
