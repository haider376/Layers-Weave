"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { showToast } from "@/components/Toast";
import { updateProfileAction } from "@/app/actions/session";

type Team = { name: string; email: string; role: string; active: boolean }[];
const TABS = ["Profile", "Notifications", "Integrations", "Pricing", "Team"] as const;
type Tab = (typeof TABS)[number];

function Toggle({ label, sub, defaultOn = true }: { label: string; sub: string; defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div className="set-row" onClick={() => setOn((v) => !v)}>
      <div><div className="set-row-t">{label}</div><div className="set-row-s">{sub}</div></div>
      <span className={`switch${on ? " on" : ""}`}><span className="knob" /></span>
    </div>
  );
}

export default function SettingsView({ me, isAdmin, team }: { me: { name: string; email: string; role: string }; isAdmin: boolean; team: Team }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("Profile");
  const [name, setName] = useState(me.name);
  const [pending, start] = useTransition();
  const tabs = TABS.filter((t) => t !== "Team" || isAdmin);

  function saveProfile() {
    start(async () => { await updateProfileAction({ name }); showToast("Profile saved"); router.refresh(); });
  }

  return (
    <div className="settings">
      <aside className="set-tabs">
        {tabs.map((t) => (
          <button key={t} className={`set-tab${tab === t ? " on" : ""}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </aside>

      <motion.section key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="panel set-panel">
        <div className="panel-h"><h2>{tab}</h2></div>
        <div className="set-body">
          {tab === "Profile" && (
            <div className="detail-grid" style={{ maxWidth: 420 }}>
              <div className="dg-row"><span className="dg-label">Name</span><input className="dg-input" value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div className="dg-row"><span className="dg-label">Email</span><input className="dg-input" value={me.email} disabled /></div>
              <div className="dg-row"><span className="dg-label">Role</span><input className="dg-input" value={me.role} disabled /></div>
              <div className="dg-row"><span className="dg-label">Photo</span><span className="set-row-s">Use the avatar in the sidebar to crop & upload.</span></div>
              <div style={{ marginTop: 6 }}><button className="btn primary" style={{ flex: "none", padding: "10px 20px" }} disabled={pending} onClick={saveProfile}>Save profile</button></div>
            </div>
          )}
          {tab === "Notifications" && (
            <div className="set-list">
              <Toggle label="New SQL booked" sub="Notify me when a meeting is booked" />
              <Toggle label="Deal won" sub="Celebrate closed-won deals" />
              <Toggle label="Demand answered" sub="When Supply sources an item to negotiate" />
              <Toggle label="@mentions & assignments" sub="When you're tagged or assigned" />
              <Toggle label="Daily digest email" sub="Morning summary of your pipeline" defaultOn={false} />
            </div>
          )}
          {tab === "Integrations" && (
            <div className="set-list">
              {[["Zoom Phone", "Click-to-call + call logging", "Z", "#2D8CFF"], ["Gmail", "2-way email sync to timelines", "G", "#EA4335"], ["Outlook", "2-way email sync", "O", "#0078D4"], ["Google Calendar", "Meeting sync to the calendar", "C", "#1A73E8"], ["Fireflies", "Call recordings & notes", "F", "#7C3AED"], ["WhatsApp Business", "Client comms flag", "W", "#25D366"]].map(([n, s, ic, col]) => (
                <div className="set-row" key={n}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span className="itg-ic" style={{ background: col as string, color: "#fff" }}>{ic}</span>
                    <div><div className="set-row-t">{n}</div><div className="set-row-s">{s}</div></div>
                  </div>
                  <button className="itg-cta" onClick={() => showToast(`Connecting ${n}… (OAuth)`)}>Connect</button>
                </div>
              ))}
            </div>
          )}
          {tab === "Pricing" && (
            <div className="set-list">
              <div className="set-row-s" style={{ marginBottom: 6 }}>Markup tiers (on buying price). 30% standard · 15% floor · 5% needs CRO approval.</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[["30%", "Standard"], ["25%", "Disc."], ["20%", "Disc."], ["15%", "Floor"], ["5%", "🔒 CRO"]].map(([p, t]) => (
                  <div className="tier" key={p} style={{ width: 92, cursor: "default" }}><div className="pc">{p}</div><div className="tag">{t}</div></div>
                ))}
              </div>
              <div className="set-row-s" style={{ margin: "14px 0 6px" }}>Shipping hike</div>
              <div style={{ display: "flex", gap: 8 }}>{["5%", "10%", "15%"].map((p) => <div className="tier" key={p} style={{ width: 80, cursor: "default" }}><div className="pc">{p}</div></div>)}</div>
            </div>
          )}
          {tab === "Team" && (
            <table>
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th></tr></thead>
              <tbody>
                {team.map((u) => (
                  <tr className="row" key={u.email}>
                    <td style={{ fontWeight: 600 }}>{u.name}</td><td>{u.email}</td><td>{u.role}</td>
                    <td><span className={`st ${u.active ? "go" : "bad"}`}><span className="d" />{u.active ? "Active" : "Disabled"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </motion.section>
    </div>
  );
}
