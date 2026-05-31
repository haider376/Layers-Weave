"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/components/Toast";
import { createCadenceAction } from "@/app/actions/cadences";

// Create-cadence control. Uses the plain (non-redirecting) action so we can
// surface errors and a pending state, then navigates client-side on success.
export default function CreateCadenceButton() {
  const router = useRouter();
  const [pending, start] = useTransition();

  function create() {
    start(async () => {
      try {
        const r = await createCadenceAction({ name: "Untitled cadence" });
        showToast("Cadence created");
        router.push(`/cadences/${r.id}`);
        router.refresh();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Couldn't create cadence";
        showToast(msg === "FORBIDDEN" ? "You don't have permission" : "Couldn't create cadence — please retry");
      }
    });
  }

  return (
    <button type="button" className="btn primary" style={{ flex: "none", padding: "8px 16px" }} disabled={pending} onClick={create}>
      {pending ? "Creating…" : "+ Create cadence"}
    </button>
  );
}
