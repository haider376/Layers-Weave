"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/components/Toast";
import Avatar from "@/components/Avatar";
import Select from "@/components/ui/Select";
import {
  adminCreateUserAction, adminUpdateUserAction, adminSetPasswordAction,
  adminSetAvatarAction, adminSetActiveAction, adminDeleteUserAction,
} from "@/app/actions/admin-users";

export type TeamUser = {
  id: string; name: string; email: string; role: string; roleLabel: string;
  title: string; phone: string | null; avatarUrl: string | null; active: boolean;
  managedPassword: string | null;
};

function roleOptions(roles: string[]) {
  return roles.map((r) => ({ value: r, label: r }));
}

export default function TeamManager({ users, roles, myId }: { users: TeamUser[]; roles: string[]; myId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState<string | null>(null);
  const [showPw, setShowPw] = useState<Record<string, boolean>>({});
  const [adding, setAdding] = useState(false);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  function run(fn: () => Promise<unknown>, ok: string) {
    start(async () => {
      try { await fn(); showToast(ok); setEditing(null); router.refresh(); }
      catch (e) { showToast(e instanceof Error ? e.message : "Action failed"); }
    });
  }

  function onPhoto(userId: string, e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = () => run(() => adminSetAvatarAction(userId, String(reader.result)), "Photo updated");
    reader.readAsDataURL(f);
    e.target.value = "";
  }

  return (
    <div className="tm">
      <div className="tm-head">
        <div>
          <div className="set-row-t">Team members</div>
          <div className="set-row-s">Add, edit or remove users · set roles, photos & passwords</div>
        </div>
        <button className="btn primary" style={{ flex: "none", padding: "9px 16px" }} onClick={() => setAdding((a) => !a)}>
          {adding ? "Close" : "+ Add user"}
        </button>
      </div>

      {adding && <AddUser roles={roles} pending={pending} onCreate={(data) => run(() => adminCreateUserAction(data), "User added")} />}

      <div className="tm-list">
        {users.map((u) => (
          <div className={`tm-row${u.active ? "" : " off"}`} key={u.id}>
            {editing === u.id ? (
              <EditUser u={u} roles={roles} pending={pending}
                onSave={(data) => run(() => adminUpdateUserAction(u.id, data), "User updated")}
                onCancel={() => setEditing(null)} />
            ) : (
              <>
                <button className="tm-ava" onClick={() => fileRefs.current[u.id]?.click()} title="Change photo">
                  <Avatar name={u.name} avatarUrl={u.avatarUrl} className="lb-av" />
                  <span className="tm-ava-cam">✎</span>
                </button>
                <input ref={(el) => { fileRefs.current[u.id] = el; }} type="file" accept="image/*" hidden onChange={(e) => onPhoto(u.id, e)} />
                <div className="tm-id">
                  <div className="tm-nm">{u.name}{!u.active && <span className="tm-badge">disabled</span>}</div>
                  <div className="tm-sub">{u.email}{u.phone ? ` · ${u.phone}` : ""}</div>
                </div>
                <div className="tm-role">{u.roleLabel}</div>
                <div className="tm-pw">
                  <span className="tm-pw-val">{showPw[u.id] ? (u.managedPassword ?? "— (changed by user)") : "••••••••"}</span>
                  <button className="tm-pw-eye" onClick={() => setShowPw((s) => ({ ...s, [u.id]: !s[u.id] }))} title={showPw[u.id] ? "Hide" : "Show password"}>{showPw[u.id] ? "🙈" : "👁"}</button>
                </div>
                <div className="tm-actions">
                  <button className="tm-btn" disabled={pending} onClick={() => setEditing(u.id)}>Edit</button>
                  <button className="tm-btn" disabled={pending} onClick={() => {
                    const p = window.prompt(`Set a new password for ${u.name}:`);
                    if (p) run(() => adminSetPasswordAction(u.id, p), "Password reset");
                  }}>Reset PW</button>
                  {u.id !== myId && (
                    <button className={`tm-btn${u.active ? " danger" : ""}`} disabled={pending}
                      onClick={() => run(() => adminSetActiveAction(u.id, !u.active), u.active ? "User deactivated" : "User reactivated")}>
                      {u.active ? "Deactivate" : "Reactivate"}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      <p className="set-row-s" style={{ marginTop: 10, fontSize: 11 }}>
        “Reset PW” and the visible password are admin-only. Deactivating keeps a member’s history; use it instead of deleting reps who own accounts.
      </p>
    </div>
  );
}

function AddUser({ roles, pending, onCreate }: { roles: string[]; pending: boolean; onCreate: (d: { name: string; email: string; role: string; phone: string; password: string; title: string }) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState(roles.find((r) => r === "AE") ?? roles[0]);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  return (
    <div className="tm-add">
      <div className="tm-add-grid">
        <label className="tm-f"><span>Name</span><input className="dg-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" /></label>
        <label className="tm-f"><span>Email</span><input className="dg-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@layerswholesale.co" /></label>
        <label className="tm-f"><span>Role</span><Select value={role} options={roleOptions(roles)} onValueChange={setRole} /></label>
        <label className="tm-f"><span>Phone</span><input className="dg-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+44 …" /></label>
        <label className="tm-f"><span>Password</span><input className="dg-input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="min 6 chars" /></label>
      </div>
      <button className="btn primary" style={{ flex: "none", padding: "9px 16px", marginTop: 4 }} disabled={pending || !name.trim() || !email.trim() || password.length < 6}
        onClick={() => onCreate({ name, email, role, phone, password, title: role })}>Create user</button>
    </div>
  );
}

function EditUser({ u, roles, pending, onSave, onCancel }: { u: TeamUser; roles: string[]; pending: boolean; onSave: (d: { name: string; email: string; role: string; phone: string; title: string }) => void; onCancel: () => void }) {
  const [name, setName] = useState(u.name);
  const [email, setEmail] = useState(u.email);
  const [role, setRole] = useState(u.role);
  const [phone, setPhone] = useState(u.phone ?? "");
  const [title, setTitle] = useState(u.title);
  return (
    <div className="tm-add" style={{ width: "100%" }}>
      <div className="tm-add-grid">
        <label className="tm-f"><span>Name</span><input className="dg-input" value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label className="tm-f"><span>Email</span><input className="dg-input" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label className="tm-f"><span>Role</span><Select value={role} options={roleOptions(roles)} onValueChange={setRole} /></label>
        <label className="tm-f"><span>Phone</span><input className="dg-input" value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
        <label className="tm-f"><span>Job title</span><input className="dg-input" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <button className="btn primary" style={{ flex: "none", padding: "9px 16px" }} disabled={pending} onClick={() => onSave({ name, email, role, phone, title })}>Save</button>
        <button className="btn ghost" style={{ flex: "none", padding: "9px 16px" }} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
