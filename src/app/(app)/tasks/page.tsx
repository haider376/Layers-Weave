import { redirect } from "next/navigation";
import { prisma, safe } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccessSales } from "@/lib/permissions";
import Topbar from "@/components/Topbar";
import TaskList, { type TaskRow } from "./TaskList";

export default async function TasksPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canAccessSales(user.role)) redirect("/dashboard");

  const tasks = await safe(prisma.task.findMany({ orderBy: [{ done: "asc" }, { dueDate: "asc" }], take: 200 }), []);
  const companyIds = [...new Set(tasks.map((t) => t.companyId).filter(Boolean) as string[])];
  const companies = companyIds.length ? await prisma.company.findMany({ where: { id: { in: companyIds } } }) : [];
  const cmap = Object.fromEntries(companies.map((c) => [c.id, c.name]));

  const rows: TaskRow[] = tasks.map((t) => ({
    id: t.id, title: t.title, type: t.type, priority: t.priority, done: t.done,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    company: t.companyId ? cmap[t.companyId] ?? null : null,
    dealId: t.dealId,
  }));

  return (
    <>
      <Topbar title="Tasks" sub="Your to-dos, calls and follow-ups — knock them out" />
      <TaskList tasks={rows} />
    </>
  );
}
