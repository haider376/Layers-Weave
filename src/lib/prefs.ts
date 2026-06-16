"use client";

export type Theme = "dark" | "light";
export type Prefs = { celebrations: boolean; reduceMotion: boolean; compact: boolean; grain: boolean; theme: Theme };
const DEFAULTS: Prefs = { celebrations: true, reduceMotion: false, compact: false, grain: true, theme: "dark" };
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
  el.setAttribute("data-theme", p.theme === "light" ? "light" : "dark");
}

export function setPref<K extends keyof Prefs>(key: K, value: Prefs[K]) {
  const next = { ...getPrefs(), [key]: value };
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
  applyPrefs(next);
  return next;
}

export function toggleTheme(): Theme {
  const next: Theme = getPrefs().theme === "light" ? "dark" : "light";
  setPref("theme", next);
  return next;
}
