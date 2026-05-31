import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import Topbar from "@/components/Topbar";
import SequencesView from "./SequencesView";

export default async function SequencesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return (
    <>
      <Topbar title="Sequences" sub="Multi-step outreach cadences — build, time & track your playbooks" />
      <SequencesView />
    </>
  );
}
