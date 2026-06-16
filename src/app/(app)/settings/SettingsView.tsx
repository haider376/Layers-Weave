"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { showToast } from "@/components/Toast";
import BrandLogo from "@/components/BrandLogo";
import { updateProfileAction } from "@/app/actions/session";
import { disconnectGoogleAction } from "@/app/actions/google";
import { getPrefs, setPref, type Prefs } from "@/lib/prefs";
import { useEffect } from "react";
import GoalsSettings, { type AeMeta } from "./GoalsSettings";
import PermissionsSettings from "./PermissionsSettings";
import ConfigSettings from "./ConfigSettings";
import HubspotMigration from "./HubspotMigration";
import type { SalesGoals } from "@/lib/goals";
import type { PermissionMatrix, AppConfig } from "@/lib/appConfig";

type Team = { name: string; email: string; role: string; active: boolean }[];
const TABS = ["Profile", "Account", "Goals", "Permissions", "Workspace", "Notifications", "Pipeline", "Integrations", "Appearance", "Team"] as const;
type Tab = (typeof TABS)[number];
const STAGES = ["Appointment Scheduled", "Showed up", "No Show / Reschedule", "Initiation", "Closed Won", "Closed Lost", "Disqualified"];

function Toggle({ label, sub, defaultOn = true }: { label: string; sub: string; defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div className="set-row" onClick={() => setOn((v) => !v)}>
      <div><div className="set-row-t">{label}</div><div className="set-row-s">{sub}</div></div>
      <span className={`switch${on ? " on" : ""}`}><span className="knob" /></span>
    </div>
  );
}
// Persisted appearance toggle (writes to localStorage + applies immediately)
function PrefToggle({ pref, label, sub }: { pref: keyof Prefs; label: string; sub: string }) {
  const [on, setOn] = useState(true);
  useEffect(() => { setOn(getPrefs()[pref]); }, [pref]);
  return (
    <div className="set-row" onClick={() => { const v = !on; setOn(v); setPref(pref, v); }}>
      <div><div className="set-row-t">{label}</div><div className="set-row-s">{sub}</div></div>
      <span className={`switch${on ? " on" : ""}`}><span className="knob" /></span>
    </div>
  );
}
function Field({ label, value, type = "text", disabled }: { label: string; value: string; type?: string; disabled?: boolean }) {
  const [v, setV] = useState(value);
  return <div className="dg-row"><span className="dg-label">{label}</span><input className="dg-input" type={type} value={v} disabled={disabled} onChange={(e) => setV(e.target.value)} /></div>;
}

type GoogleState = { connected: boolean; email: string | null; configured: boolean };
type SlackState = { configured: boolean; channel: string | null };
type WhatsAppState = { configured: boolean };

