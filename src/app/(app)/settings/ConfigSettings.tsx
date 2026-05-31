"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/components/Toast";
import Select from "@/components/ui/Select";
import NumberInput from "@/components/ui/NumberInput";
import { saveConfigAction } from "@/app/actions/config";
import type { AppConfig } from "@/lib/appConfig";

// Admin "how the app works" panel — pricing defaults, behavior switches.
export default function ConfigSettings({ initial }: { initial: AppConfig }) {
  const router = useRouter();
  const [cfg, setCfg] = useState<AppConfig>(initial);
  const [pending, start] = useTransition();
  const set = <K extends keyof AppConfig>(k: K, v: AppConfig[K]) => setCfg((c) => ({ ...c, [k]: v }));

  function save() {
    start(async () => {
      try { await saveConfigAction(cfg); showToast("Configuration saved"); router.refresh(); }
      catch { showToast("Not permitted"); }
    });
  }

  const Switch = ({ k, label, sub }: { k: keyof AppConfig; label: string; sub: string }) => (
    <div className="set-row" onClick={() => set(k, !cfg[k] as never)}>
      <div><div className="set-row-t">{label}</div><div className="set-row-s">{sub}</div></div>
      <span className={`switch${cfg[k] ? " on" : ""}`}><span className="knob" /></span>
    </div>
  );

  return (
    <div className="cfg">
      <div className="gs-block">
        <div className="set-row-t" style={{ marginBottom: 2 }}>Pricing defaults</div>
        <div className="set-row-s" style={{ marginBottom: 14 }}>Drives the Price Calculator and quote generation</div>
        <div className="cfg-grid">
          <label className="gs-field"><span>Currency</span>
            <Select value={cfg.currency} options={[{ value: "GBP", label: "GBP £" }, { value: "USD", label: "USD $" }, { value: "EUR", label: "EUR €" }]} onValueChange={(v) => set("currency", v as AppConfig["currency"])} />
          </label>
          <label className="gs-field"><span>Default markup %</span><NumberInput value={cfg.defaultMarkupPct} onValueChange={(v) => set("defaultMarkupPct", v)} min={0} max={100} /></label>
          <label className="gs-field"><span>Shipping hike %</span><NumberInput value={cfg.shippingHikePct} onValueChange={(v) => set("shippingHikePct", v)} min={0} max={100} /></label>
          <label className="gs-field"><span>Freight rate / kg</span><NumberInput value={cfg.perKgRate} onValueChange={(v) => set("perKgRate", v)} min={0} step={0.01} prefix="£" /></label>
          <label className="gs-field"><span>Require approval below %</span><NumberInput value={cfg.requireApprovalBelowPct} onValueChange={(v) => set("requireApprovalBelowPct", v)} min={0} max={100} /></label>
        </div>
      </div>

      <div className="gs-block">
        <div className="set-row-t" style={{ marginBottom: 2 }}>Behavior</div>
        <div className="set-row-s" style={{ marginBottom: 8 }}>Toggle how the workspace behaves for everyone</div>
        <div className="set-list">
          <Switch k="autoQuoteOnRequest" label="Auto-create quote on request" sub="Generate an LQ-##### when a deal hits Initiation" />
          <Switch k="celebrationsOn" label="Win celebrations" sub="Confetti & hype on Closed Won across the team" />
          <Switch k="weekStartsMonday" label="Week starts Monday" sub="Calendar & weekly goals start on Monday" />
          <Switch k="leaderboardPublic" label="Public leaderboard" sub="Everyone can see the AE / BDR leaderboard" />
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <button className="btn ghost" style={{ flex: "none", padding: "10px 18px" }} onClick={() => setCfg(initial)} disabled={pending}>Reset</button>
        <button className="btn primary" style={{ flex: "none", padding: "10px 22px" }} onClick={save} disabled={pending}>{pending ? "Saving…" : "Save configuration"}</button>
      </div>
    </div>
  );
}
