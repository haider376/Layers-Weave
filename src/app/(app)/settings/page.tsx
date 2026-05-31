import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ROLE_LABEL, type Role } from "@/lib/permissions";
import Topbar from "@/components/Topbar";
import SettingsView from "./SettingsView";
import { getSalesGoals, AE_FIRST } from "@/lib/goals";

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

  // AE roster (ordered to match the canonical list) for the goals editor.
  const aes = user.isAdmin
    ? AE_FIRST.map((first) => {
        const u = allUsers.find((x) => x.name.split(" ")[0].toLowerCase() === first);
        return { first, name: u?.name ?? first.charAt(0).toUpperCase() + first.slice(1) };
      })
    : [];
  const goals = await getSalesGoals();

  return (
    <>
      <Topbar title="Settings" sub="Profile, goals, notifications, integrations & team" />
      <SettingsView
        me={{ name: user.name, email: user.email, role: ROLE_LABEL[user.role as Role] ?? user.role }}
        isAdmin={user.isAdmin}
        team={team}
        goals={goals}
        aes={aes}
      />
    </>
  );
}
