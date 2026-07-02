// Shared status palette — brand purple + lime, with distinct supporting hues so
// every status reads at a glance across analytics, pipeline, leads & coaching.
// Lime = good/won, purple = in-motion, blue = new, cyan = engaged, amber =
// caution/waiting, red = lost/blocked, grey = dead.

export const BRAND = {
  lime: "#C6F542",
  limeDeep: "#A9DF1E",
  purple: "#8B5CF6",
  purpleBright: "#A855F7",
  blue: "#3B82F6",
  cyan: "#22D3EE",
  amber: "#E0B23C",
  orange: "#F59E0B",
  red: "#F0594F",
  grey: "#646469",
  slate: "#8A8A90",
};

// Deal pipeline stages
export const STAGE_COLORS: Record<string, string> = {
  "Appointment Scheduled": BRAND.blue,
  "Showed up": BRAND.cyan,
  "No Show / Reschedule": BRAND.amber,
  Initiation: BRAND.purple,
  "Closed Won": BRAND.lime,
  "Closed Lost": BRAND.red,
  Disqualified: BRAND.grey,
};

// Lead / account status
export const LEAD_COLORS: Record<string, string> = {
  New: BRAND.blue,
  "In Progress": BRAND.purple,
  "Open Deal": BRAND.lime,
  "Re-target": BRAND.purple,
  "Cool Off": BRAND.cyan,
  "Data Quality": BRAND.amber,
  "Do Not Contact": BRAND.red,
};

// Call dispositions / outcomes
export const OUTCOME_COLORS: Record<string, string> = {
  "SQL Booked": BRAND.lime,
  "Meeting Booked": BRAND.limeDeep,
  "Interested / Follow up": BRAND.limeDeep,
  Connected: BRAND.lime,
  "Call Back Later": BRAND.amber,
  "Left Voicemail": BRAND.purple,
  "Left voicemail": BRAND.purple,
  "No Answer": BRAND.grey,
  "No answer": BRAND.grey,
  Busy: BRAND.amber,
  "Stopped at Gatekeeper": BRAND.cyan,
  "Not Interested": BRAND.orange,
  "Wrong Number": BRAND.red,
  "Wrong number": BRAND.red,
};

// Win / loss outcome buckets
export const WINLOSS_COLORS: Record<string, string> = {
  Won: BRAND.lime,
  Open: BRAND.purple,
  Lost: BRAND.red,
  Disqualified: BRAND.grey,
};

// Tier ramp (A best → C)
export const TIER_COLORS = [BRAND.lime, BRAND.purple, BRAND.cyan, BRAND.amber];

// Distinct categorical ramp for per-owner / misc series.
export const SERIES = [BRAND.lime, BRAND.purple, BRAND.blue, BRAND.cyan, BRAND.amber, BRAND.purpleBright, BRAND.orange, BRAND.slate];

export const colorFor = (map: Record<string, string>, key: string, fallback = BRAND.grey) => map[key] ?? fallback;