export default function SettingsView({ me, isAdmin, team, goals, reps, permissions, config, google, zoom, slack, whatsapp }: { me: { name: string; email: string; role: string }; isAdmin: boolean; team: Team; goals: SalesGoals; reps: AeMeta[]; permissions: PermissionMatrix; config: AppConfig; google: GoogleState; zoom: GoogleState; slack: SlackState; whatsapp: WhatsAppState }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("Profile");
  const [name, setName] = useState(me.name);
  const [title, setTitle] = useState(me.role);
  const [pending, start] = useTransition();
  const ADMIN_ONLY: Tab[] = ["Team", "Goals", "Permissions", "Workspace"];
  const tabs = TABS.filter((t) => !ADMIN_ONLY.includes(t) || isAdmin);

  function saveProfile() { start(async () => { await updateProfileAction({ name, title }); showToast("Profile saved"); router.refresh(); }); }
  function disconnectGoogle() { start(async () => { await disconnectGoogleAction(); showToast("Google Calendar disconnected"); router.refresh(); }); }

  return (
    <div className="settings">
      <aside className="set-tabs">{tabs.map((t) => <button key={t} className={`set-tab${tab === t ? " on" : ""}`} onClick={() => setTab(t)}>{t}</button>)}</aside>

      <motion.section key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }} className="panel set-panel">
        <div className="panel-h"><h2>{tab}</h2></div>
        <div className="set-body">
          {tab === "Profile" && (
            <div className="detail-grid" style={{ maxWidth: 460 }}>
              <div className="dg-row"><span className="dg-label">Name</span><input className="dg-input" value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div className="dg-row"><span className="dg-label">Job title</span><input className="dg-input" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
              <div className="dg-row"><span className="dg-label">Email</span><input className="dg-input" value={me.email} disabled /></div>
              <Field label="Phone" value="+44 20 7946 0100" />
              <Field label="Time zone" value="Europe/London" />
              <div className="dg-row"><span className="dg-label">Photo</span><span className="set-row-s">Crop & upload via the sidebar avatar.</span></div>
              <div style={{ marginTop: 6 }}><button className="btn primary" style={{ flex: "none", padding: "10px 20px" }} disabled={pending} onClick={saveProfile}>Save profile</button></div>
            </div>
          )}
          {tab === "Account" && (
            <div className="set-list">
              <div className="detail-grid" style={{ maxWidth: 460, marginBottom: 8 }}>
                <Field label="Current password" value="" type="password" />
                <Field label="New password" value="" type="password" />
              </div>
              <Toggle label="Two-factor authentication" sub="Require a code at sign-in" defaultOn={false} />
              <Toggle label="Active sessions alert" sub="Email me about new device sign-ins" />
              <div className="set-row" style={{ borderColor: "rgba(226,87,78,.4)" }}><div><div className="set-row-t" style={{ color: "var(--red)" }}>Sign out everywhere</div><div className="set-row-s">End all other sessions</div></div><button className="btn ghost" style={{ flex: "none", padding: "8px 14px" }} onClick={() => showToast("Other sessions ended")}>Sign out all</button></div>
            </div>
          )}
          {tab === "Goals" && <GoalsSettings initial={goals} reps={reps} />}
          {tab === "Permissions" && <PermissionsSettings initial={permissions} />}
          {tab === "Workspace" && <ConfigSettings initial={config} />}
          {tab === "Notifications" && (
            <div className="set-list">
              <Toggle label="New SQL booked" sub="When a meeting is booked" />
              <Toggle label="Deal won" sub="Celebrate closed-won deals" />
              <Toggle label="Task due today" sub="Morning reminder of due tasks" />
              <Toggle label="@mentions & assignments" sub="When you're tagged or assigned" />
              <Toggle label="Stage changes on my deals" sub="When a deal you own moves" />
              <Toggle label="Daily digest email" sub="Morning pipeline summary" defaultOn={false} />
              <Toggle label="Weekly leaderboard recap" sub="Where you ranked last week" />
            </div>
          )}
          {tab === "Pipeline" && (
            <div className="set-list">
              <div className="set-row-s" style={{ marginBottom: 4 }}>Pipeline stages</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>{STAGES.map((s) => <span className="q-type" key={s} style={{ background: "var(--panel-2)", color: "var(--muted)" }}>{s}</span>)}</div>
              <div className="set-row-s" style={{ marginBottom: 4 }}>Default markup · shipping hike</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>{[["30%", "Markup"], ["10%", "Shipping"], ["£4.33", "Per kg"], ["GBP", "Currency"]].map(([p, t]) => <div className="tier" key={t} style={{ width: 96, cursor: "default" }}><div className="pc">{p}</div><div className="tag">{t}</div></div>)}</div>
              <Toggle label="Require CRO approval below 15%" sub="Lock quotes at the 5% tier" />
              <Toggle label="Auto-create quote on 'Requested a quote'" sub="Generate LQ-##### automatically" />
            </div>
          )}
          {tab === "Integrations" && (
            <div className="set-list">
              {/* Google Workspace — ONE connection powers Calendar + Gmail */}
              <div className="set-row">
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <BrandLogo name="google" label="Google" />
                  <div>
                    <div className="set-row-t">Google (Calendar + Gmail) {google.connected && <span className="st go" style={{ marginLeft: 6 }}><span className="d" />Connected</span>}</div>
                    <div className="set-row-s">{google.connected ? `${google.email ?? "Connected"} · calendar sync, invites & send email from Gmail` : google.configured ? "Sync calendar events, send invites & email from your Gmail" : "Needs Google API keys (admin setup)"}</div>
                  </div>
                </div>
                {google.connected ? (
                  <button className="itg-cta" style={{ borderColor: "var(--line-2)", color: "var(--muted)" }} disabled={pending} onClick={disconnectGoogle}>Disconnect</button>
                ) : google.configured ? (
                  <a className="itg-cta" href="/api/integrations/google/connect">Connect</a>
                ) : (
                  <span className="set-row-s" style={{ fontStyle: "italic" }}>Not configured</span>
                )}
              </div>
              {/* Zoom Phone — live OAuth integration (click-to-call + auto-log) */}
              <div className="set-row">
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <BrandLogo name="zoom" label="Zoom" />
                  <div>
                    <div className="set-row-t">Zoom Phone {zoom.connected
                      ? <span className="st go" style={{ marginLeft: 6 }}><span className="d" />Active</span>
                      : <span className="st bad" style={{ marginLeft: 6 }}><span className="d" />Not configured</span>}</div>
                    <div className="set-row-s">{zoom.connected ? "Account-level · click-to-call + automatic call logging for the whole team" : "Needs Zoom Server-to-Server credentials (admin env setup)"}</div>
                  </div>
                </div>
                <span className="set-row-s" style={{ fontStyle: "italic" }}>{zoom.connected ? "Account-level" : "Admin setup"}</span>
              </div>
              {/* Slack — deal-won alerts (account-level Incoming Webhook) */}
              <div className="set-row">
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <BrandLogo name="slack" label="Slack" />
                  <div>
                    <div className="set-row-t">Slack {slack.configured
                      ? <span className="st go" style={{ marginLeft: 6 }}><span className="d" />Active</span>
                      : <span className="st bad" style={{ marginLeft: 6 }}><span className="d" />Not configured</span>}</div>
                    <div className="set-row-s">{slack.configured ? `Deal-won alerts post to ${slack.channel ?? "your Slack channel"}` : "Needs a Slack Incoming Webhook URL (admin env setup)"}</div>
                  </div>
                </div>
                {slack.configured
                  ? <a className="itg-cta" href="/api/integrations/slack/test" target="_blank" rel="noopener noreferrer">Send test</a>
                  : <span className="set-row-s" style={{ fontStyle: "italic" }}>Admin setup</span>}
              </div>
              {/* WhatsApp Business — client comms (account-level Cloud API) */}
              <div className="set-row">
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <BrandLogo name="whatsapp" label="WhatsApp" />
                  <div>
                    <div className="set-row-t">WhatsApp Business {whatsapp.configured
                      ? <span className="st go" style={{ marginLeft: 6 }}><span className="d" />Active</span>
                      : <span className="st bad" style={{ marginLeft: 6 }}><span className="d" />Not configured</span>}</div>
                    <div className="set-row-s">{whatsapp.configured ? "Send & receive WhatsApp from a contact's timeline — auto-logged" : "Needs Meta Cloud API credentials (admin env setup)"}</div>
                  </div>
                </div>
                <span className="set-row-s" style={{ fontStyle: "italic" }}>{whatsapp.configured ? "Account-level" : "Admin setup"}</span>
              </div>
              {/* Fireflies — coming soon */}
              <div className="set-row">
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <BrandLogo name="fireflies" label="Fireflies" />
                  <div><div className="set-row-t">Fireflies</div><div className="set-row-s">Call recordings & AI notes</div></div>
                </div>
                <button className="itg-cta" onClick={() => showToast("Fireflies integration — coming soon")}>Connect</button>
              </div>

              {isAdmin && (
                <>
                  <div className="set-row-s" style={{ marginTop: 14, fontWeight: 700, color: "var(--text)" }}>Data migration</div>
                  <HubspotMigration />
                </>
              )}
            </div>
          )}
          {tab === "Appearance" && (
            <div className="set-list">
              <PrefToggle pref="celebrations" label="Celebrations & confetti" sub="Hype animations on wins" />
              <PrefToggle pref="reduceMotion" label="Reduced motion" sub="Minimise animations" />
              <PrefToggle pref="compact" label="Compact density" sub="Tighter rows & spacing" />
              <PrefToggle pref="grain" label="Grain texture" sub="Screen-print overlay" />
              <div className="set-row-s" style={{ marginTop: 6 }}>Accent</div>
              <div style={{ display: "flex", gap: 10 }}>
                <span style={{ width: 28, height: 28, borderRadius: 8, background: "var(--neon)", border: "2px solid var(--text)" }} />
                <span style={{ width: 28, height: 28, borderRadius: 8, background: "var(--violet)" }} />
              </div>
            </div>
          )}
          {tab === "Team" && (
            <table>
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th></tr></thead>
              <tbody>{team.map((u) => <tr className="row" key={u.email}><td style={{ fontWeight: 600 }}>{u.name}</td><td>{u.email}</td><td>{u.role}</td><td><span className={`st ${u.active ? "go" : "bad"}`}><span className="d" />{u.active ? "Active" : "Disabled"}</span></td></tr>)}</tbody>
            </table>
          )}
        </div>
      </motion.section>
    </div>
  );
}
