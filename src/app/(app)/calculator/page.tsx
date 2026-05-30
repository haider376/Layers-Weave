import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { canSeeMargin } from "@/lib/permissions";
import { randomQuoteIdSync } from "@/lib/quoteId";
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
      <Topbar title="Price Calculator" sub="Price a quote with protected margin" />
      <Calculator
        quoteId={quote ?? randomQuoteIdSync()}
        canMargin={canSeeMargin(user.role)}
      />
    </>
  );
}
