// Stan przychodni w danej chwili – czyste funkcje, używane w przeglądarce i w testach (node --test).

/** "08:00" -> 480 */
export const toMin = (t) => {
  const [h, m] = String(t).split(":").map(Number);
  return h * 60 + m;
};

/** 480 -> "8:00" */
export const fromMin = (min) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, "0")}`;

/**
 * Tryb strony w danej minucie dnia:
 * - "before"  – przychodnia otwarta lub zaraz otwiera, rejestracja jeszcze nie odbiera,
 * - "open"    – rejestracja odbiera,
 * - "soon"    – rejestracja zamyka się za mniej niż `soon` minut,
 * - "clinic"  – rejestracja nie odbiera, ale lekarz jeszcze przyjmuje,
 * - "after"   – przychodnia zamknięta (noc, weekend, święto).
 * `h` = { reg: {from, to}, clinic: {from, to} } w minutach.
 */
export function clinicMode(minutes, workday, h, soon = 60) {
  if (!workday || minutes < h.clinic.from || minutes >= h.clinic.to) {
    // Rejestracja może zaczynać się przed otwarciem przychodni – wtedy liczy się rejestracja
    if (workday && minutes < h.clinic.from && minutes >= h.reg.from && minutes < h.reg.to) return "open";
    return "after";
  }
  if (minutes < h.reg.from) return "before";
  if (minutes < h.reg.to - soon) return "open";
  if (minutes < h.reg.to) return "soon";
  return "clinic";
}

/** Stan przedziału godzin (np. przyjęć lekarza) względem chwili: "now" | "later" | "done" | "off" */
export function rangeState(minutes, workday, from, to) {
  if (!workday) return "off";
  if (minutes < from) return "later";
  if (minutes < to) return "now";
  return "done";
}

/** Ile minionej części przedziału (0–1), np. do pierścienia postępu rejestracji */
export function progress(minutes, from, to) {
  if (to <= from) return 0;
  return Math.min(1, Math.max(0, (minutes - from) / (to - from)));
}

/** 200 -> "3 godz. 20 min", 45 -> "45 min", 120 -> "2 godz." */
export function formatDuration(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h && m) return `${h} godz. ${m} min`;
  if (h) return `${h} godz.`;
  return `${Math.max(1, m)} min`;
}
