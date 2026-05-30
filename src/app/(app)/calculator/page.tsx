import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { canSeeMargin } from "@/lib/permissions";
import Topbar from "@/components/Topbar";
import Calculator from "./Calculator";

export default async function CalculatorPage({
  searchParams,
}: {
  searchParams: Promise<{ quote?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { quote } = await searchParams;

  return (
    <>
      <Topbar title="Price Calculator" sub="General pricing with protected margin — optionally attach to a quote" />
      <Calculator quoteId={quote ?? null} canMargin={canSeeMargin(user.role)} />
    </>
  );
}
