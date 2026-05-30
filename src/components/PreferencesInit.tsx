"use client";

import { useEffect } from "react";
import { applyPrefs, getPrefs } from "@/lib/prefs";

// Applies persisted appearance preferences (compact / grain / reduced motion) on load.
export default function PreferencesInit() {
  useEffect(() => { applyPrefs(getPrefs()); }, []);
  return null;
}
