"use client";

import * as Popover from "@radix-ui/react-popover";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/components/Toast";
import { createCadenceAction } from "@/app/actions/cadences";
import { CADENCE_TEMPLATES } from "@/lib/cadences";

// Create-cadence control with a template picker: a blank cadence, or one of the
// ready-made playbooks (call blitz / call+email / call+email+VM).
export default function CreateCadenceButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);

  function blank() {
    start(async () => {
      try {
        const r = await createCadenceAction({ name: "Untitled cadence" });
        showToast("Cadence created");
        setOpen(false);
        router.push(`/cadences/${r.id}`);
        router.refresh();
      } catch {
        showToast("Couldn't create cadence — please retry");
      }
    });
  }

  function fromTemplate(id: string) {
    const tpl = CADENCE_TEMPLATES.find((t) => t.id === id);
    if (!tpl) return;
    start(async () => {
      try {
        // reuse the plain create action with the template's steps, then navigate
        const r = await createCadenceAction({ name: tpl.name, function: tpl.function, priority: tpl.priority, steps: tpl.steps });
        showToast(`Created “${tpl.name}”`);
        setOpen(false);
        router.push(`/cadences/${r.id}`);
        router.refresh();
      } catch {
        showToast("Couldn't create cadence — please retry");
      }
    });
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button type="button" className="btn primary" style={{ flex: "none", padding: "8px 16px" }} disabled={pending}>
          {pending ? "Creating…" : "+ Create cadence"}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="fbar-pop cadtpl-pop" sideOffset={8} align="end">
          <div className="ui-select-anim">
            <button className="cadtpl cadtpl-blank" onClick={blank} disabled={pending}>
              <span className="cadtpl-n">Blank cadence</span>
              <span className="cadtpl-b">Start from scratch</span>
            </button>
            <div className="cadtpl-h">Templates</div>
            {CADENCE_TEMPLATES.map((t) => (
              <button key={t.id} className="cadtpl" onClick={() => fromTemplate(t.id)} disabled={pending}>
                <span className="cadtpl-n">{t.name}</span>
                <span className="cadtpl-b">{t.blurb} · {t.steps.length} steps</span>
              </button>
            ))}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
