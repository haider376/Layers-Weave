"use client";

import { useEffect, useState } from "react";

// A number input that doesn't trap a leading 0. The field may be left empty
// while editing (so you can clear it and type a fresh value); the committed
// numeric value is reported via onValueChange, defaulting to `empty` (0) when
// blank. Mirrors external value changes too.
export default function NumberInput({
  value,
  onValueChange,
  min,
  max,
  step,
  empty = 0,
  className = "ui-input",
  placeholder,
  prefix,
  disabled,
}: {
  value: number;
  onValueChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  empty?: number;
  className?: string;
  placeholder?: string;
  prefix?: string;
  disabled?: boolean;
}) {
  const [text, setText] = useState(String(value));

  // Keep the field in sync when the external value changes (e.g. reset),
  // but don't fight the user while they're mid-edit on an equal value.
  useEffect(() => {
    setText((t) => (t.trim() === "" ? t : Number(t) === value ? t : String(value)));
  }, [value]);

  function commit(raw: string) {
    if (raw.trim() === "") { onValueChange(empty); return; }
    let n = Number(raw);
    if (Number.isNaN(n)) n = empty;
    if (min !== undefined) n = Math.max(min, n);
    if (max !== undefined) n = Math.min(max, n);
    onValueChange(n);
    setText(String(n));
  }

  const input = (
    <input
      className={prefix ? undefined : className}
      type="number"
      inputMode="decimal"
      min={min}
      max={max}
      step={step}
      value={text}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(e) => {
        const raw = e.target.value;
        setText(raw);
        if (raw.trim() !== "") commit(raw); // live-update while typing
      }}
      onBlur={(e) => commit(e.target.value)}
      onFocus={(e) => e.target.select()}
    />
  );

  if (!prefix) return input;
  return <div className={`ni-wrap ${className === "ui-input" ? "" : className}`}><span className="ni-pre">{prefix}</span>{input}</div>;
}
