"use client";

import PunkMark, { type PunkName } from "@/components/PunkMark";

// Floating punk marks scattered behind the sign-in card. Each drifts gently
// and pops in on load — gives the page life without distracting from the form.
type Spot = { name: PunkName; top?: string; left?: string; right?: string; bottom?: string; size: number; delay: number; dur: number; rot: number; op: number };

const SPOTS: Spot[] = [
  { name: "globe", top: "8%", left: "8%", size: 96, delay: 0.05, dur: 7, rot: -8, op: 0.9 },
  { name: "star", top: "16%", right: "12%", size: 64, delay: 0.25, dur: 6, rot: 10, op: 0.85 },
  { name: "bolt", bottom: "16%", left: "12%", size: 72, delay: 0.4, dur: 6.5, rot: -12, op: 0.85 },
  { name: "rocket", bottom: "10%", right: "10%", size: 88, delay: 0.15, dur: 7.5, rot: 12, op: 0.9 },
  { name: "smiley", top: "44%", left: "4%", size: 56, delay: 0.55, dur: 8, rot: 6, op: 0.7 },
  { name: "trophy", top: "40%", right: "5%", size: 58, delay: 0.6, dur: 7, rot: -6, op: 0.7 },
  { name: "heart", top: "70%", left: "30%", size: 44, delay: 0.7, dur: 9, rot: -10, op: 0.55 },
  { name: "diamond", top: "24%", left: "32%", size: 42, delay: 0.5, dur: 8.5, rot: 8, op: 0.5 },
  { name: "arrow", top: "60%", right: "28%", size: 50, delay: 0.45, dur: 7.8, rot: 5, op: 0.6 },
];

export default function LoginDecor() {
  return (
    <div className="login-decor" aria-hidden="true">
      {SPOTS.map((s, i) => (
        <span
          key={i}
          className="ldecor"
          style={{
            top: s.top, left: s.left, right: s.right, bottom: s.bottom,
            // pop-in delay + per-item float duration & rotation seed
            ["--d" as string]: `${s.delay}s`,
            ["--dur" as string]: `${s.dur}s`,
            ["--rot" as string]: `${s.rot}deg`,
            ["--op" as string]: s.op,
          }}
        >
          <PunkMark name={s.name} size={s.size} anim="float" />
        </span>
      ))}
    </div>
  );
}
