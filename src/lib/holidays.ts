// Public holidays for the calendar's Holiday layers (US + Pakistan).
// Fixed-date national holidays are exact; Islamic holidays move each year and
// are marked "(tentative)" like Google does. Covers 2025–2026.

export type Holiday = { date: string; name: string; country: "US" | "PK" };

export const HOLIDAYS: Holiday[] = [
  // ── United States 2025 ──
  { date: "2025-01-01", name: "New Year's Day", country: "US" },
  { date: "2025-01-20", name: "Martin Luther King Jr. Day", country: "US" },
  { date: "2025-02-17", name: "Presidents' Day", country: "US" },
  { date: "2025-05-26", name: "Memorial Day", country: "US" },
  { date: "2025-06-19", name: "Juneteenth", country: "US" },
  { date: "2025-07-04", name: "Independence Day", country: "US" },
  { date: "2025-09-01", name: "Labor Day", country: "US" },
  { date: "2025-10-13", name: "Columbus Day", country: "US" },
  { date: "2025-11-11", name: "Veterans Day", country: "US" },
  { date: "2025-11-27", name: "Thanksgiving", country: "US" },
  { date: "2025-12-25", name: "Christmas Day", country: "US" },
  // ── United States 2026 ──
  { date: "2026-01-01", name: "New Year's Day", country: "US" },
  { date: "2026-01-19", name: "Martin Luther King Jr. Day", country: "US" },
  { date: "2026-02-16", name: "Presidents' Day", country: "US" },
  { date: "2026-05-25", name: "Memorial Day", country: "US" },
  { date: "2026-06-19", name: "Juneteenth", country: "US" },
  { date: "2026-07-03", name: "Independence Day (observed)", country: "US" },
  { date: "2026-09-07", name: "Labor Day", country: "US" },
  { date: "2026-10-12", name: "Columbus Day", country: "US" },
  { date: "2026-11-11", name: "Veterans Day", country: "US" },
  { date: "2026-11-26", name: "Thanksgiving", country: "US" },
  { date: "2026-12-25", name: "Christmas Day", country: "US" },

  // ── Pakistan 2025 (fixed national) ──
  { date: "2025-02-05", name: "Kashmir Day", country: "PK" },
  { date: "2025-03-23", name: "Pakistan Day", country: "PK" },
  { date: "2025-05-01", name: "Labour Day", country: "PK" },
  { date: "2025-08-14", name: "Independence Day", country: "PK" },
  { date: "2025-11-09", name: "Iqbal Day", country: "PK" },
  { date: "2025-12-25", name: "Quaid-e-Azam Day", country: "PK" },
  // Pakistan 2025 (Islamic — tentative, moon-sighting dependent)
  { date: "2025-03-31", name: "Eid-ul-Fitr (tentative)", country: "PK" },
  { date: "2025-04-01", name: "Eid-ul-Fitr Holiday (tentative)", country: "PK" },
  { date: "2025-06-07", name: "Eid-ul-Adha (tentative)", country: "PK" },
  { date: "2025-06-08", name: "Eid-ul-Adha Holiday (tentative)", country: "PK" },
  { date: "2025-07-06", name: "Ashura (tentative)", country: "PK" },
  { date: "2025-09-05", name: "Eid Milad-un-Nabi (tentative)", country: "PK" },
  // ── Pakistan 2026 (fixed national) ──
  { date: "2026-02-05", name: "Kashmir Day", country: "PK" },
  { date: "2026-03-23", name: "Pakistan Day", country: "PK" },
  { date: "2026-05-01", name: "Labour Day", country: "PK" },
  { date: "2026-08-14", name: "Independence Day", country: "PK" },
  { date: "2026-11-09", name: "Iqbal Day", country: "PK" },
  { date: "2026-12-25", name: "Quaid-e-Azam Day", country: "PK" },
  // Pakistan 2026 (Islamic — tentative)
  { date: "2026-03-20", name: "Eid-ul-Fitr (tentative)", country: "PK" },
  { date: "2026-05-27", name: "Eid-ul-Adha (tentative)", country: "PK" },
  { date: "2026-06-26", name: "Ashura (tentative)", country: "PK" },
  { date: "2026-08-25", name: "Eid Milad-un-Nabi (tentative)", country: "PK" },
];

// Holidays whose date falls within [from, to].
export function holidaysInWindow(from: Date, to: Date): Holiday[] {
  const f = from.getTime(), t = to.getTime();
  return HOLIDAYS.filter((h) => {
    const d = new Date(`${h.date}T00:00:00`).getTime();
    return d >= f && d <= t;
  });
}
