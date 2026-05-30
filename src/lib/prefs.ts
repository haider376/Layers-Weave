"use client";

export type Prefs = { celebrations: boolean; reduceMotion: boolean; compact: boolean; grain: boolean };
const DEFAULTS: Prefs = { celebrations: true, reduceMotion: false, compact: false, grain: true };
const KEY = "lw-prefs";

export function getPrefs(): Prefs {
  if (typeof window === "undefined") return DEFAULTS;
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { return DEFAULTS; }
}

export function applyPrefs(p: Prefs) {
  if (typeof document === "undefined") return;
  const el = document.documentElement;
  el.classList.toggle("reduce-motion", p.reduceMotion);
  el.classList.toggle("compact", p.compact);
  el.classList.toggle("no-grain", !p.grain);
}

export function setPref<K extends keyof Prefs>(key: K, value: Prefs[K]) {
  const next = { ...getPrefs(), [key]: value };
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
  applyPrefs(next);
  return next;
}
