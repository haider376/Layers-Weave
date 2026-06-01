import { redirect } from "next/navigation";
import { prisma, safe } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ROLE_LABEL, type Role } from "@/lib/permissions";
import Topbar from "@/components/Topbar";
import SettingsView from "./SettingsView";
import { getSalesGoals, ROSTER } from "@/lib/goals";
import { getPermissionMatrix, getAppConfig } from "@/lib/appConfig";
import { getConnection, googleConfigured } from "@/lib/google";
import { zoomGetConnection, zoomConfigured } from "@/lib/zoom";

// Always render fresh — integration connection state must not be cached.
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Team section is locked to the 10 authorized internal members (first names).
  const ALLOWED = ["shahzaib", "haider", "zikriya", "adan", "rija", "kamila", "asjad", "fatima", "huzaifa", "hilmand"];
  const allUsers = user.isAdmin ? await prisma.user.findMany({ orderBy: { name: "asc" } }) : [];
  const team = user.isAdmin
    ? allUsers
        .filter((u) => ALLOWED.includes(u.name.split(" ")[0].toLowerCase()))
        .map((u) => ({ name: u.name, email: u.email, role: ROLE_LABEL[u.role as Role] ?? u.role, active: u.active }))
    : [];

  // Full sales roster (AEs + BDRs) ordered canonically for the goals editor.
  const reps = user.isAdmin
    ? ROSTER.map(({ first, kind }) => {
        const u = allUsers.find((x) => x.name.split(" ")[0].toLowerCase() === first);
        return { first, kind, name: u?.name ?? first.charAt(0).toUpperCase() + first.slice(1) };
      })
    : [];
  const [goals, permissions, config, gconn, zconn] = await Promise.all([
    getSalesGoals(), getPermissionMatrix(), getAppConfig(),
    safe(getConnection(user.id), { connected: false, accountEmail: null }),
    safe(zoomGetConnection(user.id), { connected: false, accountEmail: null }),
  ]);

  return (
    <>
      <Topbar title="Settings" sub="Profile, goals, permissions, workspace & team" />
      <SettingsView
        me={{ name: user.name, email: user.email, role: ROLE_LABEL[user.role as Role] ?? user.role }}
        isAdmin={user.isAdmin}
        team={team}
        goals={goals}
        reps={reps}
        permissions={permissions}
        config={config}
        google={{ connected: gconn.connected, email: gconn.accountEmail, configured: googleConfigured() }}
        zoom={{ connected: zconn.connected, email: zconn.accountEmail, configured: zoomConfigured() }}
      />
    </>
  );
}
