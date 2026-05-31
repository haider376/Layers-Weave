import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import Topbar from "@/components/Topbar";
import WeightCalc from "./WeightCalc";

export default async function WeightPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return (
    <>
      <Topbar title="Weight Calculator" sub="Estimate shipped weight per item & per order — high-side for safe quoting" />
      <WeightCalc />
    </>
  );
}
