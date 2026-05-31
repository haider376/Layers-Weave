"use client";

import * as RS from "@radix-ui/react-select";

export type Opt = { value: string; label: string; badge?: string };

// Brand-styled, animated select — replaces native <select> everywhere.
// Animation is CSS-driven (on [data-state]) so it never conflicts with Radix's
// popper positioning (which is what made menus fly in from the top-left).
export default function Select({
  value, onValueChange, options, placeholder = "Select…", className = "", disabled, size = "md",
}: {
  value: string;
  onValueChange: (v: string) => void;
  options: (Opt | string)[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  size?: "sm" | "md";
}) {
  const EMPTY = "__none__";
  const opts: Opt[] = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  const toRadix = (v: string) => (v === "" ? EMPTY : v);
  const fromRadix = (v: string) => (v === EMPTY ? "" : v);
  return (
    <RS.Root value={toRadix(value)} onValueChange={(v) => onValueChange(fromRadix(v))} disabled={disabled}>
      <RS.Trigger className={`ui-select ui-select-${size} ${className}`} aria-label={placeholder}>
        <RS.Value placeholder={placeholder} />
        <RS.Icon className="ui-select-ico">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
        </RS.Icon>
      </RS.Trigger>
      <RS.Portal>
        <RS.Content position="popper" sideOffset={6} collisionPadding={10} className="ui-select-content">
          <RS.Viewport className="ui-select-vp">
            {opts.map((o) => (
              <RS.Item key={o.value || EMPTY} value={toRadix(o.value)} className="ui-select-item">
                <RS.ItemText>{o.badge ? <span className={`badge badge-${o.badge}`}>{o.label}</span> : o.label}</RS.ItemText>
                <RS.ItemIndicator className="ui-select-check">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                </RS.ItemIndicator>
              </RS.Item>
            ))}
          </RS.Viewport>
        </RS.Content>
      </RS.Portal>
    </RS.Root>
  );
}
