"use client";

import { useMemo, useState } from "react";
import { showToast } from "@/components/Toast";

const money = (n: number) => "£" + (Math.round(n * 100) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const MARKUPS = [5, 15, 20, 25, 30];
const HIKES = [5, 10, 15];

type Line = { id: number; category: string; buy: number; qty: number; kg: number };
let nextId = 4;

export default function Calculator({ quoteId, canMargin }: { quoteId: string | null; canMargin: boolean }) {
  const [markup, setMarkup] = useState(30);
  const [ratePerKg, setRatePerKg] = useState(4.33);
  const [shipHike, setShipHike] = useState(10);
  const [client, setClient] = useState("");
  const [lines, setLines] = useState<Line[]>([
    { id: 1, category: "Carhartt jackets", buy: 18, qty: 240, kg: 0.9 },
    { id: 2, category: "Vintage denim", buy: 3.7, qty: 800, kg: 0.6 },
    { id: 3, category: "Y2K hoodies", buy: 3.9, qty: 1200, kg: 0.5 },
  ]);

  const calc = useMemo(() => {
    const rows = lines.map((l) => {
      const sellItem = l.buy * (1 + markup / 100);
      const shipItem = l.kg * ratePerKg * (1 + shipHike / 100);
      const perPieceShipped = sellItem + shipItem;
      const lineTotal = perPieceShipped * l.qty;
      const lineMargin = (sellItem - l.buy) * l.qty + (l.kg * ratePerKg * (shipHike / 100)) * l.qty;
      return { ...l, sellItem, shipItem, perPieceShipped, lineTotal, lineMargin };
    });
    const itemsSubtotal = rows.reduce((s, r) => s + r.sellItem * r.qty, 0);
    const shippingTotal = rows.reduce((s, r) => s + r.shipItem * r.qty, 0);
    const grand = itemsSubtotal + shippingTotal;
    const margin = rows.reduce((s, r) => s + r.lineMargin, 0);
    const units = rows.reduce((s, r) => s + r.qty, 0);
    return { rows, itemsSubtotal, shippingTotal, grand, margin, units };
  }, [lines, markup, ratePerKg, shipHike]);

  const locked = markup === 5;

  function setLine(id: number, patch: Partial<Line>) { setLines((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l))); }
  function addLine() { setLines((ls) => [...ls, { id: nextId++, category: "", buy: 0, qty: 0, kg: 0.5 }]); }
  function rmLine(id: number) { setLines((ls) => (ls.length > 1 ? ls.filter((l) => l.id !== id) : ls)); }

  function save() {
    if (locked) { showToast("5% markup → CRO approval requested"); return; }
    showToast(quoteId ? `Invoice saved to ${quoteId}` : "Invoice ready");
  }

  return (
    <div className="inv">
      {/* LEFT — builder */}
      <div className="inv-build">
        <section className="ccard">
          <div className="ccard-h"><span className="n">1</span><h2>Pricing rules</h2></div>
          <div className="field"><label>Markup on buying price</label>
            <div className="tiers">
              {MARKUPS.map((m) => (
                <div key={m} className={`tier${m === 5 ? " lk" : ""}${markup === m ? " on" : ""}`} onClick={() => setMarkup(m)}>
                  {m === 5 && <span className="lkico">🔒</span>}
                  <div className="pc">{m}%</div>
                  <div className="tag">{m === 30 ? "Standard" : m === 15 ? "Floor" : m === 5 ? "CRO" : "Disc."}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="inrow" style={{ marginTop: 16 }}>
            <div className="field"><label>Shipping rate / kg</label><div className="inp"><span className="pre">£</span><input type="number" step="0.01" value={ratePerKg} onChange={(e) => setRatePerKg(+e.target.value || 0)} /></div></div>
            <div className="field"><label>Shipping hike</label>
              <div className="ships">{HIKES.map((h) => <div key={h} className={`tier${shipHike === h ? " on" : ""}`} onClick={() => setShipHike(h)}><div className="pc">{h}%</div></div>)}</div>
            </div>
          </div>
          <div className={`warn${locked ? " show" : ""}`}>
            <svg fill="none" strokeWidth={2} viewBox="0 0 24 24"><path d="M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" /></svg>
            5% is below the 15% floor — needs CRO approval before sending.
          </div>
        </section>

        <section className="ccard">
          <div className="ccard-h"><span className="n">2</span><h2>Items</h2></div>
          <div className="inv-head"><span>Category</span><span>Buy £/item</span><span>Qty</span><span>kg/item</span><span /></div>
          {calc.rows.map((r) => (
            <div className="inv-line" key={r.id}>
              <input className="ed" value={r.category} placeholder="e.g. Carhartt jackets" onChange={(e) => setLine(r.id, { category: e.target.value })} />
              <input className="ed num" type="number" step="0.01" value={r.buy} onChange={(e) => setLine(r.id, { buy: +e.target.value || 0 })} />
              <input className="ed num" type="number" value={r.qty} onChange={(e) => setLine(r.id, { qty: +e.target.value || 0 })} />
              <input className="ed num" type="number" step="0.01" value={r.kg} onChange={(e) => setLine(r.id, { kg: +e.target.value || 0 })} />
              <button className="rm" onClick={() => rmLine(r.id)}>×</button>
            </div>
          ))}
          <button className="addline" onClick={addLine}>+ Add item</button>
        </section>
      </div>

      {/* RIGHT — live invoice */}
      <div className="inv-doc">
        <div className="inv-doc-h">
          <div><div className="eyebrow">Invoice preview</div><div className="inv-doc-title font-display">{quoteId ?? "ESTIMATE"}</div></div>
          <input className="ed client" placeholder="Client name" value={client} onChange={(e) => setClient(e.target.value)} style={{ textAlign: "right" }} />
        </div>
        <div className="inv-doc-table">
          <div className="invd-head"><span>Item</span><span>Per pc shipped</span><span>Qty</span><span>Total</span></div>
          {calc.rows.map((r) => (
            <div className="invd-row" key={r.id}>
              <div className="invd-it">{r.category || "—"}<small>sell {money(r.sellItem)} + ship {money(r.shipItem)}</small></div>
              <span className="tabular-nums">{money(r.perPieceShipped)}</span>
              <span className="tabular-nums">{r.qty.toLocaleString("en-US")}</span>
              <span className="tabular-nums" style={{ fontWeight: 700 }}>{money(r.lineTotal)}</span>
            </div>
          ))}
        </div>
        <div className="inv-doc-sum">
          <div className="ln"><span className="k">Items subtotal <small>× {calc.units.toLocaleString("en-US")} units</small></span><span className="v">{money(calc.itemsSubtotal)}</span></div>
          <div className="ln"><span className="k">Shipping (+{shipHike}%)</span><span className="v">{money(calc.shippingTotal)}</span></div>
          {canMargin && <div className="ln margin"><span className="k">Your margin</span><span className="v">{money(calc.margin)}</span></div>}
        </div>
        <div className="total"><span className="k">Client total</span><span className="v">{money(calc.grand)}</span></div>
        <div className="cact">
          <button className="btn ghost" onClick={() => { setLines([{ id: nextId++, category: "", buy: 0, qty: 0, kg: 0.5 }]); }}>Clear</button>
          <button className="btn primary" onClick={save}>{locked ? "Request CRO approval" : quoteId ? "Save to quote" : "Save invoice"}</button>
        </div>
        <div className="note"><svg fill="none" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>Buying price &amp; margin are visible to margin-cleared roles only.</div>
      </div>
    </div>
  );
}
