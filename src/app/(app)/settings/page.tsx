import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ROLE_LABEL, type Role } from "@/lib/permissions";
import Topbar from "@/components/Topbar";
import SettingsView from "./SettingsView";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const team = user.isAdmin
    ? (await prisma.user.findMany({ orderBy: { name: "asc" } })).map((u) => ({ name: u.name, email: u.email, role: ROLE_LABEL[u.role as Role] ?? u.role, active: u.active }))
    : [];

  return (
    <>
      <Topbar title="Settings" sub="Profile, notifications, integrations & team" />
      <SettingsView
        me={{ name: user.name, email: user.email, role: ROLE_LABEL[user.role as Role] ?? user.role }}
        isAdmin={user.isAdmin}
        team={team}
      />
    </>
  );
}
